// const tf = require('@tensorflow/tfjs');
// require('@tensorflow/tfjs-node');
// tf.setBackend('tensorflow');

//  // db.Query("INSERT INTO `models` (`ID`, `Hash`, `Cost`, `Model`, `Date`) VALUES (NULL, ?, ?, ?, NOW())",[hash,10,outData]).then((e) => {

//         // }).catch((e) => {
            
//         // })

//         // db.Query('SELECT * FROM `train` ORDER BY `Quality` DESC, `Date` DESC LIMIT 1000').then((train) => {
//         //     let inputs = new Array();
//         //     let outputs = new Array();

//         //     for (let i = 0; i < train.length; i++) {
//         //         let d = JSON.parse(train[i].Data);
//         //         inputs.push(d.input)
//         //         outputs.push(d.output)
//         //     }  

//         //     const xs = new tf.tensor2d(inputs);
//         //     const ys = new tf.tensor2d(outputs);

//         //     console.log("Before FIT")

//         //     training(model, xs, ys, 10, 10).then((e) => {
//         //         model.predict(input1).print();
//         //         model.predict(input0).print();
//         //         model.save("file://tmp/model").then((e) => {
//         //             console.log("OK");
//         //         });
//         //     });

// db.Query("SELECT * FROM `models` ORDER BY `models`.`Cost` ASC LIMIT 1").then((models) => {
//     if(models[0]){
//         console.log("Load Created Model");
//     }
//     else{
//         console.log("Create model");
//     }
// }).catch((e) => {
//     reject({
//         status: -1,
//         msg: "Error: While Get Current Model From db",
//         response: e
//     })
// });

// const model = tf.sequential({
//     name: "VChess",
//     layers: [
//         tf.layers.dense({
//             units: 64,
//             inputShape: [65],
//             activation: 'tanh'
//         }),
//         tf.layers.dense({
//             units: 64,
//             activation: 'tanh'
//         }),
//         tf.layers.dense({
//             units: 32,
//             activation: 'tanh'
//         }),
//         tf.layers.dense({
//             units: 4,
//             activation: 'sigmoid'
//         })
//     ]
// });

// model.compile({
//     optimizer: tf.train.sgd(0.1),
//     loss: tf.losses.meanSquaredError
// });

// async function training(model, inputs, outputs, e, n){
//     for (let i = 0; i < n; i++) {
//         let h = await model.fit(inputs, outputs, { epochs: e });
//         console.log("LOSS: " + h.history.loss[0]);
//     }
// }

// const tf = require('@tensorflow/tfjs');
// require('@tensorflow/tfjs-node');
// tf.setBackend('tensorflow');

// function saveModel(model){
//     return new Promise((reslove, reject) => {
//         model.save("file://tmp/model").then((e) => {
//             let _model = fs.readFileSync("tmp/model/model.json");
//             let _weights = fs.readFileSync("tmp/model/weights.bin");

//             let hash = crypto.createHash('md5').update(_model.toString('utf-8') + _weights.toString('utf-8')).digest("hex");
//             let size = Buffer.alloc(8);
//             size.writeUInt32LE(_model.length, 0);
//             size.writeUInt32LE(_weights.length, 4);
//             let outData =  Buffer.concat([
//                 Buffer.from("TFM", 'utf8'),
//                 Buffer.from(hash, 'utf8'),
//                 size,
//                 _model,
//                 _weights,
//             ]);

//             reslove({
//                 buffer: outData,
//                 hash: hash
//             });

//         }).catch((e) => {
//             reject("Can't save the model");
//         });
//     })
// }


// module.exports.tf = tf;
// module.exports.saveModel = saveModel;