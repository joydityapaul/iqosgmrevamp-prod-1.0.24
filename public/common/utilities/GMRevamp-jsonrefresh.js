var path = require('path'), fs = require('fs');
const csvParser = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const Client = require('ssh2-sftp-client');
const sftp = new Client();
const constants = require('../../../routes/constants');
const Logger = require('./logger');
var fast_csv = require('fast-csv');

var request = require('request');
const csvWriter = createCsvWriter({
    path: 'iqosiq-json.csv',
    header: [
        { id: 'path', title: 'path' },
        { id: 'data', title: 'json' }
    ]
});



var allPaths = [];
function fromDir(startPath, filter) {


    if (!fs.existsSync(startPath)) {
        console.log("no dir ", startPath);
        return;
    }

    var files = fs.readdirSync(startPath);
    for (var i = 0; i < files.length; i++) {
        var filename = path.join(startPath, files[i]);
        var stat = fs.lstatSync(filename);
        if (stat.isDirectory()) {
            fromDir(filename, filter); //recurse
        }
        else if (filename.indexOf(filter) >= 0) {
            allPaths.push(readFile(filename))
        };
    };
};

function readFile(path) {
    return new Promise((resolve, reject) => {
        var fileReadOptions = {
            'encoding': 'utf-8'
        };
        fs.readFile(path, fileReadOptions, (err, data) => {
            if (err) throw err;

            resolve({ path, data })
        });
    })

}

function checkFileElseCreate(fileName, callback) {
    const exists = fs.existsSync(fileName);
    if (exists) {
        callback();
    } else {
        fs.appendFileSync(fileName, '')
        callback();
    }
}

async function asyncRequest(options) {
    return new Promise(
        (resolve, reject) => {
            request(options, (error, response, body) => {
                resolve({
                    error,
                    response,
                    body
                });
            });
        });
}

function createCsvFromJSONs() {
    allPaths = [];
    fromDir('./public/MessageReferences', '.json');
    return new Promise((resolve, reject) => {
        Promise.all(allPaths).then(res => {
            // write data to csv
            csvWriter.writeRecords(res).then(() => console.log('The CSV file was written successfully'));
            resolve(true);
        })
    })

}


