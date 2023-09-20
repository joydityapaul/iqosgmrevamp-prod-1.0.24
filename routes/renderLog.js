const fs = require('fs');
const path = require('path');
const constants = require('./constants.js')
let xApiKey = constants.xApiKey;
// console.log('-------' + xApiKey + '-------');

function _getInternalCSS() {
    return `
    <style>
        a.t {
            background: #dcdcdc;
            display: inline-block;
            padding: 6px;
            border-radius: 4px;
            transition: all 0.3s;
        }

        a.t:hover {
            box-shadow: 0px 3px 0px #0000004f;
        }

        .message {
            width: 400px;
            padding: 5px;
        }

        .message.bubble {
            position: relative;
            width: 250px;
        }

        .message.bubble img {
            width: 100%;
        }

        .message.bubble button,
        .message.bubble a {
            display: block;
            opacity: 0.2;
            cursor: pointer;
        }
        .opacity-1 {
            opacity: 1 !important;
        }

        .carousel {
            width: 800px;
            white-space: nowrap;
            overflow: hidden;
            overflow-x: auto;
        }

        .carousel .message {
            display: inline-block;
        }

        body {
            font-size: 12px;
        }

        .alert {
            margin-bottom: 12px;
            padding: 8px 10px;
        }

        .alert-dismissible .close {
            padding: 2px 8px;
        }

        .btn-info {
            font-size: 12px;
            padding: 2px 8px;
        }

        .log-block {
            border-top: 4px solid #17a2b8;
            margin-top: 20px;
            margin-bottom: 100px;
            position: relative;
        }

        .log-heading {
            margin-top: -17px;
            background: #fff;
            display: inline-block;
            padding-right: 20px;
            margin-bottom: 20px;
            color: #17a2b8;
        }

        .clearall-btn {
            position: absolute;
            top: -18px;
            right: 0px;
            padding-left: 20px;
            background: #fff;
        }
    </style>
    `;
}

function _getScripts() {
    return `
    <script>
        $(document).ready(function() {
            $('.qReply').on('click', function() {
                var $this = $(this);
                $.ajax({
                    url: '/api/sfmc/sendgmrevampLineMsg',
                    type: 'POST',
                    headers: {
                        "x-api-key": "${xApiKey}"
                    },
                    data: JSON.parse($this.data('qr').split('ib://salesforce/transfer/gmrevamp?').pop())
                }).done(function(data) {
                    if(data.success) {
                        window.location.reload();
                    } else {
                        alert(JSON.stringify(data));
                    }
                });
            });
        });
        function clearlog(logFile, dir) {
            var result = confirm("Are you sure? you want to delete - " + logFile);
            if(result) {
                $.post("/clearLog",{logFile: logFile, dir: dir}, function(data){
                    if(data.success) {
                        window.location.reload();
                    } else {
                        alert(JSON.stringify(data));
                    }
                });
            }
        }
    </script>`;
}

const _getAllFiles = function (dirPath, arrayOfFiles) {
    let files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(function (file) {
        arrayOfFiles.push(path.join(__dirname, "../", dirPath, "/", file));
    });
    return arrayOfFiles;
}

function _getFilename(url) {
    return url.split('/').pop();
}

function _getCSS(cont) {
    let style = `width: ${cont.width}; height: ${cont.height}; position: ${cont.position};`
    if (cont.offsetTop) {
        style = `${style} top: ${cont.offsetTop};`;
    }
    if (cont.offsetStart) {
        style = `${style} left: ${cont.offsetStart};`;
    }
    if (cont.offsetEnd) {
        style = `${style} right: ${cont.offsetEnd};`;
    }
    if (cont.offsetBottom) {
        style = `${style} bottom: ${cont.offsetBottom};`;
    }
    return style;
}

function _renderLogs(logObj) {
    let logs = []
    for (const spiceId in logObj) {
        const spiceIdLog = logObj[spiceId];
        logs.push(`
        <div class="log-block">
            <h4 class="text-center log-heading">LOGS FOR - ${spiceIdLog.spiceId}</h4>
            <div class="clearall-btn">
                <button class="btn btn-danger" style="font-size: 12px;" onclick="clearlog(${spiceIdLog.spiceId});">Clear all logs</button>
            </div>
            ${spiceIdLog.logMessages.join('')}
        </div>`);
    }
    return !logs.length ? `<div class="alert alert-danger text-center" style="font-size: 16px;">No Logs Found</div>` : logs.join('');
}

