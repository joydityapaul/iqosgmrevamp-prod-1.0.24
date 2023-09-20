const constants = require('./constants');
let request = require('request');
const Path = require('path');
const fs = require('fs');
const JsonFind = require('json-find');
//const constants = require('../routes/constants');
const GMRevampRules = require('../public/mapping/rules/GMRevamp/rules.json');
const Personalization = require('../public/mapping/Personalization.json');
const Enum = require('../public/mapping/Enum.json');
const csv =  require('csvtojson');
// const Logger = require('../public/common/utilities/logger');
// const maintenanceMode = require('../public/MaintenanceMode.json');


function _getTimeStamp() {
    return (+new Date());
}

function _formattedTimeObj() {
    const currentdate = new Date();
    const cDate = `${currentdate.getFullYear()}${(currentdate.getMonth() + 1 > 9) ? `${(currentdate.getMonth() + 1)}` : `0${(currentdate.getMonth() + 1)}`}${currentdate.getDate() > 9 ? `${currentdate.getDate()}` : `0${currentdate.getDate()}`}${(currentdate.getHours() >9)?`${(currentdate.getHours())}`:`0${currentdate.getHours()}`}${'00'}`;
    return {
        "CurrentDate": cDate,
        "TimeString": currentdate.toString(),
        "UTCTimeString": currentdate.toUTCString(),
    };
}

// CSV to JSON parser
async function csvToJsonParser(csvFilePath = "") {

    var csvData;

    try {
        csvData = await csv().fromFile(csvFilePath);
    }
    catch (err) {
        //error handler
        Logger.logError("Error in CSV to JSON parser: " + err, "CSVtoJSONError",
    'CSVtoJSONFileProcessingError', 'CSVtoJSONFileProcessingError', 'CSVtoJSONFileProcessingError');
    }
    
    return csvData;
}

async function findCTA(spiceId, action, duration = 10000, csvData) {
    
    let ctaFound = false;

    try {

        for (var element of csvData) {
        
            if(element.Spice_Id == spiceId && element.Action == action && element.DateTime){
            
                dt1 = new Date();
                dt2 = new Date(element.DateTime);

                if(dt1.getTime() - dt2.getTime() <= duration){
                    // element found
                    ctaFound = true;
                    break;
                }
                
            }            
        }
    }
    catch (err) {
        //error handler
        Logger.logError("Error in CSV to JSON parser - findCTA: " + err, "CSVtoJSONfindCTAError",
    'CSVtoJSONfindCTAFileProcessingError', 'CSVtoJSONfindCTAFileProcessingError', 'CSVtoJSONfindCTAFileProcessingError');
    }    

    return ctaFound;
}





// This is a workaround for replacing the deprecated "text" key with the "displayText" key for quick replies
function _removeQuickReplyReturnText(msgObjectStr) {
    let msgObject;
    try {
        msgObject = JSON.parse(msgObjectStr);
        if (msgObject.quickReply) {
            msgObject.quickReply.items.map((qReply) => {
                if (qReply.action.type === 'postback' && qReply.action.text) {
                    qReply.action.displayText = qReply.action.text;
                    delete qReply.action.text;
                }
                return qReply
            });
        }
        return JSON.stringify(msgObject);
    } catch (error) {
        console.log('Error: ' + error);
        return msgObjectStr;
    }
}


