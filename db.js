const mysql = require("mysql2");

let connection = mysql.createConnection({
    host: "localhost",
    user: "chess",
    database: "Chess"
});

async function Query(query, values){
    return new Promise((reslove, reject) =>{
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
    });
}

module.exports.mysql = mysql;
module.exports.connection = connection;
module.exports.Query = Query;