const fs = require('fs')
    , es = require('event-stream');

let intervalProgress = setInterval(() => {
    console.log("Current processing index:%d", lineNr);
}, 1000);
let lineNr = 0;
const s = fs.createReadStream('train.csv')
    .pipe(es.split())
    .pipe(es.mapSync(function (line) {

        // pause the readstream
        s.pause();



        if (lineNr > 0) {
            let data = line.split(",");
            let nameVector = data[0];
            let gender = Number(data[1]);
            if (gender !== 0 && gender !== 1) {
                console.error("Not a number:", gender);
            }
        }

        lineNr += 1;

        // resume the readstream, possibly from a callback
        s.resume();
    })
        .on('error', function (err) {
            console.log('Error while reading file.', err);
        })
        .on('end', function () {
            clearInterval(intervalProgress);
            console.log('Read entire file.%d', lineNr);


        })
    );