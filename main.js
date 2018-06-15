const express = require("express");
const fs = require("fs");
const crypto = require("crypto");

let app = express();

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get("/", function(req, res){
    res.send("VChessServer");
});

app.post("/upload", function(req, res){
    if(req.param("type") == "game" && req.param("data") !== undefined){
        let data = req.param("data");
        let name = crypto.createHash('md5').update(data).digest("hex");
        fs.writeFileSync("games/"+name+".json", data);
    }
    else{
        res.send("Error");
    }
    res.send("OK");
});

app.listen(3000);