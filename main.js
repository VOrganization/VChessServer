const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const crypto = require("crypto");

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

app.get("/train", (req, res) => {

});

app.listen(3000, function(e){
    console.log("Success: Start Server");
});