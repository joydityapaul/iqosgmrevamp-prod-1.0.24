var path = require('path'), fs = require('fs');
var request = require('request');
const constants = require('./constants.js');
const GMRevampRulesConfig = require('../public/common/GMRevamp-config.json');
const csv = require('csv-parser');

const DRMJourneyByAction = require('../public/mapping/rules/GMRevamp/DRMActions.json');

const Logger = require('../public/common/utilities/logger');

const writeLogInCSVFile = require('./writeLogInCSVFile.js');


async function processDRMlinking(drmFilePath = "") {

   var csvData = [];

    fs.createReadStream(drmFilePath)
        .pipe(csv({ separator: '|'}))
        .on('data', function (data) {
            try {
                csvData.push(JSON.parse(JSON.stringify(data).replace("﻿spiceIDs", "spiceIDs")));
                //csvData.push(data);
            }
            catch (err) {
                //error handler
                Logger.logError("Error in DRM File parser: " + err.message, "DRMFileProcessingError",
            'DRMFileProcessingError', 'DRMFileProcessingError', 'DRMFileProcessingError');
            }
        })
        .on('end', function () {            

            Logger.logInfo("File Processed: " + csvData.length, "DRMFileProcessed",
            'DRMFileProcessed', 'DRMFileProcessed', 'creaDRMFileProcessedteRichMenu');

            pushDRMlinking(csvData);
        });
}

async function pushDRMlinking(csvData) {
    
    for (var element of csvData) {
        
        const contents = await linkRichMenuWithSpiceIds(JSON.parse("[" + element.spiceIDs + "]"), element.richMenuID, element.Usecase_ID);        
        /*let response = await asyncRequest({
            "method": "POST",
            "headers": {                
                "Content-Type": "application/json",
                "Connection": "keep-alive"
            },
            "url": "http://localhost:5000/api/sfmc/sendIQOSIQPrimaryLineMsg",
            "body": JSON.stringify({                
                "menuAction": "link",                    
                "spiceIDs": element.spiceIDs,
                "journey": "DRM",
                "richMenuID": element.richMenuID                
            }),
    
        });*/
    }
}

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function returnMenuAlias(richMenuJson, ReleaseType) {
    try {
        const richMenuName = richMenuJson.json.name;
        let richMenuAlias = "rgm" + ReleaseType + "-" + String(richMenuName).toLowerCase();
       
        if (String(richMenuName).startsWith("DRM-Default")) {
            richMenuAlias = "rgm" + ReleaseType + "-def"  + String(richMenuName).replace("DRM-Default", "").toLowerCase();
        }

        richMenuAlias = richMenuAlias.replace("registerednew", "regnew");
        richMenuAlias = richMenuAlias.replace("existingsame", "esame");
        richMenuAlias = richMenuAlias.replace("existingdiff", "ediff");       

        //remove it
        richMenuAlias = richMenuAlias.replace("ilumalimit", "ilumalim");
        richMenuAlias = richMenuAlias.replace("occasional", "occ");
        richMenuAlias = richMenuAlias.replace("frequent", "fre");        
        richMenuAlias = richMenuAlias.replace("casual", "cas");
        richMenuAlias = richMenuAlias.replace("platinum", "plat");
        //New code 09/05/2022
							 
        richMenuAlias = richMenuAlias.replace("silver", "sil");
        richMenuAlias = richMenuAlias.replace("default", "def");
            
        return richMenuAlias;
    } catch (e) {
        return '';
    }
}


function webBase64_encode(path) {
    return new Promise((resolve, reject) => {
        var request = require('request').defaults({ encoding: null });
        request.get(path, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                //data = "data:" + response.headers["content-type"] + ";base64," + Buffer.from(body).toString('base64');
                data = Buffer.from(body).toString('base64');
                resolve(data);
            }
        });
    });
}

async function exists(path) {
    try {
        await fs.access(path)
        return true
    } catch {
        return false
    }
}