function _getBubble(contents) {
    let bubble = [];
    contents.forEach((cont, index) => {
        let css = _getCSS(cont);
        if (cont.type === 'image') {
            bubble.push(`<img src="${cont.url}"/>`);
        } else if (cont.type === 'box' && cont.action && cont.action.type === 'postback') {
            bubble.push(`<button type="button" class="qReply" style="${css}" data-qr='${decodeURIComponent(cont.action.data)}'>Button${index}</button>`);
        } else if (cont.type === 'box' && cont.action && cont.action.type === 'uri') {
            bubble.push(`<a style="${css}" href="${cont.action.uri}">Button${index}</a>`);
        }
    });
    return `<div class="message bubble alert alert-success">${bubble.join('')}</div>`;
}

function _getProductBubble(parsedData) {
    let msgData = [];
    msgData.push(`<div><img src="${parsedData.contents.hero.url}"/></div>`);
    parsedData.contents.body.contents.forEach((cont) => {
        if (cont.action && cont.action.type === 'uri') {
            msgData.push(`<div class="mt-2" style="text-align: ${cont.align}; font-size: ${cont.size || '12px'}; font-weight: ${cont.weight || 'normal'}; color: ${cont.color || ''}"><a class="opacity-1" href="${cont.action.uri}" style="text-align: ${cont.align}; font-weight: ${cont.weight || 'normal'}; color: ${cont.color || ''}">${cont.text}</a></div>`);
        } else {
            msgData.push(`<div class="mt-2" style="text-align: ${cont.align}; font-size: ${cont.size || '12px'}; font-weight: ${cont.weight || 'normal'}; color: ${cont.color || ''}"><span>${cont.text}</span></div>`);
        }
    });
    return `<div class="message bubble alert alert-success">${msgData.join('')}</div>`;
}

function _getCarousel(parsedData) {
    let msgData = [];
    parsedData.contents.contents.forEach((bubble) => {
        msgData.push(_getBubble(bubble.body.contents));
    });
    return `<div class="carousel">${msgData.join('')}</div>`;
}

function _getRenderedMessage(content, fileName, qReply) {

    return `
        <div style="margin-bottom: 28px;">
            <div class="alert alert-warning alert-dismissible fade show">
                <a class="alert-link" href="/log/${fileName}" style="font-size:11px;">${fileName}</a><button class="close" onclick="clearlog('${fileName}');">&times;</button>
            </div>
            ${content}
            ${qReply.length ? `<div style="margin-top: 8px;">${qReply.join('')}</div>` : ``}
        </div>
        `;

}

function _renderPage(pageContent) {
    return `
    <!DOCTYPE html>
    <html>
        <head>
            <title>IQOS Message Logs</title>
            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" integrity="sha384-JcKb8q3iqJ61gNV9KGb8thSsNjpSL0n8PARn9HuZOnIxN0hoP+VmmDGMN5t9UJ0Z" crossorigin="anonymous">
            ${_getInternalCSS()}
            <script src="https://code.jquery.com/jquery-3.5.1.min.js" integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=" crossorigin="anonymous"></script>
            ${_getScripts()}
        </head>
        <body>
            <div class="container pt-4">
                ${pageContent}
            </div>
        </body>
    </html>
    `;
}

function _getFileAge(fileCreationTime) {
    fileCreationTime = new Date(fileCreationTime);
    let currentTime = new Date();
    return (currentTime.getTime() - fileCreationTime.getTime()) / 1000;
}

function _clearLogs(dir, logFile, allowedFileAgeinSeconds) {
    let files = fs.readdirSync(dir);
    for (const file of files) {
        if (file.includes(logFile) || logFile === 'All') {
            if (allowedFileAgeinSeconds) {
                let fileStatus = fs.statSync(path.join(dir, file));
                let fileAge = _getFileAge(fileStatus.ctime);
                if (fileAge > allowedFileAgeinSeconds) {
                    fs.unlinkSync(path.join(dir, file));
                }
            } else {
                fs.unlinkSync(path.join(dir, file));
            }
        }
    }
}

