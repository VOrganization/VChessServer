const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const crypto = require("crypto");

const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');
tf.setBackend('tensorflow');

const db = require("./db");
const chess = require("./chess");


let app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: 'application/*+json' }));
app.use(cors());

app.use((req, res, next) =>{
    console.log(Date.now() + ":Request " + req.ip + " " + req.method + " " + req.url)
    next();
})

app.get("/", (req, res) =>{
    res.send("VChessServer");
});

app.post("/upload", (req, res) =>{

    let reqData = req.body;
    if(reqData.type == "game" && reqData.data !== undefined){
        let data = JSON.parse(String(reqData.data).replace("\\", ""));

        let players = data.players;
        let SPlayers = JSON.stringify(players);
        let moves = data.moves;
        let SMoves = JSON.stringify(moves);
        let hash = crypto.createHash('md5').update(JSON.stringify(moves)).digest("hex");

        for (let i = 0; i < players.length; i++) {
            let p = players[i];
            p["quality"] = 0;
            p.points = 0;
            if(p.side == "black"){
                p["sideID"] = 0;
            }
            else{
                p["sideID"] = 1;
            }
            if(p.won){
                p.quality = 100;
            }
        }

        let points = 0;
        let prevBoard0 = chess.CloneChessBoard(chess.chessboard);
        let prevBoard1 = chess.CloneChessBoard(chess.chessboard);
        let trainData = [];
        for (let i = 0; i < moves.length; i++) {
            //Orginal Data
            {
                let out = {
                    input: chess.CalcInputChessBoard(prevBoard0, players[moves[i].player].sideID),
                    output: chess.CalcOutputChessBoard(moves[i]),
                    quality: players[moves[i].player].quality,
                    player: moves[i].player,
                    transpose: false
                }
    
                let enemy = Math.abs(prevBoard0[moves[i].y2][moves[i].x2]);
                prevBoard0[moves[i].y2][moves[i].x2] = prevBoard0[moves[i].y1][moves[i].x1];
                prevBoard0[moves[i].y1][moves[i].x1] = 0;
    
                let point = chess.CalcChessPoint(enemy);
                points += point;
                players[moves[i].player].points += point;
    
                trainData.push(out);
            }

            //Transpose Data
            {
                let side = players[moves[i].player].sideID == 1 ? 0 : 1;
                let m = chess.CalcTransposeOutputChessBoard(moves[i]);
                let out = {
                    input: chess.CalcInputChessBoard(prevBoard1, side),
                    output: m,
                    quality: players[moves[i].player].quality - 10,
                    player: moves[i].player,
                    transpose: true
                }

                prevBoard1[m[3]][m[2]] = prevBoard1[m[1]][m[0]];
                prevBoard1[m[1]][m[0]] = 0;
    
                trainData.push(out);
            }
        }


        for (let i = 0; i < players.length; i++) {
            let p = players[i];
            p.quality = p.quality * (p.points / points);
        }

        for (let i = 0; i < trainData.length; i++) {
            let t = trainData[i];
            t.quality = players[t.player].quality - (t.transpose == true ? 10 : 0);
            if(t.quality > 0){
                let d = JSON.stringify({
                    input: t.input,
                    output: t.output,
                });
                let hash = crypto.createHash('md5').update(d).digest("hex");
                // console.log(hash + "  Q: " + t.quality);
                db.Query("INSERT INTO `train` (`ID`, `Quality`, `Hash`, `Data`, `Date`) VALUES (NULL, '"+t.quality+"', '"+hash+"', '"+d+"', NOW())").catch(e => {
                    res.json(e);
                    res.end();
                });
            }
        }

        db.Query("INSERT INTO `games` (`ID`, `Hash`, `Players`, `Moves`, `Date`) VALUES(NULL, '"+hash+"', '"+SPlayers+"', '"+SMoves+"', NOW())").then(e => {
            res.json({
                status: 0,
                msg: "Success",
                response: "Success",
            });
            res.end();
        }).catch(e => {
            res.json(e);
            res.end();
        });

    }
    else{
        console.log("Error");
        res.json({
            status: -1,
            msg: "Error: invalid request",
            response: "invalid request",
        })
        res.end();
    }
});