async function createRichMenu(richMenuJson, ReleaseType) {

    //New code 11/05/2022    
    richMenuJson.json.areas[0].action.richMenuAliasId = returnMenuDynamicAlias(richMenuJson, ReleaseType);

    const richMenuName = richMenuJson.json.name;    
    let imageUrl =
    constants.getS3BaseURL + "/DRM/" + richMenuName + ".jpg";

    if (String(richMenuName).startsWith("DRM-Default")) {
      imageUrl =  constants.getS3BaseURL  + "/DRM/DRM-Default.png";
    }
   
    const getImageBase64_fromS3 = await webBase64_encode(imageUrl);
    const getdynamicdata = await generateDynamicText(richMenuJson);
    const size = richMenuJson.json.size;
    const areas = richMenuJson.json.areas;
    let drmActionData = 0;

    for (let i = 0; i < areas.length; i++) {
        if (areas[i].action && areas[i].action.type != "uri") {
            areas[i].action.data = getdynamicdata.actionDataArray[drmActionData];
            drmActionData++;
        }
        if (areas[i].action && areas[i].action.type == "uri") {
            areas[i].action.uri = getdynamicdata.actionDataArray[drmActionData];
            drmActionData++;
        }
    }
    const chatBarText = getdynamicdata.chatBarText;
    let response = await asyncRequest({
        "method": "POST",
        "headers": {
            "x-api-key": constants.drm_xApiKey,
            "Content-Type": "application/json",
            "Connection": "keep-alive"
        },
        "url": constants.drm_CreateUrl,
        "body": JSON.stringify({
            "request": {
                "size": size,
                "selected": true,
                "name": richMenuJson.json.name,
                "chatBarText": chatBarText,
                "areas": areas,
                "richMenuImage": getImageBase64_fromS3,
                "contentType": "image/jpeg"
            }
        }),

    });

    if (response.error) {
        Logger.logError('Error in Create Rich Menu', response.error.message,
            'createRichMenu', 'createRichMenu', 'createRichMenu')

    } else if (response.response.statusCode == 200 || response.response.statusCode == 201) {
        Logger.logInfo('Rich Menu Create Succeed', 'createRichMenu',
            'createRichMenu', 'createRichMenu', 'createRichMenu')
    }

    if (IsJsonString(response.body) && JSON.parse(response.body).richMenuId == undefined) {
        richMenuJson.errorMessage = response.body;
    } else {
       
        richMenuJson.richMenuId = JSON.parse(response.body).richMenuId;
        richMenuJson.delete_key = JSON.parse(response.body).delete_key;
        richMenuJson.errorMessage = "";
        console.log(  richMenuJson.richMenuId);
        console.log(richMenuJson.delete_key);
        console.log("  ");
    }
    richMenuJson.imageUrl = imageUrl;
    richMenuJson.json.chatBarText = getdynamicdata.chatBarText;
    richMenuJson.json.areas = areas;


    return richMenuJson;
}

async function aliasRichMenus(richMenuJson, ReleaseType) {
    const richMenuId = richMenuJson.richMenuId;
    if (richMenuId != '') {
        //const richMenuName = richMenuJson.json.name;
        const richMenuAlias = returnMenuAlias(richMenuJson, ReleaseType);
        let response = await asyncRequest({
            "method": "POST",
            "headers": {
                "x-api-key": constants.drm_xApiKey,
                "Content-Type": "application/json",
                "Connection": "keep-alive"
            },
            "url": constants.drm_AliasUrl,
            "body": JSON.stringify({
                "rich_menu_id": richMenuId,
                "rich_menu_alias_id": richMenuAlias
            }),

        });

        if (response.error) {
            Logger.logError('Error in Create Rich Menu', response.error.message,
                'aliasRichMenus', 'aliasRichMenus', 'aliasRichMenus')

        } else if (response.response.statusCode == 200 || response.response.statusCode == 201) {
            Logger.logInfo('Rich Menu Create Succeed', 'aliasRichMenus',
                'aliasRichMenus', 'aliasRichMenus', 'aliasRichMenus')
        }

        if (JSON.parse(response.body).Error) {
            if (JSON.parse(response.body).Error.message != "conflict richmenu alias id") {
                richMenuJson.errorMessage = JSON.parse(response.body).Error.message;
            }
        }
        richMenuJson.richMenuAliasId = richMenuAlias;
        richMenuJson.delete_key_alias = JSON.parse(response.body).delete_key;

    }

    return richMenuJson;
}