module.exports = {

    csvToJsonParser,
    findCTA, 

    enumeratedPayload: function (payload) {
        let enumeratedPayload = {};
        for (const attr in payload) {
            if (payload.hasOwnProperty(attr)) {
                const attrVal = typeof payload[attr] === 'string' ? payload[attr].trim() : payload[attr];
                if (Enum[attrVal]) {
                    enumeratedPayload[attr] = Enum[attrVal];
                }
            }
        }
        return {
            ...payload,
            ...enumeratedPayload
        };
    },


    formattedTimeObj: function () {
        return _formattedTimeObj();
    },
    
    // getRulePath => It will return the Manifest file path for the "Rule" aka Business Rule
    getManifestPathPhase3: function (rule, journey) {
        if (GMRevampRules["JOURNEY"][journey][rule])
            return GMRevampRules["JOURNEY"][journey][rule].path || false;
        return false;
    },
    
    getManifestObj: function (rule, journey, withConfig = false) {
        const manifestFilePath = this.getManifestPathPhase3(rule, journey);
        if (manifestFilePath) {
            const messagesDataStr = this.readJSONFile(manifestFilePath);
            try {
                const messageData = JSON.parse(messagesDataStr);
                if (!withConfig && typeof (messageData.Messages.Message1) == 'object') {
                    Object.keys(messageData.Messages).forEach(a => {
                        messageData.Messages[a] = messageData.Messages[a].path;
                    });
                }
                return messageData;

            } catch (error) {
                return false;
            }
        } else {
            return false;
        }
    },


    logMessage: function (spiceId, fileName, message, loggingMode = "info") {
        if (loggingMode === 'both' || loggingMode === 'info') {
            const dir = `./log`;
            checkDirExistsElseCreate(dir);
            fs.writeFileSync(`./log/${spiceId}_${_getTimeStamp()}_${fileName}.json`, message);
        }
    },
    errorLogMessage: function (spiceId, fileName, message) {
        const dir = `./errorlog`;
        checkDirExistsElseCreate(dir);
        fs.writeFileSync(`./errorlog/${_getTimeStamp()}_${spiceId}_${fileName}.json`, message);
    },
    infoLogMessage: function (spiceId, fileName, message) {
        const dir = `./infolog`;
        checkDirExistsElseCreate(dir);
        fs.writeFileSync(`./infolog/${_getTimeStamp()}_${spiceId}_${fileName}.json`, message);
    },
    readJSONFile: function (fileFullPath) {
        try {
            let fileFullPathnew = doesFileHaveExtension(fileFullPath);
            var LINEMessages = fs.readFileSync(fileFullPathnew, 'utf8');
            return LINEMessages ? LINEMessages : null;
        } catch (error) {
            console.log(`Unable read file from give path: ${fileFullPath}\n ${error}`);
            return null;
        }
    },
    getMessagePayloadForCSV: function (payload) {
        let date = new Date();
        let rule = !!payload.action ? payload.action : payload.BR;

        return {
            "SpiceId": payload.spice_id || payload.SID,
            'DateTime': new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString(),
            // "BusinessRule": this.getRule(rule) || rule,
            // "CurrentProduct": payload.current_product || payload.CP,
            // "RecommendedProduct": payload.recommended_product || payload.RP,
            // "Gender": payload.gender || payload.G,
            // "Loyalty": payload.loyalty || payload.L,
            // "CustomerType": payload.customer_type || payload.CT,
            // "ColorVariation": payload.CV || '',
            "c_gender": payload.c_gender || payload.c_G,
            "c_fname": payload.c_fname || payload.c_FN,
            "c_lname": payload.c_lname || payload.c_LN,
            "c_loyalty": payload.c_loyalty || payload.c_L,
            "c_day": payload.c_day || payload.c_D,
            "journey": payload.journey || payload.c_J,
            "SegmentName": payload.SegmentName || '',
            "OtherInfo": payload.OtherInfo || '',

        };
    },
    getActualMessageObject: function (constants, msgObject, spiceId, typeOfCustomer, day, version, loyalty, subscriptionPlan, dynamicContent) {
        msgObject = msgObject.replace(constants.envURLVariable, constants.envURLVariableValue);

        msgObject = msgObject.replace(constants.envBasedURLConstant, constants.envBasedURLVariableValue);
        let messageobject = JSON.parse(msgObject);
        let payloadData = [];
        if (messageobject && messageobject.contents) {
            if (messageobject.contents.type === 'carousel') {

                let carouselCollection = messageobject.contents.contents ? messageobject.contents.contents : null;
                carouselCollection.forEach((flexContent) => {

                    let LINEMessagesObject = JsonFind(flexContent);
                    let payloadFound = LINEMessagesObject.checkKey("data");
                    let uriPayloadFound = LINEMessagesObject.checkKey("uri");

                    if (payloadFound)
                        payloadData.push({
                            "isData": true,
                            "payLoad": payloadFound
                        });
                    // if (uriPayloadFound)
                    //  payloadData.push({ "isData": false, "payLoad": uriPayloadFound });

                });
            } else { // bubble but 

                if (messageobject && // check Day4_Message_10_New.json 
                    messageobject.contents &&
                    messageobject.contents.body &&
                    messageobject.contents.body.contents &&
                    messageobject.contents.body.contents.length > 1) {

                    let bubbleMessageCollection = messageobject.contents.body.contents;

                    bubbleMessageCollection.forEach((flexContent) => {
                        let LINEMessagesObject = JsonFind(flexContent);
                        let payloadFound = LINEMessagesObject.checkKey("data");
                        let uriPayloadFound = LINEMessagesObject.checkKey("uri");
                        if (payloadFound)
                            payloadData.push({
                                "isData": true,
                                "payLoad": payloadFound
                            });
                        //  if (uriPayloadFound)
                        //    payloadData.push({ "isData": false, "payLoad": uriPayloadFound });
                    });
                } else {
                    let LINEMessagesObject = JsonFind(messageobject);
                    let payloadFound = LINEMessagesObject.checkKey("data");
                    let uriPayloadFound = LINEMessagesObject.checkKey("uri");

                    if (payloadFound)
                        payloadData.push({
                            "isData": true,
                            "payLoad": payloadFound
                        });
                    // if (uriPayloadFound)
                    //       payloadData.push({ "isData": false, "payLoad": uriPayloadFound });

                }
            }
        }
        if (payloadData.length > 0) {
            let message = JSON.stringify(msgObject);

            payloadData.forEach((payload) => {
                let newPayLoad
                if (payload.isData) {
                    let actualPayloadObject = JSON.parse(decodeURIComponent(payload.payLoad)).DATA;
                    let shortenPayLoadObject = shortenPayLoad(constants, actualPayloadObject, spiceId, typeOfCustomer, day, version, loyalty, subscriptionPlan, dynamicContent);
                    newPayLoad = encodeURIComponent(JSON.stringify(shortenPayLoadObject));
                    newPayLoad = `${constants.payloadHeader}${newPayLoad}`
                    message = message.replace(payload.payLoad, newPayLoad);
                }
                // } else {
                //     //let shortenURIPayLoad = getShortenPayLoad(constants,payload.payLoad, spiceId, typeOfCustomer, day, version, loyalty, subscriptionPlan, dynamicContent);
                //     //newPayLoad = shortenURIPayLoad;
                // }

                // //message = message.replace(payload.payLoad, newPayLoad);

            });
            return JSON.parse(message);
        } else {
            msgObject = JSON.stringify(msgObject).replace(constants.envURLVariable, constants.envURLVariableValue);
            return JSON.parse(msgObject);;
        }
    },

    getJsonFilePath: function (constants, JSONFilePath, Journey_Day) {
        try {
            let pathArray = JSONFilePath.split('/');
            if (pathArray.length > 1) {
                return Path.join(...constants.publicPath, constants.LineMessagesParentFolderName, ...pathArray.splice(1));
            } else {
                return Path.join(...constants.publicPath, constants.LineMessagesParentFolderName, `${constants.day}${Journey_Day}`, ...pathArray);
            }
        } catch (error) {
            console.log('unable to get JSON File Path : ' + error)
        }

    },
    getSecondaryJsonFilePath: function (JSONFile, stream) {
        try {
            if (stream) {
                return Path.join(...constants.publicPath, constants.LineMessagesParentFolderName, stream, `${JSONFile}.json`);
            } else {
                return Path.join(...constants.publicPath, constants.LineMessagesParentFolderName, JSONFile, `${JSONFile}.json`);
            }
        } catch (error) {
            console.log('unable to get Secondary JSON File Path : ' + error)
        }
    },

    isValidKey: function (req, constants) {
        return req && req.headers && req.headers["x-api-key"] && req.headers["x-api-key"] === constants.xApiKey;
    },

    kiteWheelAPI: async function (constants, spiceId, productVersion) {
        var date = new Date();
        let key = constants.kiteWheelkeyConfig;
        let kiteWheelurl = constants.kiteWheelkeyConfigUrl;
        var request = require('request');
        request.post(
            `https://api-jp.kitewheel.com/api/v1/listener/${kiteWheelurl}`, {
            json: {
                "spice_id": spiceId,
                "event": "gm_survey_sent_24",
                "product_version": productVersion,
                "timestamp": new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString()
            },
            headers: {
                "x-api-Key": key,
                "content-type": "application/json"
            }
        },
            function (error, response, body) {

            }
        );

    }
}

