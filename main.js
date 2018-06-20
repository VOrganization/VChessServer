const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql2");
const fs = require("fs");
const crypto = require("crypto");

const chessboard = [
    [-1, -2, -3, -4, -5, -3, -2, -1],
    [-6, -6, -6, -6, -6, -6, -6, -6],
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 6,  6,  6,  6,  6,  6,  6,  6],
    [ 1,  2,  3,  4,  5,  3,  2,  1]
];

function CloneChessBoard(chessboard){
    let newBoard = new Array();
    for (let y = 0; y < chessboard.length; y++) {
        let arr = new Array();
        for (let x = 0; x < chessboard[y].length; x++) {
            arr.push(chessboard[y][x]);
        }
        newBoard.push(arr);
    }
    return newBoard;
}

function CalcInputChessBoard(chessboard, side){
    let input = new Array();
    input.push(side);
    for (let y = 0; y < chessboard.length; y++) {
        for (let x = 0; x < chessboard[y].length; x++) {
            input.push(chessboard[y][x]);
        }
    }
    return input;
}

let connection = mysql.createConnection({
    host: "localhost",
    user: "chess",
    database: "Chess"
});

async function Query(query, values){
    return new Promise((reslove, reject) =>{
        if(values !== undefined){
            connection.query(query, values, function(err, results){
                if(err === null){
                    reslove(results);
                }
                else{
                    reject({
                        status: -1,
                        msg: "Error: error while cent query to db",
                        response: err
                    })
                }
            });
        }
        else{
            connection.query(query, function(err, results){
                if(err === null){
                    reslove(results);
                }
                else{
                    reject({
                        status: -1,
                        msg: "Error: error while cent query to db",
                        response: err
                    })
                }
            });
        }       
    });
}

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

        console.log(JSON.stringify(players));
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
        let prevBoard0 = CloneChessBoard(chessboard);
        let prevBoard1 = CloneChessBoard(chessboard);
        let trainData = [];
        for (let i = 0; i < moves.length; i++) {
            console.log(JSON.stringify(moves[i]));
            let out = {
                input: CalcInputChessBoard(prevBoard0, players[moves[i].player].sideID),
                output: [ moves[i].x1, moves[i].y1, moves[i].x2, moves[i].y2 ],
                quality: players[moves[i].player].quality,
                hash: ""
            }
            out.hash = crypto.createHash('md5').update(JSON.stringify(out.input) + JSON.stringify(out.output)).digest("hex");

            let enemy = Math.abs(prevBoard0[moves[i].y2][moves[i].x2]);
            prevBoard0[moves[i].y2][moves[i].x2] = prevBoard0[moves[i].y1][moves[i].x1];
            prevBoard0[moves[i].y1][moves[i].x1] = 0;

            switch (enemy) {
                case 6:{
                    players[moves[i].player].points += 1;
                    points += 1;
                    break;
                }
            
                default:
                    break;
            }


            console.log(out.hash + "  Q: " + out.quality);
            trainData.push(out);
        }

        fs.writeFileSync("train.json", JSON.stringify(trainData));

        Query("INSERT INTO `games` (`ID`, `Hash`, `Players`, `Moves`, `Date`) VALUES(NULL, '"+hash+"', '"+SPlayers+"', '"+SMoves+"', NOW())").then(e => {
            //calc train data;



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
    Query('SELECT * FROM `games`').then((e) => {
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
    Query('SELECT * FROM `models` ORDER BY `models`.`Cost` ASC').then((e) => {
        e[0]["status"] = 0;
        res.json(e[0]);
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