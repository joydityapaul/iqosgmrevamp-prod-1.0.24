const fs = require('fs');
const Client = require('ssh2-sftp-client');
const { formattedTimeObj } = require('./utility');

const sftp = new Client();

module.exports = {
    pushLogFileOnFTPLocation: function (constants, remoteDir, FTPCTAFilePath, LocalLogCTAFilePath, FTPFilePath, LocalLogFilePath, FTPPrimaryFilePath, LocalLogPrimaryFilePath) {
        const remoteDirectory = remoteDir;
        const remote = FTPFilePath.replace('.csv', `_${formattedTimeObj().CurrentDate}.csv`);
        const remoteCta = FTPCTAFilePath.replace('.csv', `_${formattedTimeObj().CurrentDate}.csv`);
        const remotePrimaryMsg = FTPPrimaryFilePath.replace('.csv', `_${formattedTimeObj().CurrentDate}.csv`);

        let logFileContent;
        let ctaLogFileContent;
        let primaryMsgLogFileContent;

        if (fs.existsSync(LocalLogFilePath)) {
            logFileContent = fs.createReadStream(LocalLogFilePath);
        }
        if (fs.existsSync(LocalLogCTAFilePath)) {
            ctaLogFileContent = fs.createReadStream(LocalLogCTAFilePath);
        }

        if (fs.existsSync(LocalLogPrimaryFilePath)) {
            primaryMsgLogFileContent = fs.createReadStream(LocalLogPrimaryFilePath);
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
                if (logFileContent)
                    return sftp.put(logFileContent, remote);
                return Promise.resolve(true)
            })
            .then(() => {
                if (ctaLogFileContent)
                    return sftp.put(ctaLogFileContent, remoteCta);
                return Promise.resolve(true)
            })
            .then(() => {
                if (primaryMsgLogFileContent)
                    return sftp.put(primaryMsgLogFileContent, remotePrimaryMsg);
                return Promise.resolve(true)
            })
            .then(() => {
                if (fs.existsSync(LocalLogFilePath)) {
                    fs.unlinkSync(LocalLogFilePath);
                }
                if (fs.existsSync(LocalLogCTAFilePath)) {
                    fs.unlinkSync(LocalLogCTAFilePath);
                }
                if (fs.existsSync(LocalLogPrimaryFilePath)) {
                    fs.unlinkSync(LocalLogPrimaryFilePath);
                }
            })
            .then(() => {
                console.log("CTA logs pushed successfully.");
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
    }
}