//Async Request
async function asyncRequest(options) {
    return new Promise(
        (resolve, reject) => {
            request(options, (error, response, body) => {
                resolve({
                    error,
                    response,
                    body
                })
            });
        }, (resolve, reject) => {
            request(options, (error, response, body) => {
                reject({
                    error,
                    response,
                    body
                })
            });
        });

}


function joinString(constants, newPayLoad, Key, value) {

    return newPayLoad + "&'" + constants.shortenKeys[Key] + "'=" + value;
}

function getShortenPayLoad(constants, uriPayload, spiceId, typeOfCustomer, day, version, loyalty, subscriptionPlan, dynamicContent) {
    try {
        var newPayLoad = uriPayload;
        newPayLoad = joinString(constants, newPayLoad, "SpiceID", spiceId)
        newPayLoad = joinString(constants, newPayLoad, "CustomerType", `'${typeOfCustomer}'`)
        newPayLoad = joinString(constants, newPayLoad, "JourneyDay", day)
        if (version)
            newPayLoad = joinString(constants, newPayLoad, "ProductVersion", `'${version}'`);
        if (loyalty)
            newPayLoad = joinString(constants, newPayLoad, "Loyalty", `'${loyalty}'`)
        if (subscriptionPlan)
            newPayLoad = joinString(constants, newPayLoad, "SubscriptionPlanType", `'${subscriptionPlan}'`)
        if (dynamicContent.Basic)
            newPayLoad = joinString(constants, newPayLoad, "Basic", dynamicContent.Basic)
        if (dynamicContent.Malfunction)
            newPayLoad = joinString(constants, newPayLoad, "Malfunction", dynamicContent.Malfunction)
        if (dynamicContent.Taste)
            newPayLoad = joinString(constants, newPayLoad, "Taste", dynamicContent.Taste)
        if (dynamicContent.Cleaning)
            newPayLoad = joinString(constants, newPayLoad, "Cleaning", dynamicContent.Cleaning)
        if (dynamicContent.Stream)
            newPayLoad = joinString(constants, newPayLoad, "Stream", `'${dynamicContent.Stream}'`)
        return newPayLoad;

    } catch (error) {
        console.log("Unable to shorten Payload due to : " + error);
        return {};
    }
}