async function linkRichMenuWithSpiceIds(spiceIds, dynamicRichMenuID, Usecase_ID = '') {

    const logs = [];
    let response = await asyncRequest({
        "method": "POST",
        "headers": {
            "x-api-key": constants.drm_xApiKey,
            "Content-Type": "application/json"
        },
        "url": constants.drm_linkUrl,
        "body": JSON.stringify({
            "rich_menu_id": dynamicRichMenuID,
            "users": spiceIds
        }),

    });

    if (response.error) {
        Logger.logError('Error in Link Rich Menu', response.error.message,
            'linkRichMenu', 'linkRichMenu', 'linkRichMenu');

        logs.push({
            ...log_DRM_send(spiceIds, dynamicRichMenuID, "link", Usecase_ID),
            ...{
                'DateTime': new Date().toUTCString(),
                'Message': `Error Message : ${response.error.message}`,
                'ResponseType': null,
                'ResponseCode': response.error.code
            }
        });        

    } else if (response.response.statusCode == 200 || response.response.statusCode == 201) {

        if (JSON.parse(response.body).Error) {
            Logger.logError('Error in Link Rich Menu', response.body,
                'linkRichMenu', 'linkRichMenu', 'linkRichMenu')
        }
        else {
            Logger.logInfo('Rich Menu Linking Succeeded', 'linkRichMenu',
                'linkRichMenu', 'linkRichMenu', 'linkRichMenu')
        }


        logs.push({
            ...log_DRM_send(spiceIds, dynamicRichMenuID, "link", Usecase_ID),
            ...{
                'DateTime': new Date().toUTCString(),
                'Message': `Message : ${response.response.body}`,
                'ResponseType': null,
                'ResponseCode': response.response.statusCode
            }
        });
    }
    else if (response.response.statusCode > 300) {

        Logger.logError('Error in Link Rich Menu', response.body,
            'linkRichMenu', 'linkRichMenu', 'linkRichMenu')

        logs.push({
            ...log_DRM_send(spiceIds, dynamicRichMenuID, "link", Usecase_ID),
            ...{
                'DateTime': new Date().toUTCString(),
                'Message': `Message : ${response.response.body}`,
                'ResponseType': null,
                'ResponseCode': response.response.statusCode
            }
        });
    }
    writeLogInCSVFile.writeLogInCSVFile(logs);
}

function log_DRM_send(spiceId, dynamicRichMenuID, drmAction, Usecase_ID = '') {
    let mappedPropertiesRef = {
        Spice_ID: dynamicRichMenuID,
        Action: drmAction,
        Journey: "DRM",
        Loyalty: "",
        Day: "",
        Discount: null,
        Product_Family: "",
        Product_Color: "",
        ML_Asset: "",
        ML_Tracking: '',
        Microsegment: '',
        Lifestage: '',
        SegmentName: Usecase_ID
    };


    return mappedPropertiesRef;

}


async function processDRMunlinking(drmFilePath = "") {

    drmFilePath = path.join(__dirname, "../public/DRM/JSONs/Single-Coins-March22/DRM_UNLink_Menu_Journey_All_20220322.csv");
    var csvData = [];

    fs.createReadStream(drmFilePath)
        .pipe(csv({ separator: '|'}))
        .on('data', function (data) {
            try {
                csvData.push(JSON.parse(JSON.stringify(data).replace("﻿spiceIDs", "spiceIDs")));
                //csvData.push(data);
            }
            catch (err) {
                //error handler
                Logger.logError("Error in DRM File parser: " + err.message, "DRMFileProcessingError",
            'DRMFileProcessingError', 'DRMFileProcessingError', 'DRMFileProcessingError');
            }
        })
        .on('end', function () {            

            Logger.logInfo("File Processed: " + csvData.length, "DRMFileProcessed",
            'DRMFileProcessed', 'DRMFileProcessed', 'creaDRMFileProcessedteRichMenu');

            pushDRMUnlinking(csvData);
        });
}

async function pushDRMUnlinking(csvData) {
    
    for (var element of csvData) {
        
       //const contents = await unlinkRichMenuWithSpiceIds(JSON.parse("[" + element.spiceIDs + "]"), element.richMenuID, element.Usecase_ID);
       const contents = await unlinkRichMenuWithSpiceIds(JSON.parse("[" + element.spiceIDs + "]"));
    }
}