app.get("/games", (req, res) =>{
    db.Query('SELECT * FROM `games` ORDER BY Date` DESC LIMIT 500').then((e) => {
        res.json({
            status: 0,
            games: e
        });
        res.end();
    }).catch((e) => {
        res.json(e);
        res.end();
    });
});

app.get("/model", (req, res) => {
    db.Query('SELECT * FROM `models` ORDER BY `models`.`Cost` ASC').then((e) => {
        e[0]["status"] = 0;
        res.json(e[0]);
        res.end();
    }).catch((e) => {
        res.json(e);
        res.end();
    });
});

app.get("/trainData", (req, res) => {
    db.Query('SELECT * FROM `train` ORDER BY `Quality` DESC, `Date` DESC LIMIT 500').then((e) => {
        res.json(e);
        res.end();
    }).catch((e) => {
        res.json(e);
        res.end();
    });
});

async function trainModel(){
    return new Promise((reslove, reject) => {
        db.Query('SELECT * FROM `models` ORDER BY `models`.`Cost` ASC LIMIT 3').then((models) => {
            if(models[0]){

                tf.loadModel('file://models/model.json').then((model) => {
                    
                    db.Query('SELECT * FROM `train` ORDER BY `Quality` DESC, `Date` DESC LIMIT 1000').then((train) => {
                        let inputs = new Array();
                        let outputs = new Array();

                        for (let i = 0; i < train.length; i++) {
                            let d = JSON.parse(train[i].Data);
                            inputs.push(d.input)
                            outputs.push(d.output)
                        }  

                        const xs = new tf.tensor2d(inputs);
                        const ys = new tf.tensor2d(outputs);

                        console.log("Before FIT")

                        model.fit(xs, ys, {
                            epochs: 10,
                        }).then((e) => {
                            console.log("Afetrt FIT");
                            //console.log(e.history.loss[0]);
                            console.log(e);
                            //reslove();

                        }).catch((e) => {
                            reject({
                                status: -1,
                                msg: "Error: Somthing Go Wrong While Traning",
                                response: e
                            });    
                        });


                    }).catch((e) => {
                        reject({
                            status: -1,
                            msg: "Error: Cannot Load Training Data",
                            response: e
                        });
                    });

                    reslove();
                }).catch((e) => {
                    reject({
                        status: -1,
                        msg: "Error: Cannot Load The Model",
                        response: e
                    });
                });
            }
            else{
                const model = tf.sequential({
                    name: "VChess",
                    layers: [
                        tf.layers.dense({
                            units: 32,
                            inputShape: [65],
                            activation: 'sigmoid'
                        }),
                        tf.layers.dense({
                            units: 32,
                            activation: 'sigmoid'
                        }),
                        tf.layers.dense({
                            units: 16,
                            activation: 'sigmoid'
                        }),
                        tf.layers.dense({
                            units: 4,
                            activation: 'sigmoid'
                        })
                    ]
                });
                
                model.compile({
                    optimizer: tf.train.adam(0.1),
                    loss: tf.losses.meanSquaredError
                });

                model.save("file://models").then((e) => {
                    let model_json = fs.readFileSync("models/model.json", "utf8").toString();
                    let model_bin  = fs.readFileSync("models/weights.bin", "utf8").toString();
                    let hash = crypto.createHash('md5').update(model_json + model_bin).digest("hex");

                    let model = {
                        model: JSON.stringify(fs.readFileSync("models/model.json", "utf8")),
                        weights: fs.readFileSync("models/model.json", "utf8"),
                    };

                    db.Query("INSERT INTO `models` (`ID`, `Hash`, `Cost`, `Model`, `Date`) VALUES (NULL, '"+hash+"', 10000, '"+JSON.stringify(model)+"', NOW())").then((e) => {
                        reslove();
                    }).catch((e) => {
                        reject({
                            status: -1,
                            msg: "Error: Cannot Send Model To db",
                            response: e
                        });    
                    });
                }).catch((e) => {
                    reject({
                        status: -1,
                        msg: "Error: Cannot Save The Model",
                        response: e
                    });
                });
            }
        });
    });
}

app.get("/train", (req, res) => {
    trainModel().then((e) => {
        res.json({
            status: 0,
            msg: "Success",
            response: "Success",
        });
        res.end();
    }).catch((e) => {
        res.json(e);
        res.end();
    });
});

app.listen(3000, function(e){
    console.log("Success: Start Server");
});