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

function CalcOutputChessBoard(move){
    return [ move.x1 / 7.0, move.y1 / 7.0, move.x2 / 7.0, move.y2 / 7.0 ];
}

function CalcTransposeOutputChessBoard(move){
    return [ move.x1 / 7.0, (7 - move.y1) / 7.0, move.x2 / 7.0, (7 - move.y2) / 7.0 ];
}

function CalcChessPoint(figure){
    switch (figure) {
        case 1:
            return 5;
    
        case 2:
            return 3;

        case 3:
            return 3;

        case 4:
            return 9;

        case 6:
            return 1;

        default:
            return 0;
    }
}

module.exports.chessboard = chessboard;
module.exports.CloneChessBoard = CloneChessBoard;
module.exports.CalcOutputChessBoard = CalcOutputChessBoard;
module.exports.CalcTransposeOutputChessBoard = CalcTransposeOutputChessBoard;
module.exports.CalcInputChessBoard = CalcInputChessBoard;
module.exports.CalcChessPoint = CalcChessPoint;