async function unlinkRichMenuWithSpiceIds(spiceIds, dynamicRichMenuID = '', Usecase_ID = '') {

    const logs = [];
    let response = await asyncRequest({
        "method": "POST",
        "headers": {
            "x-api-key": constants.drm_xApiKey,
            "Content-Type": "application/json",
            "Connection": "keep-alive"
        },
        "url": constants.drm_UnlinkUrl,
        "body": JSON.stringify({
            "users": spiceIds
        }),

    });

    if (response.error) {
        Logger.logError('Error in UnLink Rich Menu', response.error.message,
            'unlinkRichMenu', 'unlinkRichMenu', 'unlinkRichMenu');

        logs.push({
            ...log_DRM_send(spiceIds, dynamicRichMenuID, "unlink", Usecase_ID),
            ...{
                'DateTime': new Date().toUTCString(),
                'Message': `Error Message : ${response.error.message}`,
                'ResponseType': null,
                'ResponseCode': response.error.code
            }
        });

    } else if (response.response.statusCode == 200 || response.response.statusCode == 201) {

        if (JSON.parse(response.body).Error) {
            Logger.logError('Error in Link Rich Menu', response.body,
                'unlinkRichMenu', 'unlinkRichMenu', 'unlinkRichMenu')
        }
        else {
            Logger.logInfo('Rich Menu Linking Succeeded', 'unlinkRichMenu',
                'unlinkRichMenu', 'unlinkRichMenu', 'unlinkRichMenu')
        }

        logs.push({
            ...log_DRM_send(spiceIds, dynamicRichMenuID, "unlink", Usecase_ID),
            ...{
                'DateTime': new Date().toUTCString(),
                'Message': `Message : ${response.response.body}`,
                'ResponseType': null,
                'ResponseCode': response.response.statusCode
            }
        });

        // spiceIds.forEach(element => {                
        //  some code logic         
        //     });

    }
    writeLogInCSVFile.writeLogInCSVFile(logs);
}

