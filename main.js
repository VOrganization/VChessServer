const express = require("express");
const fs = require("fs");

let app = express();

app.get("/", function(req, res){
    res.send("VChessServer");
});

app.post("upload", function(req, res){
    console.log("Upload Data");
});

app.listen(3000);