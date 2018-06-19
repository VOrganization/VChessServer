const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql2");
const fs = require("fs");
const crypto = require("crypto");

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
        let data = reqData.data;

        let players = data.players;
        let moves = data.moves;
        let hash = crypto.createHash('md5').update(moves).digest("hex");

        // calc traning data

        Query('INSERT INTO `games` (`ID`, `Hash`, `Players`, `Moves`, `Date`) VALUES(?, ?, ?, ?, ?)',
        [null, '','','','']).then(e => {
            res.json({
                status: 0,
                msg: "Success",
                response: "Success",
            })
            res.end();
        }).catch(e => {
            res.json(e);
            res.end();
        });

    }
    else{
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