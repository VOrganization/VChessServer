const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const crypto = require("crypto");

let app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: 'application/*+json' }));
app.use(cors());

app.use(function(req, res, next){
    console.log(Date.now() + ":Request " + req.ip + " " + req.method + " " + req.url)
    next();
})

app.get("/", function(req, res){
    res.send("VChessServer");
});

app.post("/upload", function(req, res){
    let reqData = req.body;
    if(reqData.type == "game" && reqData.data !== undefined){
        let data = reqData.data;
        let name = crypto.createHash('md5').update(data).digest("hex");
        fs.writeFileSync("games/"+name+".json", data);
        console.log("Register Game: " + name);
        res.send("OK");
    }
    else{
        res.send("Error");
    }
    res.end();
});

app.listen(3000);