const express = require("express");
const fs = require("fs");

let app = express();

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get("/", function(req, res){
    res.send("VChessServer");
});

app.post("upload", function(req, res){
    console.log("Upload Data");
});

app.listen(3000);