function doesFileHaveExtension(fileFullPath) {
    return fileFullPath.includes('.json') || fileFullPath.includes('.JSON') ? fileFullPath : fileFullPath.concat(".json");
}

function messageTypeThree(messagekey, dynamicContent, dynamicContentObject) {
    var bBasic;
    var bCleaning;
    var bTaste;
    if (dynamicContent.Basic && dynamicContent.Basic != 1 && dynamicContent.Basic != 0)
        bBasic = dynamicContent.Basic && (dynamicContent.Basic.toUpperCase() == 'TRUE') ? true : false;
    else
        bBasic = dynamicContent.Basic;
    if (dynamicContent.Taste && dynamicContent.Taste != 1 && dynamicContent.Taste != 0)
        bTaste = dynamicContent.Taste && (dynamicContent.Taste.toUpperCase() == 'TRUE') ? true : false;
    else
        bTaste = dynamicContent.Taste;
    if (dynamicContent.Cleaning && dynamicContent.Cleaning != 1 && dynamicContent.Cleaning != 0)
        bCleaning = dynamicContent.Cleaning && (dynamicContent.Cleaning.toUpperCase() == 'TRUE') ? true : false;
    else
        bCleaning = dynamicContent.Cleaning;

    switch (messagekey) {
        case "Message3_DC":
            if (bTaste && bCleaning)
                return dynamicContentObject[Object.keys(dynamicContentObject)[3]]
            if (bBasic || (!bTaste && !bCleaning))
                return dynamicContentObject[Object.keys(dynamicContentObject)[0]]
            if (bTaste)
                return dynamicContentObject[Object.keys(dynamicContentObject)[1]]
            if (bCleaning)
                return dynamicContentObject[Object.keys(dynamicContentObject)[2]]
            break;
        default:
            break;
    }
}

function messageTypeThreeToSeven(messagekey, dynamicContent, dynamicContentObject) {
    var bMalfunction;
    if (dynamicContent.Malfunction && dynamicContent.Malfunction != 1 && dynamicContent.Malfunction != 0)
        bMalfunction = dynamicContent.Malfunction && (dynamicContent.Malfunction.toUpperCase() == 'TRUE') ? true : false;
    else
        bMalfunction = dynamicContent.Malfunction;

    switch (messagekey) {
        case "Message3_DC":
            if (!bMalfunction)
                return dynamicContentObject[Object.keys(dynamicContentObject)[0]]
            if (bMalfunction)
                return dynamicContentObject[Object.keys(dynamicContentObject)[1]]
            break;
        case "Message4_DC":
            if (!bMalfunction)
                return dynamicContentObject[Object.keys(dynamicContentObject)[0]]
            if (bMalfunction)
                return dynamicContentObject[Object.keys(dynamicContentObject)[1]]

            break;
        case "Message5_DC":
            if (!bMalfunction)
                return dynamicContentObject[Object.keys(dynamicContentObject)[0]]
            if (bMalfunction)
                return dynamicContentObject[Object.keys(dynamicContentObject)[1]]

            break;
        case "Message6_DC":
            if (!bMalfunction)
                return dynamicContentObject[Object.keys(dynamicContentObject)[0]]
            if (bMalfunction)
                return dynamicContentObject[Object.keys(dynamicContentObject)[1]]

            break;
        case "Message7_DC":
            if (dynamicContent.Basic)
                return dynamicContentObject[Object.keys(dynamicContentObject)[0]]
            if (bMalfunction)
                return dynamicContentObject[Object.keys(dynamicContentObject)[1]]

            break;
        default:
            break;
    }
}

