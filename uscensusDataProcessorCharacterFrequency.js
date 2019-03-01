const fs = require('fs')
    , es = require('event-stream');
const stream = fs.createWriteStream('train.csv', { flags: 'w' });
let lineNr = 0;
let maleCount = 0, femaleCount = 0;
let alphabetIndex = {
    "a": 1, "b": 2, "c": 3, "d": 4,
    "e": 5, "f": 6, "g": 7, "h": 8, "i": 9, "j": 10, "k": 11,
    "l": 12, "m": 13, "n": 14, "o": 15, "p": 16, "q": 17, "r": 18,
    "s": 19, "t": 20, "u": 21, "v": 22, "w": 23, "x": 24, "y": 25, "z": 26
};

let frequencyCount = {
    a: 0,
    b: 0,
    c: 0,
    d: 0,
    e: 0,
    f: 0,
    g: 0,
    h: 0,
    i: 0,
    j: 0,
    k: 0,
    l: 0,
    m: 0,
    n:0,
    o: 0,
    p: 0,
    q: 0,
    r: 0,
    s: 0,
    t: 0,
    u: 0,
    v: 0,
    w: 0,
    x: 0,
    y: 0,
    z: 0
}

let frequencyVector = [];
Object.keys(frequencyCount).forEach(i => {
    frequencyVector[alphabetIndex[i] - 1] = i;
});

const maleList = {};
const femaleList = {};
let ignoredCount = 0;
const MAXALLOWEDLENGTH = 9;
let maxLengthFound = MAXALLOWEDLENGTH;
let totalRecords = 0;

const dir = './uscensus/'

fs.readdir(dir, async function (err, filenames) {
    if (err) {
        console.error(err);
        return;
    }
    let promises = [];
    filenames.forEach(function (filename) {
        console.log(filename);
        promises.push(processFile(dir + filename));
    });
    await Promise.all(promises).then(res => {
        console.log("Read done");

        writeFile(maleList, femaleList);

        console.log("Ignored count:", ignoredCount);
        console.log("Total records:", totalRecords)
    }, err => {

        console.err("Error processing", err);
    })
});

const addToList = (listToAdd, name, frequency = 1) => {
    if (listToAdd[name]) {
        listToAdd[name] += frequency;
    } else {
        listToAdd[name] = frequency;
    }
}


const processFile = async (fileName) => {
    return await new Promise((resolve, reject) => {
        const s = fs.createReadStream(fileName)
            .pipe(es.split())
            .pipe(es.mapSync(function (line) {

                // pause the readstream
                s.pause();
                let data = line.split(',');

                if (data.length > 2) {
                    let [name, gender, frequency] = data;
                    name = name.toLowerCase().trim();
                    gender = gender.toLowerCase();
                    if (name.length <= MAXALLOWEDLENGTH) {
                        if (gender === "m") {
                            addToList(maleList, name, frequency);
                            maleCount++;
                        } else {
                            addToList(femaleList, name, frequency);
                            femaleCount++;
                        }
                    } else {
                        if (maxLengthFound < name.length) {
                            maxLengthFound = name.length;
                        }
                    }

                }


                lineNr += 1;
                // resume the readstream, possibly from a callback
                s.resume();
            })
                .on('error', function (err) {
                    console.log('Error while reading file.', err);
                    reject(err);
                })
                .on('end', function () {

                    console.log('Read entire file:', fileName);
                    console.log("Total males:%d total females: %d max length found:%d", maleCount, femaleCount, maxLengthFound);
                    console.log("alphabet length:", Object.keys(alphabetIndex).length);

                    resolve();
                })
            );
    });
}


const getFrequencyVector = (name) => {
    const frequencyCounteObject = { ...frequencyCount };
    for (i in name) {
        frequencyCounteObject[name[i]] += 1;
    }
    return frequencyVector.reduce((result, key,index) => {
        result[index] = frequencyCounteObject[key];
        return result;
    }, []);
}
const writeFile = (maleList, femaleList) => {
    const maleKeys = Object.keys(maleList);
    const femaleKeys = Object.keys(femaleList);
    console.log("Before cleanup >male count:", maleKeys.length, " female count:", femaleKeys.length);
    maleCount = 0, femaleCount = 0;
    stream.write("name,"+frequencyVector.join('_f,')+"_f,gender\n");

    maleKeys.forEach((maleName) => {
        const maleFrequency = maleList[maleName] || 0;
        const femaleFrequency = femaleList[maleName] || 0;
        const genderScore = (maleFrequency - femaleFrequency) / (maleFrequency + femaleFrequency);
        let nameVector = new Array(MAXALLOWEDLENGTH).fill(0);
        for (i in maleName) {
            if (alphabetIndex[maleName[i]]) {
                nameVector[i] = alphabetIndex[maleName[i]];
            }
        }

        if (genderScore > 0) {//male
            let frequencyVectorArr=getFrequencyVector(maleName);
            stream.write(nameVector.join(";") + "," +frequencyVectorArr.join(',')+','+ 1 + "\n");
            if (femaleFrequency > 0) {
                delete femaleList[maleName];
            }
            maleCount++;
            totalRecords++;
        } else if (genderScore < 0) {
            if (maleFrequency > 0) {
                delete maleList[maleName];
            }
            //all female records will be written by female list processing
        } else {
            //console.log("Ignored value found. Gender score 0 for name:", maleName);
            ignoredCount++;
            delete femaleList[maleName];
            delete maleList[maleName];
        }

    });


    Object.keys(femaleList).forEach((femaleName) => {
        let nameVector = new Array(MAXALLOWEDLENGTH).fill(0);
        for (i in femaleName) {
            if (alphabetIndex[femaleName[i]]) {
                nameVector[i] = alphabetIndex[femaleName[i]];
            }
        }
        let frequencyVectorArr=getFrequencyVector(femaleName);

        stream.write(nameVector.join(";")+','+frequencyVectorArr.join(',') + "," + 0 + "\n");
        femaleCount++;
        totalRecords++;
    });
    console.log("After cleanup >male count:", maleCount, " female count:", femaleCount);
}
