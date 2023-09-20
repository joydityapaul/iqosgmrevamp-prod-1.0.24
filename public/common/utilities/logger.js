
const constants = require("../../../routes/constants");
const utility = require("../../../routes/utility.js");
var express = require('express'); var app = express();

const loggingMode = constants.getLoggerMode;
const logError = function (error = '', errorMessage = '', journeyType = 'Error', errorType = "NA", otherData = {}) {
    // if (app.get('logs') === 'both' || app.get('logs') === 'error') {
    if (loggingMode === 'both' || loggingMode === 'error') {
        errorL = [];
        try {
            errorL.push(JSON.stringify({
                ...utility.formattedTimeObj(),
                ...{
                    "ErrorMessage": errorMessage,
                    "Error": error
                },
                ...otherData
            }, null, 2));
            utility.errorLogMessage(journeyType, errorType, errorL.join('\n'));
        } catch (error) {
            errorL.push(JSON.stringify({
                "ErrorMessage": constants.errorLogMessage.ErrorInLogging,
                "Error": error
            }));
            utility.errorLogMessage('ErrorInLogging', errorType, errorL.join('\n'));
        }
    }
}

const logInfo = function (info = '', infoMessage = '', journeyType = 'Info', infoType = "NA", otherData = {}) {
    // if (app.get('logs') === 'both' || app.get('logs') === 'info') {
    if (loggingMode === 'both' || loggingMode === 'info') {
        infoL = [];
        try {
            infoL.push(JSON.stringify({
                ...utility.formattedTimeObj(),
                ...{
                    infoMessage,
                    info
                },
                ...otherData
            }, null, 2));
            utility.infoLogMessage(journeyType, infoType, infoL.join('\n'));
        } catch (error) {
            infoL.push(JSON.stringify({
                "ErrorMessage": constants.errorLogMessage.ErrorInLogging,
                "Error": error
            }));
            utility.errorLogMessage('Error: In info-logging', infoType, infoL.join('\n'));
        }
    }
}


module.exports = {
    logError,
    logInfo
}