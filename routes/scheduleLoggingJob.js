const pushLogFileOnFTPLocation = require('./pushLogFileOnFTPLocation.js')
const constants = require('./constants.js');
const Path = require('path');
const schedule = require('node-schedule');
const renderLog = require('./renderLog');

let scheduleObject = constants.getCofigValue;
const fs = require('fs');
var path = require('path');


const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [0, new schedule.Range(0, 7)];
rule.hour = [0, new schedule.Range(0, 24)];
rule.minute = scheduleObject ? scheduleObject.scheduleMinute : 15;
// In qa, job will run at 15th minute of every hour and In prod, job will run at 45th minute of every hour.Time is according ec2 instance clock

// rule.minute = new schedule.Range(0, 59, 1);  /* runs the cron job for every 1mins */

function deleteStaleFilesFromDir(logDir, offset) {
    const numberOfDaysInMS = offset * 86400000;
    fs.readdir(logDir, function (err, files) {

        if (err)
            console.log(err);
        else {

            files.forEach(function (file, index) {
                fs.stat(path.join(logDir, file), function (err, stat) {
                    var endTime, now;
                    if (err) {
                        return console.error(err);
                    }
                    now = new Date().getTime();
                    endTime = new Date(stat.ctime).getTime() + numberOfDaysInMS;
                    if (now > endTime) {
                        const filepath = path.join(logDir, file);
                        if (fs.existsSync(filepath)) {
                            fs.unlinkSync(filepath);
                        }
                    }
                });
            });
        }
    });
}

module.exports = {
    scheduleLoggingJob: function () {
        const remoteDir = constants.remoteDir;
        const filepath = Path.join(...constants.publicPath, constants.logFileParentFolder, constants.IQOSGM_RevampJourneyLineMessageLog);
        const CTAfilepath = Path.join(...constants.publicPath, constants.logFileParentFolder, constants.IQOSGM_RevampJourneyLineMessageCTALog);
        const PrimaryMsgfilepath = Path.join(...constants.publicPath, constants.logFileParentFolder, constants.IQOSGM_RevampJourneyLinePrimaryMessageLog);
        const FTPFilePath = Path.join(remoteDir, constants.IQOSGM_RevampJourneyLineMessageLog);
        const FTPCTAFilePath = Path.join(remoteDir, constants.IQOSGM_RevampJourneyLineMessageCTALog);
        const FTPPrimaryMsgFilePath = Path.join(remoteDir, constants.IQOSGM_RevampJourneyLinePrimaryMessageLog);


        schedule.scheduleJob(rule, () => {
            try {
                // delete the stale logs if any
                deleteStaleFilesFromDir('infolog', constants.fileAgeInDays)
                deleteStaleFilesFromDir('errorlog', constants.fileAgeInDays)

                pushLogFileOnFTPLocation.pushLogFileOnFTPLocation(constants, remoteDir, FTPCTAFilePath, CTAfilepath, FTPFilePath, filepath, FTPPrimaryMsgFilePath, PrimaryMsgfilepath);
            } catch (error) {
                console.log("Error in CSV log upload" + error);
            }
        });
    }
}