function shortenPayLoad(constants, actualPayloadObject, spiceId, typeOfCustomer, day, version, loyalty, subscriptionPlan, dynamicContent) {
    try {
        var newPayLoad = {};

        newPayLoad[constants.shortenKeys.MessageID] = actualPayloadObject && actualPayloadObject.MessageID ? actualPayloadObject.MessageID : null;
        newPayLoad[constants.shortenKeys.SpiceID] = spiceId;
        newPayLoad[constants.shortenKeys.CustomerType] = typeOfCustomer;
        newPayLoad[constants.shortenKeys.JourneyDay] = day;

        if (version)
            newPayLoad[constants.shortenKeys.ProductVersion] = version;
        if (!dynamicContent.Stream) {
            if (loyalty)
                newPayLoad[constants.shortenKeys.Loyalty] = loyalty;

            if (subscriptionPlan)
                newPayLoad[constants.shortenKeys.SubscriptionPlanType] = subscriptionPlan;
        }
        if (dynamicContent.Basic) {

            if (dynamicContent.Basic == 'True' || dynamicContent.Basic == 'true' || dynamicContent.Basic == '1') {
                newPayLoad[constants.shortenKeys.Basic] = 1;
            } else if (dynamicContent.Basic == 'False' || dynamicContent.Basic == 'false' || dynamicContent.Basic == '0') {
                newPayLoad[constants.shortenKeys.Basic] = 0;
            } else
                newPayLoad[constants.shortenKeys.Basic] = dynamicContent.Basic;
        }

        if (dynamicContent.Malfunction) {
            if (dynamicContent.Malfunction == 'True' || dynamicContent.Malfunction == 'true' || dynamicContent.Malfunction == '1') {
                newPayLoad[constants.shortenKeys.Malfunction] = 1;
            } else if (dynamicContent.Malfunction == 'False' || dynamicContent.Malfunction == 'false' || dynamicContent.Malfunction == '0') {
                newPayLoad[constants.shortenKeys.Malfunction] = 0;
            } else
                newPayLoad[constants.shortenKeys.Malfunction] = dynamicContent.Malfunction;
        }

        if (dynamicContent.Taste) {
            if (dynamicContent.Taste == 'True' || dynamicContent.Taste == 'true' || dynamicContent.Taste == '1') {
                newPayLoad[constants.shortenKeys.Taste] = 1;
            } else if (dynamicContent.Taste == 'False' || dynamicContent.Taste == 'false' || dynamicContent.Taste == '0') {
                newPayLoad[constants.shortenKeys.Taste] = 0;
            } else
                newPayLoad[constants.shortenKeys.Taste] = dynamicContent.Taste;
        }

        if (dynamicContent.Cleaning) {
            if (dynamicContent.Cleaning == 'True' || dynamicContent.Cleaning == 'true' || dynamicContent.Cleaning == '1') {
                newPayLoad[constants.shortenKeys.Cleaning] = 1;
            } else if (dynamicContent.Cleaning == 'False' || dynamicContent.Cleaning == 'false' || dynamicContent.Cleaning == '0') {
                newPayLoad[constants.shortenKeys.Cleaning] = 0;
            } else
                newPayLoad[constants.shortenKeys.Cleaning] = dynamicContent.Cleaning;
        }

        if (dynamicContent.Stream) {
            newPayLoad[constants.shortenKeys.Stream] = dynamicContent.Stream;
        }

        return newPayLoad;

    } catch (error) {
        console.log("Unable to shorten Payload due to : " + error);
        return {};
    }


}

function checkDirExistsElseCreate(dir) {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    } catch (err) {
        console.error(err);
    }
}