module.exports = {
    msgLog: (req, res) => {
        let logObject = {},
            allLogFiles = _getAllFiles('./log');

        allLogFiles.forEach((filePath) => {
            const fileName = _getFilename(filePath);
            const spiceId = fileName.split('_')[0];
            const fileData = fs.readFileSync(filePath, 'utf8');
            let qReply = [], content, parsedData;

            try {
                parsedData = JSON.parse(fileData);
            } catch (error) {
                console.log(`Error in Parsing Log File ${filePath} : ${error}`);
            }

            logObject[spiceId] = logObject[spiceId] || {
                spiceId: spiceId,
                logMessages: []
            };

            if (parsedData.type === 'text') {
                content = `<div class="message alert alert-success">${parsedData.text}</div>`;
            } else if (parsedData.type === 'flex') {
                if (parsedData.contents.type === 'bubble' && !parsedData.contents.hero) {
                    content = _getBubble(parsedData.contents.body.contents);
                } else if (parsedData.contents.type === 'bubble' && parsedData.contents.hero) {
                    content = _getProductBubble(parsedData);
                } else if (parsedData.contents.type === 'carousel') {
                    content = _getCarousel(parsedData);
                } else {
                    content = `<div class="message alert alert-success">Flex Message - Please Check App</div>`;
                }
            } else if (parsedData.type === 'image') {
                content = `<div class="message bubble  alert alert-success"><img src="${parsedData.originalContentUrl.replace('Images', 'Images/Images')}" width="200px"/></div>`;
            }

            if (parsedData.quickReply) {
                parsedData.quickReply.items.forEach((reply) => {
                    let replyElem;
                    if (reply.action.type === 'postback') {
                        replyElem = `<button class="qReply btn btn-info" type="button" data-qr='${decodeURIComponent(reply.action.data)}'>${reply.action.label}</button>&nbsp;`;
                    } else if (reply.action.type === 'uri') {
                        replyElem = `<a class="btn btn-info" href="${reply.action.uri}">${reply.action.label}</a>&nbsp;`;
                    }
                    qReply.push(replyElem);
                });
            }
            logObject[spiceId].logMessages.push(_getRenderedMessage(content, fileName, qReply));
        });
        res.status(200).send(`${_renderPage(_renderLogs(logObject))}`);
    },
    errorlog: (req, res) => {
        let errorLogsRedirectionLink = [],
            allErrorFiles = _getAllFiles('./errorlog');
        allErrorFiles.forEach((filePath) => {
            const fileName = _getFilename(filePath);
            errorLogsRedirectionLink.push(`<li><a style="font-size: 14px;" class="btn btn-link" href="/errorlog/${fileName}" style="font-size:11px;">${fileName}</a></li>`);
        });
        res.status(200).send(`${_renderPage(`${errorLogsRedirectionLink.length ? `<button class="btn btn-danger float-right" onclick="clearlog('All', './errorlog');">Clear All Error Logs</button><ol>${errorLogsRedirectionLink.join('')}</ol>` : `<div class="alert alert-danger text-center" style="font-size: 16px;">No Error Logs Found</div>`}`)}`);
    },
    infolog: (req, res) => {
        let infoLogsRedirectionLink = [];
        let allInfoFiles = _getAllFiles('./infolog');
        for (let index = 0; index < allInfoFiles.length; index++) {
            const filePath = allInfoFiles[index];
            const fileName = _getFilename(filePath);
            infoLogsRedirectionLink.push(`<li><a style="font-size: 14px;" class="btn btn-link" href="/infolog/${fileName}" style="font-size:11px;">${fileName}</a></li>`);
        }
        res.status(200).send(`${_renderPage(`${infoLogsRedirectionLink.length ? `<button class="btn btn-danger float-right" onclick="clearlog('All', './infolog');">Clear All Info Logs</button><ol>${infoLogsRedirectionLink.join('')}</ol>` : `<div class="alert alert-danger text-center" style="font-size: 16px;">No Error Logs Found</div>`}`)}`);
    },
    clearLogs: (dir, fileAge) => {
        _clearLogs(dir, "All", fileAge);
    },
    clearLog: function (req, res) {
        const dir = req.body.dir || './log';
        _clearLogs(dir, req.body.logFile);
        res.send({
            "success": true
        });
    }
};