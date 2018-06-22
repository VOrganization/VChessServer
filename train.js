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


const getTrainDataInterval = 30 * 60 * 1000; //30 min
const uploadModelInterval = 10 * 60 * 1000; //10min
const traningInterval = 500; //500ms
const traningNumRepeats = 10;
const traningNumEpochs = 2;
const lr = 0.1;

let model = null;
let data = null;
let runTraining = false;
let loss = 1000;
let currentHash = "";


async function saveModel(model){
    return new Promise((reslove, reject) => {
        model.save("file://tmp/model").then((e) => {
            let _model = fs.readFileSync("tmp/model/model.json");
            let _weights = fs.readFileSync("tmp/model/weights.bin");

            let hash = crypto.createHash('md5').update(_model.toString('utf-8') + _weights.toString('utf-8')).digest("hex");
            let size = Buffer.alloc(8);
            size.writeUInt32LE(_model.length, 0);
            size.writeUInt32LE(_weights.length, 4);
            let outData =  Buffer.concat([
                Buffer.from("TFM", 'utf8'),
                Buffer.from(hash, 'utf8'),
                size,
                _model,
                _weights,
            ]);

            reslove({
                buffer: outData,
                hash: hash
            });

        }).catch((e) => {
            reject(e);
        });
    });
}

async function loadModel(data){
    let readString = function(data, offset, size){
        let tmp = "";
        for (let i = 0; i < size; i++) {
            tmp += String.fromCharCode(data.readUInt8(offset + i));
        }
        return tmp;
    }

    let readBuffer = function(data, offset, size){
        let buf = Buffer.alloc(size);
        for (let i = 0; i < size; i++) {
            buf.writeInt8(data.readInt8(offset + i), i);
        }
        return buf;
    }

    return new Promise((reslove, reject) => {
        if(readString(data, 0, 3) == "TFM"){
            currentHash = readString(data, 3, 32);
            let model_size  = data.readUInt32LE(35);
            let weight_size = data.readUInt32LE(39);
            fs.writeFileSync("tmp/model/model.json",  readBuffer(data, 43, model_size));
            fs.writeFileSync("tmp/model/weights.bin", readBuffer(data, 43 + model_size, weight_size));

            tf.loadModel("file://tmp/model/model.json").then((e) => {
                e.compile({
                    optimizer: tf.train.adam(lr),
                    loss: tf.losses.meanSquaredError
                });
                reslove(e);
            }).catch((e) => {
                reject("Error: While loading model by TF");
                console.log(e);
            });

        }
        else{
            reject("Error: Unknow file format");
        }
    });
}

async function traning(){
    if(runTraining){
        for (let i = 0; i < traningNumRepeats; i++) {
            let h = await model.fit(data.xs, data.ys, { epochs: traningNumEpochs });
            loss = h.history.loss[0];
            console.log(loss);
        }
        setTimeout(traning, traningInterval);
    }
    else{
        console.log("Continue");
        setTimeout(traning, traningInterval);
    }
}

function uploadModel(){
    console.log("INFO: Upload Model");
    runTraining = false;
    saveModel(model).then((outData) => {
        db.Query("INSERT INTO `models` (`ID`, `Hash`, `Cost`, `Model`, `Date`) VALUES (NULL, ?, ?, ?, NOW())",
        [ outData.hash, loss, outData.buffer ]).then((e) => {
            runTraining = true;
            setTimeout(uploadModel, uploadModelInterval);
        }).catch((e) => {
            console.log("Error: While upload model to db");
            console.log(e);
        });
    }).catch((e) => {
        console.log("Error: While save model");
        console.log(e);
    });
}

function getTrainData(){
    db.Query("SELECT * FROM `train` ORDER BY `Quality` DESC, `Date` DESC LIMIT 1000").then((train) => {
        setTimeout(getTrainData, getTrainDataInterval);
        console.log("INFO: Get Data");

        runTraining = false;
        let inputs = new Array();
        let outputs = new Array();
        for (let i = 0; i < train.length; i++) {
            let d = JSON.parse(train[i].Data);
            inputs.push(d.input)
            outputs.push(d.output)
        }  
        if(data !== null){
            data.xs.dispose();
            data.ys.dispose();
        }
        data = {
            xs: new tf.tensor2d(inputs),
            ys: new tf.tensor2d(outputs),
        }
        runTraining = true;

    }).catch((e) => {
        console.log("Error: Can't get data from db");
        console.log(e);
    });
}

async function setupModel(m){
    new Promise((reslove, reject) => {
        let app = express();
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(bodyParser.json({ type: 'application/*+json' }));
        app.use(cors());
        app.get("/", (req, res) =>{
            res.json({
                status: 0,
                msg: "Running",
                loss: loss,
                currentModel: currentHash
            });
            res.end();
        });
        app.listen(3001, function(e){
            console.log("INFO: Start Server");
        });

        model = m;
        getTrainData();
        setTimeout(uploadModel, uploadModelInterval);
        traning();
    });
}

db.Query("SELECT * FROM `models` ORDER BY `models`.`Cost` ASC LIMIT 1").then((models) => {
    if(models[0]){
        loadModel(models[0].Model).then((e) => {
            console.log("INFO: Load Created Model");

            setupModel(e).then((e) => {
                console.log("Info: Start setup model");
            }).catch((e) => {
                console.log("Error: While starting setup model");
                console.log(e);
            });

        }).catch((e) => {
            console.log("Error: While load model");
            console.log(e);
        });
    }
    else{
        const model = tf.sequential({
            name: "VChess",
            layers: [
                tf.layers.dense({
                    units: 128,
                    inputShape: [65],
                    activation: 'tanh'
                }),
                tf.layers.dense({
                    units: 128,
                    activation: 'tanh'
                }),
                tf.layers.dense({
                    units: 64,
                    activation: 'tanh'
                }),
                tf.layers.dense({
                    units: 4,
                    activation: 'sigmoid'
                })
            ]
        });
        
        model.compile({
            optimizer: tf.train.adam(lr),
            loss: tf.losses.meanSquaredError
        });

        console.log("Info: Create model");
        
        saveModel(model).then((data) => {
            console.log("Info: Save model");

            db.Query("INSERT INTO `models` (`ID`, `Hash`, `Cost`, `Model`, `Date`) VALUES (NULL, ?, ?, ?, NOW())", [ data.hash, 1000, data.buffer ]).then((e) => {
                console.log("Info: Upload model");

                setupModel(model).then((e) => {
                    console.log("Info: Start setup model");
                }).catch((e) => {
                    console.log("Error: While starting setup model");
                    console.log(e);
                });

            }).catch((e) => {
                console.log("Error: While upload model to db");
                console.log(e);
            });

        }).catch((e) => {
            console.log("Error: While saving model");
            console.log(e);
        });

    }
}).catch((e) => {
    console.log("Error: Can't send request to db for model");
    console.log(e);
});
