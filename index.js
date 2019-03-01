const fs = require('fs')
    , es = require('event-stream');
const stream = fs.createWriteStream('train.csv', { flags: 'w' });
let lineNr = 0;
let firstNameIndex, genderIndex;
let maleCount = 0, femaleCount = 0, maxLength = 39;
let nextAlphabetIndex = 27;
let alphabetIndex = {
    "a": 1, "b": 2, "c": 3, "d": 4,
    "e": 5, "f": 6, "g": 7, "h": 8, "i": 9, "j": 10, "k": 11,
    "l": 12, "m": 13, "n": 14, "o": 15, "p": 16, "q": 17, "r": 18,
    "s": 19, "t": 20, "u": 21, "v": 22, "w": 23, "x": 24, "y": 25, "z": 26
};

let intervalProgress = setInterval(() => {
    console.log("Current processing index:%d", lineNr);
}, 10000);

const nameList = {};
let duplicateCount=0;
const s = fs.createReadStream('genni-ethnea-authority2009.tsv')
    .pipe(es.split())
    .pipe(es.mapSync(function (line) {

        // pause the readstream
        s.pause();
        let isValid = true;
        let data = line.split('\t');
        if (lineNr === 0) {
            firstNameIndex = data.indexOf("firstname");
            genderIndex = data.indexOf("Genni");
            stream.write("name,gender");
            console.log(firstNameIndex, genderIndex);
        } else if (line !== '') {

            if (data[firstNameIndex]) {
                let name = data[firstNameIndex].toLowerCase().trim();
                if (nameList[name]) {
                    duplicateCount++;
                    nameList[name]++;
                } else {
                    nameList[name]=1;
                    let nameVector = new Array(maxLength).fill(0);
                    for (i in name) {
                        if (alphabetIndex[name[i]]) {
                            nameVector[i] = alphabetIndex[name[i]];
                        }
                        else {
                            isValid = false;
                        }
                    }

                    if ((data[genderIndex] === "M" || data[genderIndex] === "F") && isValid && nameVector.length === maxLength) {
                        stream.write("\n");
                        switch (data[genderIndex]) {
                            case "M": {
                                stream.write(nameVector.join(";") + "," + 1);
                                maleCount++;
                                break;
                            }
                            case "F": {
                                stream.write(nameVector.join(";") + "," + 0);
                                femaleCount++;
                                break;
                            }
                        }
                    }
                }



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
            console.log('Read entire file.');
            console.log("Total males:%d total females: %d max length:%d", maleCount, femaleCount, maxLength);
            console.log("Duplicates:",duplicateCount);
            console.log("alphabet:", alphabetIndex);
            console.log("alphabet length:", Object.keys(alphabetIndex).length);
            let nameKeys=Object.keys(nameList);
            console.log("NAME LIST LENGTH:",nameKeys.length);
            for(let i=0;i<10;i++){
                console.log(nameKeys[i],nameList[nameKeys[i]]);
            }
        })
    );