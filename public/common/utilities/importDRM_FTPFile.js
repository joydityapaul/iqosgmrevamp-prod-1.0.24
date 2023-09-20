var path = require('path'), fs = require('fs');
const csvParser = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const Client = require('ssh2-sftp-client');
const sftp = new Client();
const constants = require('../../../routes/constants');
const Logger = require('./logger');
var fast_csv = require('fast-csv');
const path_ = require('path');
const drm = require('../../../routes/dynamic-rich-menu.js');

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
    importDRM_FTPFile: async (request) => {
        const payload = JSON.stringify(request.body);
        
        Logger.logInfo('importDRM_FTPFile', 'Executing', "importDRM_FTPFile", "importDRM_FTPFile", payload)
        
        const apikey = request.headers.apikey;
        const csvFilePart = request.headers.csvfilepart;
        
        Logger.logInfo('importDRM_FTPFile', "API KEY In Headers :- apikey: " + apikey + " csvFilePart: "+ csvFilePart, "importDRM_FTPFile", "importDRM_FTPFile", payload);
        
        return new Promise(async (resolve, reject) => {
            allPaths = [];
            
            const currentdate = new Date();
            //const cDate = `${currentdate.getFullYear()}${(currentdate.getMonth() + 1 > 9) ? (currentdate.getMonth() + 1) : `0${(currentdate.getMonth() + 1)}`}${currentdate.getDate() > 9 ? currentdate.getDate() : `0${currentdate.getDate()}`}`;

            const remoteFile = constants.remoteDRMDir + constants.DRM_FTP_Details.FTPFileName.replace((new RegExp("YYYYMMDD", 'g')), csvFilePart);
            const localFile = constants.DRM_FTP_Details.TempLocationLocal.replace((new RegExp("YYYYMMDD", 'g')), csvFilePart);
            
            Logger.logInfo('importDRM_FTPFile', "Fetching Auth Token", "importDRM_FTPFile", "importDRM_FTPFile", payload)
            
            let authTokenReq = await asyncRequest({
                "method": "POST",
                "headers": {
                    "content-type": "application/json"
                },
                "url": constants.DRM_FTP_Details.AuthTokenAPI,
                "body": JSON.stringify(constants.getRefreshJsonAuthObj)
            });

            if (authTokenReq.error) {

                Logger.logError('importDRM_FTPFile', "AUTH TOKEN API FAILS : " + err.message, "importDRM_FTPFile", "importDRM_FTPFile", payload)
                resolve(false);
            } else if (authTokenReq.response.statusCode == 200
                && authTokenReq.response.statusMessage == 'OK') {
                let authToken = JSON.parse(authTokenReq.body).access_token;
                Logger.logInfo('importDRM_FTPFile', "Fetching Data from Json_Refresh_Customer_Key", "importDRM_FTPFile", "importDRM_FTPFile", payload)
                let refreshReq = await asyncRequest({
                    "method": "GET",
                    "headers": {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${authToken}`
                    },
                    "url": constants.DRM_FTP_Details.AuthCustomerKeyAPI,

                });
                if (refreshReq.error) {

                    Logger.logError('importDRM_FTPFile', "Error while Fetching Data from Json_Refresh_Customer_Key, " + err.message, "importDRM_FTPFile", "importDRM_FTPFile", payload)
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

                    Logger.logInfo('importDRM_FTPFile', "API KEY from API : " + jsonrefreshkey, "importDRM_FTPFile", "importDRM_FTPFile", payload);

                    if (jsonrefreshkey == apikey) {
                        sftp.connect(constants.ftpConfig)
                            .then(() => {
                                return sftp.exists(constants.remoteDRMDir);
                            })
                            .then(() => {
                                sftp.get(remoteFile).then((stream) => {
                                    try {
                                        fs.writeFileSync(path_.join(__dirname,"//..//..//..",localFile), stream); //step 1
                                        sftp.end();
                                        Logger.logInfo('importDRM_FTPFile', "before processDRMlinking" , "importDRM_FTPFile", "importDRM_FTPFile", payload);
                                        drm.processDRMlinking(path_.join(__dirname,"//..//..//..",localFile));
                                        Logger.logInfo('importDRM_FTPFile', "after processDRMlinking" , "importDRM_FTPFile", "importDRM_FTPFile", payload);
                                        resolve(true);

                                    } catch (error) {
                                        fs.unlinkSync(localFile);
                                        Logger.logError('importDRM_FTPFile', "Unable to fetch data : " + err.message, "importDRM_FTPFile", "importDRM_FTPFile", payload);
                                        resolve(false);
                                    }
                                });

                            }).catch(err => {
                                console.error("Unable to connect FTP server : " + err.message);
                                Logger.logError('importDRM_FTPFile', "Unable to connect FTP server : " + err.message, "importDRM_FTPFile", "importDRM_FTPFile", payload);
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
    }
}