module.exports = {
    refreshAllJsons: async (request) => {
        const payload = JSON.stringify(request.body);
        Logger.logInfo('refreshAllJsons', 'Executing', "refreshAllJsons", "refreshAllJsons", payload)
        const apikey = request.headers.apikey;
        Logger.logInfo('refreshAllJsons', "API KEY In Headers : " + apikey, "refreshAllJsons", "refreshAllJsons", payload);
        return new Promise(async (resolve, reject) => {
            allPaths = [];
            const remoteFile = constants.remoteDir + constants.JSONRefresh.FTPFileName;
            const localFile = constants.JSONRefresh.TempLocationLocal;
            Logger.logInfo('refreshAllJsons', "Fetching Auth Token", "refreshAllJsons", "refreshAllJsons", payload)
            let authTokenReq = await asyncRequest({
                "method": "POST",
                "headers": {
                    "content-type": "application/json"
                },
                "url": constants.JSONRefresh.AuthTokenAPI,
                "body": JSON.stringify(constants.getRefreshJsonAuthObj)
            });

            if (authTokenReq.error) {

                Logger.logInfo('refreshAllJsons', "AUTH TOKEN API FAILS : " + err.message, "refreshAllJsons", "refreshAllJsons", payload)
                resolve(false);
            } else if (authTokenReq.response.statusCode == 200
                && authTokenReq.response.statusMessage == 'OK') {
                let authToken = JSON.parse(authTokenReq.body).access_token;
                Logger.logInfo('refreshAllJsons', "Fetching Data from Json_Refresh_Customer_Key", "refreshAllJsons", "refreshAllJsons", payload)
                let refreshReq = await asyncRequest({
                    "method": "GET",
                    "headers": {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${authToken}`
                    },
                    "url": constants.JSONRefresh.AuthCustomerKeyAPI,

                });
                if (refreshReq.error) {

                    Logger.logInfo('refreshAllJsons', "Error while Fetching Data from Json_Refresh_Customer_Key, " + err.message, "refreshAllJsons", "refreshAllJsons", payload)
                    resolve(false);
                } else if (refreshReq.response.statusCode == 200
                    && refreshReq.response.statusMessage == 'OK') {
                    let api_response = JSON.parse(refreshReq.body);
                    let jsonrefreshkey = "INVALID_JSON_KEY"
                    if (api_response.items &&
                        api_response.items[0] && api_response.items[0].values &&
                        api_response.items[0].values.jsonrefreshkey) {
                        jsonrefreshkey = api_response.items[0].values.jsonrefreshkey;
                    }


                    Logger.logInfo('refreshAllJsons', "API KEY from API : " + jsonrefreshkey, "refreshAllJsons", "refreshAllJsons", payload);

                    if (jsonrefreshkey == apikey) {
                        sftp.connect(constants.ftpConfig)
                            .then(() => {
                                return sftp.exists(constants.remoteDir);
                            })
                            .then(() => {
                                sftp.get(remoteFile).then((stream) => {
                                    try {
                                        fs.writeFileSync(localFile, stream); //step 1
                                        sftp.end();

                                        const rowData = [];
                                        fs.createReadStream(localFile) // step 2
                                            .pipe(csvParser({ separator: '|' }))
                                            .on('data', (row) => {
                                                rowData.push(row)
                                            })
                                            .on('end', () => {
                                                Logger.logInfo('refreshAllJsons', "Total rows from CSV : " + rowData.length,
                                                    "refreshAllJsons", "refreshAllJsons", {});

                                                for (let index = 0; index < rowData.length; index++) {
                                                    const row = rowData[index];
                                                    let path = row[Object.keys(row)[0]];
                                                    path = path.replace((new RegExp(" ", 'g')), '');;
                                                    path = path.split('\\').join('/');
                                                    const content = row[Object.keys(row)[1]];
                                                    if (content && content.toString().trim()) {
                                                        Logger.logInfo('refreshAllJsons', "before : writing content in " + path,
                                                            "refreshAllJsons", "refreshAllJsons", {});
                                                        const exists = fs.existsSync(path);
                                                        if (!exists) {
                                                            Logger.logInfo('refreshAllJsons', "Path doesnt exists : " + path,
                                                                "refreshAllJsons", "refreshAllJsons", {});

                                                            fs.appendFileSync(path, '')
                                                        }
                                                        fs.writeFileSync(path, content);
                                                        Logger.logInfo('refreshAllJsons', "after : writing content in " + path, "refreshAllJsons", "refreshAllJsons", {});

                                                    } else {
                                                        Logger.logInfo('refreshAllJsons', "deleting file on " + path, "refreshAllJsons", "refreshAllJsons", payload);
                                                        // delete file
                                                        fs.unlinkSync(path);
                                                    }
                                                }
                                                Logger.logInfo('refreshAllJsons', 'CSV file successfully processed', "refreshAllJsons", "refreshAllJsons", payload);
                                                fs.unlinkSync(localFile);
                                                resolve(true);
                                            });

                                    } catch (error) {
                                        fs.unlinkSync(localFile);
                                        resolve(false);
                                    }
                                });

                            }).catch(err => {
                                console.error("Unable to connect FTP server : " + err.message);
                                Logger.logError('refreshAllJsons', "Unable to connect FTP server : " + err.message, "refreshAllJsons", "refreshAllJsons", payload);
                                resolve("Unable to connect FTP server : " + err.message);
                                //sftp.end();
                            });

                    } else {
                        resolve("Invalid APIKEY passed");
                    }

                }
            } else {
                resolve(false);
            }

        });
    },
    createCsvFromJSONs
}