// 
function returnRichMenuId(richMenuJson) {
    let richMenuIdNull = richMenuJson.richMenuId;
    if (String(richMenuIdNull).startsWith("richmenu")) {
        richMenuIdNull = "";
    }
    return richMenuIdNull;
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

async function initilizeDRMCreation(ReleaseType) {

    const drmPath = path.join(__dirname, "../public/DRM/JSONs/Release1");
    fs.promises.readdir(drmPath)

        .then(async (filenames) => {
            for (let filename of filenames) {
                if (filename != '.DS_Store' && fs.statSync(path.join(drmPath, filename)).isFile()) {
                    var content = JSON.parse(fs.readFileSync(path.join(drmPath, filename), 'utf8'))
                    content = await createRichMenu(content, ReleaseType);
                    fs.writeFileSync(path.join(drmPath, filename), JSON.stringify(content));
                }
            }
        })
        // If promise is rejected
        .catch(err => {
            console.log(err)
        })
}

async function initilizeDRMAliasing(ReleaseType) {

    const drmPath = path.join(__dirname, "../public/DRM/JSONs/Release1");
    fs.promises.readdir(drmPath)

        .then(async (filenames) => {
            for (let filename of filenames) {
                if (filename != '.DS_Store' && fs.statSync(path.join(drmPath, filename)).isFile()) {
                    var content = JSON.parse(fs.readFileSync(path.join(drmPath, filename), 'utf8'))
                    content = await aliasRichMenus(content, ReleaseType);
                    fs.writeFileSync(path.join(drmPath, filename), JSON.stringify(content));
                }
            }   
        })
        // If promise is rejected
        .catch(err => {
            console.log(err)
        })
}

async function generateCSV() {
    return new Promise(async (resolve, reject) => {
        var uploadFileString = "RichMenuName,RichMenuAlias,RichMenuId,delete_key,delete_key_alias\n";
        const drmPath = path.join(__dirname, "../public/DRM/JSONs/Release1");
        if (!fs.existsSync(drmPath)) {
            console.log("no dir ", drmPath);
            return;
        }

        // read all the rich menu jsons
        const allPaths = [];
        var files = fs.readdirSync(drmPath);
        for (var i = 0; i < files.length; i++) {
            var filename = path.join(drmPath, files[i]);
            var stat = fs.lstatSync(filename);

            if (filename != '.DS_Store' && filename.indexOf('.json') >= 0 && !filename.startsWith("DRM-Default")) {
                allPaths.push(readFile(filename))
            };
        };

        Promise.all(allPaths).then(async response => {
            response.forEach(async (file) => {
                var content = JSON.parse(file.data)
                uploadFileString = uploadFileString + content.json.name + "," + content.richMenuAliasId + "," + content.richMenuId + "," + content.delete_key + "," + content.delete_key_alias + "\n";
            });
            //Generate a CSV file
            fs.writeFileSync(drmPath + "UploadCSV.csv", uploadFileString);
            resolve(true)
        })
    })
}

async function generateJsonCSV() {
    return new Promise(async (resolve, reject) => {
        var uploadFileString = "RichMenuName\t RichMenuJson\n";
        const drmPath = path.join(__dirname, "../public/DRM/JSONs/");
        if (!fs.existsSync(drmPath)) {
            console.log("no dir ", drmPath);
            return;
        }

        // read all the rich menu jsons
        const allPaths = [];
        var files = fs.readdirSync(drmPath);
        for (var i = 0; i < files.length; i++) {
            var filename = path.join(drmPath, files[i]);
            var stat = fs.lstatSync(filename);

            if (filename != '.DS_Store' && filename.indexOf('.json') >= 0 && stat.isFile()) {
                allPaths.push(readFile(filename))
            };
        };

        Promise.all(allPaths).then(async response => {

            response.forEach(async (file) => {
                var content = JSON.parse(file.data)
                uploadFileString = uploadFileString + content.json.name + "\t" + JSON.stringify(content) + "\n";

            });
            //Generate a CSV file
            let d = new Date();
            let year = d.getUTCFullYear();
            let month = d.getUTCMonth() + 1;
            let date = d.getUTCDate();
            let timestring = `_${year}${month}${date}`
            let localDrmFilePath = `${drmPath}${"DRM_Json_Upload"}${timestring}${".csv"}`;
            console.log(localDrmFilePath)
            try {

                fs.writeFileSync(localDrmFilePath, uploadFileString);

                let drmFileContent;

                const remoteDirectory = Path.join(constants.remoteDRMDir, constants.DRM_Json_Upload.replace('.csv', `${timestring}${".csv"}`));

                if (fs.existsSync(localDrmFilePath)) {
                    drmFileContent = fs.createReadStream(localDrmFilePath);
                }

                sftp.connect(constants.ftpConfig)
                    .then(() => {
                        return sftp.exists(remoteDirectory);

                    })
                    .then(data => {
                        if (!data) { // if folder does not exist
                            sftp.mkdir(remoteDirectory, true);
                        }
                    })
                    .then(() => {
                        if (drmFileContent)
                            console.log(remoteDirectory)
                        return sftp.put(drmFileContent, remoteDirectory);
                        return Promise.resolve(true)
                    })
                    .then(() => {
                        if (fs.existsSync(localDrmFilePath)) {
                            fs.unlinkSync(localDrmFilePath);
                        }

                    })
                    .then(() => {
                        console.log("DRM json csv pushed successfully.");
                    })
                    .catch(err => {
                        console.error("Unable to push log file on FTP server : " + err.message);
                    }).finally(e => {
                        try {
                            if (sftp.sftp)
                                sftp.end();
                        } catch (error) {
                            console.error("Error while ending SFTP Connection : " + error.message);
                        }
                    })
            } catch (err) {
                console.error(err);
            }
            resolve(true)
        })
    })
}

function generateDynamicText(richMenuJson) {
    try {
        const actionDataArray = [];
        const retObj = {};
        let chatBarText = richMenuJson.json.chatBarText;

        let area = richMenuJson.json.areas;
        if (area.length != 0) {
            for (let i = 0; i < area.length; i++) {
                if (area[i].action && area[i].action.type != "uri") {

                    let objectToParse = "";
                    let actionData = "";
                    let firstIndex = "";
                    let lastIndex = "";
                    let drmpostbackdata = area[i].action.data;
                    let payLoaddata = "";

                    if (drmpostbackdata.indexOf("##ACTION##") > -1) {
                        firstIndex = drmpostbackdata.indexOf("##ACTION##") + "##ACTION##".length;
                        lastIndex = drmpostbackdata.lastIndexOf("##ACTION##");
                        actionData = drmpostbackdata.substring(firstIndex, lastIndex);

                        objectToParse = JSON.stringify(constants.DRMPostbackDataCTA);

                        if (DRMJourneyByAction.JourneyTriggers[actionData]) {
                            objectToParse = objectToParse.replace('##DRM##', DRMJourneyByAction.JourneyTriggers[actionData]);
                        }
                        else {
                            objectToParse = objectToParse.replace('##DRM##', "DRM");
                        }

                        objectToParse = objectToParse.replace('##action##', actionData);
                        objectToParse = objectToParse.replace('##RMN##', richMenuJson.json.name);

                        payLoaddata = `${constants.payloadHeader}${encodeURIComponent(objectToParse)}`

                        actionDataArray.push(payLoaddata);
                    }
                    else if (drmpostbackdata.indexOf("##NACTION##") > -1) {
                        firstIndex = drmpostbackdata.indexOf("##NACTION##") + "##NACTION##".length;
                        lastIndex = drmpostbackdata.lastIndexOf("##NACTION##");
                        actionData = drmpostbackdata.substring(firstIndex, lastIndex);

                        objectToParse = constants.DRMPostbackDataNative;

                        objectToParse = objectToParse.replace('##action##', actionData);
                        objectToParse = objectToParse.replace('##DRM##', "DRM");
                        objectToParse = objectToParse.replace('##RMN##', richMenuJson.json.name);
                        objectToParse = objectToParse.replace('##ntext##', encodeURIComponent(area[i].action.displayText));

                        payLoaddata = `${constants.payloadHeaderWithText}${objectToParse}`

                        actionDataArray.push(payLoaddata);
                    }

                    
                }
                if (area[i].action && area[i].action.type == "uri") {
                    let modifiedUri = area[i].action.uri;  
                    if (
                        modifiedUri.includes('##utmBaseURL##') ||
                        modifiedUri.includes('##utm_source##') ||
                        modifiedUri.includes('##utm_medium##') ||
                        modifiedUri.includes('##utm_campaign##')
                      ) {
                        modifiedUri = modifiedUri.replace((new RegExp("##utmBaseURL##", 'g')), constants.utmBaseURL);
                        modifiedUri = modifiedUri.replace((new RegExp("##utm_source##", 'g')), GMRevampRulesConfig.UTMSource);
                        modifiedUri = modifiedUri.replace((new RegExp("##utm_medium##", 'g')), GMRevampRulesConfig.UTMMedium);  
                        modifiedUri = modifiedUri.replace((new RegExp("##utm_campaign##", 'g')), GMRevampRulesConfig["UTMDRMJourneyMapping"][richMenuJson.json.name]);
                      }
                      actionDataArray.push(modifiedUri);
                }
            }
        }
        retObj.chatBarText = chatBarText;
        retObj.actionDataArray = actionDataArray;
        return retObj;
    }
    catch (e) {
        console.log(e);
    }
}

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

async function initilizeDRMDeletion() {

    const drmPath = path.join(__dirname, "../public/DRM/JSONs/Single-Coins-PM-lending-May22/SC-PM-Lending-Prod100522");

    fs.promises.readdir(drmPath)

        .then(async (filenames) => {
            for (let filename of filenames) {
                if (filename != '.DS_Store' && fs.statSync(path.join(drmPath, filename)).isFile()) {
                    var content = JSON.parse(fs.readFileSync(path.join(drmPath, filename), 'utf8'))
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    content = await deleteRichMenu(content);
                    fs.writeFileSync(path.join(drmPath, filename), JSON.stringify(content));
                }
            }
        })
        // If promise is rejected
        .catch(err => {
            console.log(err)
        })
}

async function deleteRichMenu(richMenuJson) {
    const richMenuId = richMenuJson.richMenuId;
    const delete_key = richMenuJson.delete_key;
    const delete_url = constants.get_DRM_url('delete_url');
    if (richMenuId != '') {
        const richMenuIdNull = returnRichMenuId(richMenuJson);
        let response = await asyncRequest({
            "method": "POST",
            "headers": {
                "x-api-key": constants.drm_xApiKey,
                "Content-Type": "application/json",
                "Connection": "keep-alive"
            },
            "url": `https://line.${constants.envURLVariableValue}.jp`+ delete_url,
            "body": JSON.stringify({
                "rich_menu_id": richMenuId,
                "delete_key": delete_key
            }),

        });

        if (response.error) {
            Logger.logError('Error in Deleting Rich Menu', response.error.message,
                'deleteRichMenu', 'deleteRichMenu', 'deleteRichMenu')

        }
        if (JSON.parse(response.body).Error) {
            richMenuJson.RichiMenuDeleted = "error";
        }
        else if (response.response.statusCode == 200 || response.response.statusCode == 201) {
            Logger.logInfo('Rich Menu deleted Succeed', 'deleteRichMenu',
                'deleteRichMenu', 'deleteRichMenu', 'deleteRichMenu');
            richMenuJson.RichiMenuDeleted = "success";
        }
        //richMenuJson.richMenuId = richMenuIdNull;       

    }
    return richMenuJson;
}

async function initilizeDRMAliasDeletion() {

    const drmPath = path.join(__dirname, "../public/DRM/JSONs/Single-Coins-PM-lending-May22/SC-PM-Lending-Prod100522");

    fs.promises.readdir(drmPath)

        .then(async (filenames) => {
            for (let filename of filenames) {
                if (filename != '.DS_Store' && fs.statSync(path.join(drmPath, filename)).isFile()) {
                    var content = JSON.parse(fs.readFileSync(path.join(drmPath, filename), 'utf8'))
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    content = await deleteRichMenuAlias(content);
                    fs.writeFileSync(path.join(drmPath, filename), JSON.stringify(content));
                }
            }
        })
        // If promise is rejected
        .catch(err => {
            console.log(err)
        })
                
}


async function deleteRichMenuAlias(richMenuJson) {
    const richMenuAliasId = richMenuJson.richMenuAliasId;
    const delete_key_alias = richMenuJson.delete_key_alias;
    const delete_url = constants.get_DRM_url('alias_delete_url');
    if (richMenuAliasId != '') {
        const richMenuIdNull = returnRichMenuId(richMenuJson);
        let response = await asyncRequest({
            "method": "POST",
            "headers": {
                "x-api-key": constants.drm_xApiKey,
                "Content-Type": "application/json",
                "Connection": "keep-alive"
            },
            "url": `https://line.${constants.envURLVariableValue}.jp`+ delete_url,
            "body": JSON.stringify({
                "rich_menu_alias_id": richMenuAliasId,
                "delete_key": delete_key_alias
            }),

        });

        if (response.error) {
            Logger.logError('Error in Deleting Rich Menu Alias', response.error.message,
                'deleteRichMenualias', 'deleteRichMenualias', 'deleteRichMenualias')

        }
        if (JSON.parse(response.body).Error) {
            richMenuJson.RichiMenuAliasDeleted = "error";
        }
        else if (response.response.statusCode == 200 || response.response.statusCode == 201) {
            Logger.logInfo('Rich Menu alias deleted Succeed', 'deleteRichMenualias',
                'deleteRichMenualias', 'deleteRichMenualias', 'deleteRichMenualias');
            richMenuJson.RichiMenuAliasDeleted = "success";
        }
        //richMenuJson.richMenuId = richMenuIdNull;       

    }
    return richMenuJson;
}


async function initilizeDRMAliasDeletionFromFile() {
    
    const drmFilePath = path.join(__dirname, "../public/DRM/JSONs/SingleCoins/SingleCoinsUploadCSV_Dev_with_delete_key_Jan26release.csv");
    var csvData = [];

    fs.createReadStream(drmFilePath)
        .pipe(csv({ separator: ','}))
        .on('data', function (data) {
            try 
            {                
                csvData.push(data);
            }
            catch (err) {
                //error handler
                Logger.logError("Error in DRM File parser: " + err.message, "DRMFileProcessingError",
            'DRMFileProcessingError', 'DRMFileProcessingError', 'DRMFileProcessingError');
            }
        })
        .on('end', function () 
        {
            Logger.logInfo("File Processed: " + csvData.length, "DRMFileProcessed",
            'DRMFileProcessed', 'DRMFileProcessed', 'deleteDRMAliasFileProcessed');

            pushDRMAliasDeletionFromFile(csvData);
        });
}

async function pushDRMAliasDeletionFromFile(csvData) {
    
    for (var element of csvData) {
        
     const contents = await deleteRichMenuAliasFromFile(element.RichMenuAlias,element.delete_key_alias);
    }
}

async function deleteRichMenuAliasFromFile(richMenuAliasId, delete_key_alias) {
    const delete_url = constants.get_DRM_url('alias_delete_url');
    const logs = [];
    let response = await asyncRequest({
        "method": "POST",
        "headers": {
            "x-api-key": constants.drm_xApiKey,
            "Content-Type": "application/json",
            "Connection": "keep-alive"
        },
        "url": `https://line.${constants.envURLVariableValue}.jp`+ delete_url,
            "body": JSON.stringify({
                "rich_menu_alias_id": richMenuAliasId,
                "delete_key": delete_key_alias
        }),

    });

    if (response.error) {
        Logger.logError('Error in deleting Rich Menu Alias', response.error.message,
            'deletekRichMenuAlias', 'deletekRichMenuAlias', 'deletekRichMenuAlias');

        logs.push({
            ...log_DRM_send(richMenuAliasId, "delete", richMenuAliasId),
            ...{
                'DateTime': new Date().toUTCString(),
                'Message': `Error Message : ${response.error.message}`,
                'ResponseType': null,
                'ResponseCode': response.error.code
            }
        });

    } else if (response.response.statusCode == 200 || response.response.statusCode == 201) {

        if (JSON.parse(response.body).Error) {
            Logger.logError('Error in deteting Rich Menu Alias', response.body,
                'deletekRichMenuAlias', 'deletekRichMenuAlias', 'deletekRichMenuAlias')
        }
        else {
            Logger.logInfo('Rich Menu Alias deletion Succeeded', 'deletekRichMenuAlias',
                'deletekRichMenuAlias', 'deletekRichMenuAlias', 'deletekRichMenuAlias')
        }

        logs.push({
            ...log_DRM_send(richMenuAliasId, "delete", richMenuAliasId),
            ...{
                'DateTime': new Date().toUTCString(),
                'Message': `Message : ${response.response.body}`,
                'ResponseType': null,
                'ResponseCode': response.response.statusCode
            }
        });

    }
    writeLogInCSVFile.writeLogInCSVFile(logs);
}


async function initilizeDRMDeletionFromFile() {
    
    const drmFilePath = path.join(__dirname, "../public/DRM/JSONs/SingleCoins/SingleCoinsUploadCSV_Dev_with_delete_key_Jan26release.csv");
    var csvData = [];

    fs.createReadStream(drmFilePath)
        .pipe(csv({ separator: ','}))
        .on('data', function (data) {
            try 
            {                
                csvData.push(data);
            }
            catch (err) {
                //error handler
                Logger.logError("Error in DRM File parser: " + err.message, "DRMFileProcessingError",
            'DRMFileProcessingError', 'DRMFileProcessingError', 'DRMFileProcessingError');
            }
        })
        .on('end', function () 
        {
            Logger.logInfo("File Processed: " + csvData.length, "DRMFileProcessed",
            'DRMFileProcessed', 'DRMFileProcessed', 'deleteDRMAliasFileProcessed');

            pushDRMDeletionFromFile(csvData);
        });
}

async function pushDRMDeletionFromFile(csvData) {
    
    for (var element of csvData) {
        
     const contents = await deleteRichMenuFromFile(element.RichMenuName, element.RichMenuId, element.delete_key);
    }
}

async function deleteRichMenuFromFile(RichMenuName, RichMenuId, delete_key) {
    const delete_url = constants.get_DRM_url('delete_url');
    const logs = [];
    let response = await asyncRequest({
        "method": "POST",
        "headers": {
            "x-api-key": constants.drm_xApiKey,
            "Content-Type": "application/json",
            "Connection": "keep-alive"
        },
        "url": `https://line.${constants.envURLVariableValue}.jp`+ delete_url,
            "body": JSON.stringify({
                "rich_menu_id": RichMenuId,
                "delete_key": delete_key
            }),

    });

    if (response.error) {
        Logger.logError('Error in deleting Rich Menu', response.error.message,
            'deletekRichMenu', 'deletekRichMenu', 'deletekRichMenu');

        logs.push({
            ...log_DRM_send(RichMenuName,RichMenuId, "delete", RichMenuName),
            ...{
                'DateTime': new Date().toUTCString(),
                'Message': `Error Message : ${response.error.message}`,
                'ResponseType': null,
                'ResponseCode': response.error.code
            }
        });

    } else if (response.response.statusCode == 200 || response.response.statusCode == 201) {

        if (JSON.parse(response.body).Error) {
            Logger.logError('Error in deteting Rich Menu', response.body,
                'deletekRichMenu', 'deletekRichMenu', 'deletekRichMenu')
        }
        else {
            Logger.logInfo('Rich Menu deletion Succeeded', 'deletekRichMenu',
                'deletekRichMenu', 'deletekRichMenu', 'deletekRichMenu')
        }

        logs.push({
            ...log_DRM_send(RichMenuName,RichMenuId, "delete", RichMenuName),
            ...{
                'DateTime': new Date().toUTCString(),
                'Message': `Message : ${response.response.body}`,
                'ResponseType': null,
                'ResponseCode': response.response.statusCode
            }
        });

    }
    writeLogInCSVFile.writeLogInCSVFile(logs);
}


function returnMenuDynamicAlias(richMenuJson, ReleaseType) {
    try {
        let richMenuAlias = richMenuJson.json.areas[0].action.richMenuAliasId;
        
        richMenuAlias = richMenuAlias.replace("rgm-", "rgm" + ReleaseType + "-");

        
        richMenuAlias = richMenuAlias.replace("registerednew", "regnew");
        richMenuAlias = richMenuAlias.replace("existingsame", "esame");
        richMenuAlias = richMenuAlias.replace("existingdiff", "ediff");       

        richMenuAlias = richMenuAlias.replace("default", "def");// can remove
            
        return richMenuAlias;
    } catch (e) {
        return '';
    }
}


module.exports = {
    createRichMenu,
    linkRichMenuWithSpiceIds,
    unlinkRichMenuWithSpiceIds,
    initilizeDRMCreation,
    initilizeDRMAliasing,
    initilizeDRMDeletion,
    generateCSV,
    generateJsonCSV,
    processDRMlinking,
    processDRMunlinking,
    initilizeDRMAliasDeletion,
    initilizeDRMAliasDeletionFromFile,
    initilizeDRMDeletionFromFile
}