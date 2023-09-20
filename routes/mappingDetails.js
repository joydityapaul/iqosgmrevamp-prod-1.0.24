const utility = require("./utility.js");
const Rules = require('../public/mapping/rules/phase-2/rules.json');
const fs = require('fs');
const constants = require('./constants.js')
let xApiKey = constants.xApiKey;
const path = require('path');
const mappingDetails = {};


mappingDetails.getMappingDetailsRenderedPage = function (req, res) {
    const temp = getMappingRenderedPage();
     res.status(200).send(temp);
}

mappingDetails.getMessageReview = function (req, res) {
    let reqBody;
    let text = req.body.text;
    let relativeFilePath = req.body.path;
    const temp = messageReview(text, relativeFilePath);
    res.status(200).send(temp);
}

mappingDetails.editMessage = function (req, res) {
    let reqBody;
    let text = req.body.text;
    let relativeFilePath = req.body.path;
    const temp = messageEdit(text, relativeFilePath);
    res.status(200).send(temp);
}

mappingDetails.getMessageRendered = function (req, res) {
    let reqBody;
    reqBody = req.body;
    const temp = messageRendered(reqBody.path);
    res.status(200).send(temp);
}

mappingDetails.getDetails = function (req, res) {
    const temp = getMappingDetails();
  
    res.status(200).send(temp);
}

mappingDetails.resGetdependentRules = function (req, res) {

    let reqBody;
    reqBody = req.body;
    const temp = getdependentRules(reqBody.messageName);
  
    res.status(200).send(temp);
}

const getMappingRenderedPage = function () {
    const temp = [];
    delete Rules["AOWelcomeDevice_Send"];
    const allRules = Object.keys(Rules);
    
    let htmlcontent ='<ol>';
    allRules.forEach(function(rule, index) {
        htmlcontent = htmlcontent + '<li> ';
        const obj = {};
        obj.rule = rule;
        obj.messages = {};
        htmlcontent = htmlcontent + '<h6 id="' + 'o-li-' + index + '" onclick="onClickListItem(event);"> ' + rule + '</h6> <ul class="display-none" id="' + 'u-li-' + index + '">';
        const manifest = utility.getManifestObj(rule);
        const allMessages = Object.keys(manifest.Messages);

        allMessages.forEach(function(message) {
            obj.messages[message] = {};
            obj.messages[message].path = manifest.Messages[message]; 
            obj.messages[message].name = manifest.Messages[message].split('/')[manifest.Messages[message].split('/').length - 1];
            obj.messages[message].type = (JSON.parse(utility.readJSONFile(manifest.Messages[message]))).type;
           
            htmlcontent = htmlcontent + '<li  id="' + message +'-'+ index  + '" data-message-path="' + obj.messages[message].path + '"' + '>';
            let pTagMessage = '<p> <span onclick="getRulesDependentOnMessage(this)" id="m-' + message +'-'+ index  + '" data-message-path="' + obj.messages[message].path + '"' + '>'+ message + '</span><a style="padding:12px" onclick="preview(this)" '+ '" data-message-path="' + obj.messages[message].path + '"' +' href="#">preview</a>' +'<p>';
            let pTagMessagePath = '<p> path-  '+ obj.messages[message].path +'<p>';
            let pTagMessageName = '<p>  name- '+ obj.messages[message].name +'<p>';
            let pTagMessageType = '<p> type- '+ obj.messages[message].type +'<p>';
            htmlcontent = htmlcontent + pTagMessage + pTagMessagePath + pTagMessageName + pTagMessageType + '</li>';
        })
        htmlcontent = htmlcontent + '</ul> ';

        temp[temp.length] = obj;
        htmlcontent = htmlcontent + '</li> ';
    });
    return `${_renderPage(htmlcontent.concat(' </ol>'))}`;
}

const getMappingDetails = function () {
    const temp = [];
    const allRules = Object.keys(Rules);
    let imageMap = [];
    allRules.forEach(function(rule) {
        const obj = {};
        obj.rule = rule;
        obj.messages = {};

        const manifest = utility.getManifestObj(rule);
        const allMessages = Object.keys(manifest.Messages);
        allMessages.forEach(function(message) {
            
            obj.messages[message] = {};
            obj.messages[message].path = manifest.Messages[message]; 
            obj.messages[message].name = manifest.Messages[message].split('/')[manifest.Messages[message].split('/').length - 1];
            obj.messages[message].type = (JSON.parse(utility.readJSONFile(manifest.Messages[message]))).type;
            
            filePath = path.join(__dirname, "../", obj.messages[message].path);
            
            const fileData = fs.readFileSync(filePath, 'utf8');
            let content, parsedData;

            try {
                parsedData = JSON.parse(fileData);
            } catch (error) {
                console.log(`Error in Parsing Log File ${filePath} : ${error}`);
            }

            
            if (parsedData.type === 'flex') {
                if (parsedData.contents.type === 'bubble' && !parsedData.contents.hero) {
                    content = parsedData.contents.body.contents;
                    
                content.forEach((cont) => {
                    if (cont.type === 'image') {
                        imageMap.push(obj.messages[message].path + cont.url);
                    } 
                });
                } 

            }  

            
        })
       
    });
     
    return imageMap;
}

const getdependentRules = function (messageName) {
    const temp = [];
    const allRules = Object.keys(Rules);
    allRules.forEach(function(rule) {
        const obj = {};
        obj.rule = rule;
        obj.messages = {};

        const manifest = utility.getManifestObj(rule);
        const allMessages = Object.keys(manifest.Messages);
        allMessages.forEach(function(message) {
            const relativeFilePath =   manifest.Messages[message];
            
            if (relativeFilePath === messageName) {
                temp[temp.length] = obj.rule;
                return temp; 
            } 
          })
    });
     
    return temp;
}


const messageRendered = function (relativeFilePath) {

    filePath = path.join(__dirname, "../", relativeFilePath);
            
            const fileData = fs.readFileSync(filePath, 'utf8');
            let qReply = [], content, parsedData, forminputElement;

            try {
                parsedData = JSON.parse(fileData);
            } catch (error) {
                console.log(`Error in Parsing Log File ${filePath} : ${error}`);
            }

          

             if (parsedData.type === 'flex') {
                if (parsedData.contents.type === 'bubble' && !parsedData.contents.hero) {
                    content = _getBubble(parsedData.contents.body.contents);
                } else if (parsedData.contents.type === 'bubble' && parsedData.contents.hero) {
                    content = _getProductBubble(parsedData);
                } else if (parsedData.contents.type === 'carousel') {
                    content = _getCarousel(parsedData);
                } else {
                    content = `<div class="message alert alert-success">Flex Message - Please Check App</div>`;
                }
            } 
            if (parsedData.type === 'image') {
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

            if (parsedData.type === 'text') {
                const regex = /\n/g;;
                let parsedText = parsedData.text.replace(regex, '\\n');
                forminputElement = `<textarea class="message" name="text">${parsedText}</textarea>`;
            }


            return _getRenderedMessage(content, relativeFilePath, qReply, forminputElement);




}


const messageReview = function (text, relativeFilePath) {
    const regex = /\\n/g;;
    text = text.replace(regex, '\n');

    filePath = path.join(__dirname, "../", relativeFilePath);
            
            const fileData = fs.readFileSync(filePath, 'utf8');
            let qReply = [], content, parsedData, forminputElement;

            try {
                parsedData = JSON.parse(fileData);
            } catch (error) {npm 
                console.log(`Error in Parsing Log File ${filePath} : ${error}`);
            }

          

            if (parsedData.type === 'text') {
                content = `<div class="message alert alert-success">${text}</div>`;
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


            return _getReviewMessage(content, relativeFilePath, qReply);



}



const messageEdit = function (text, relativeFilePath) {
    const regex = /\\n/g;;
    text = text.replace(regex, '\n');

    filePath = path.join(__dirname, "../", relativeFilePath);
            
            const fileData = fs.readFileSync(filePath, 'utf8');
            let qReply = [], content, parsedData, forminputElement;

            try {
                parsedData = JSON.parse(fileData);
            } catch (error) {
                console.log(`Error in Parsing Log File ${filePath} : ${error}`);
            }

          
            parsedData.text = text;
            

            try {
                data = JSON.stringify(parsedData);
                fs.writeFileSync(filePath, data, 'utf8');
                return "Edited";
            } catch (error) {
                return `Error in editing ${relativeFilePath} : ${error}`;
                console.log(`Error in Parsing Log File ${filePath} : ${error}`);
            }
        

            

}





function _getFilename(url) {
    return url.split('/').pop();
}



module.exports = mappingDetails;

function _getBubble(contents) {
    let bubble = [];
    contents.forEach((cont, index) => {
        let css = _getCSS(cont);
        if (cont.type === 'image') {
            bubble.push(`<img src="${cont.url}"/>`);
        } else if (cont.type === 'box' && cont.action.type === 'postback') {
            bubble.push(`<button type="button" class="qReply" style="${css}" data-qr='${decodeURIComponent(cont.action.data)}'>Button${index}</button>`);
        } else if (cont.type === 'box' && cont.action.type === 'uri') {
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
            <div class="split left">
            
                <div class="container pt-4">
                   ${pageContent}
            
                 </div>
            </div>
            <div class="split right">
            <div class="container pt-4">
             <div id="previewMessage"></div>
            
                 </div>
            
            </div>
        </body>
    </html>
    `;
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

        .display-none {
            display: none;
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
        .split {
            height: 100%;
            width: 50%;
            position: fixed;
            z-index: 1;
            top: 0;
            overflow-x: hidden;
            padding-top: 20px;
          }
          
          .left {
            left: 0;
            
          }
          
          .right {
            right: 0;
            
          }
          
          .centered {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
          }
          
          .centered img {
            width: 150px;
            border-radius: 50%;
          }

         

    </style>
    `;
}

function _getScripts() {
    return `
    <script>
         
        function onClickListItem(event) {
            $("#" + event.target.id.replace('o', 'u')).toggle();
        }

        function getRulesDependentOnMessage(messageData){
            var dataMessage = messageData.getAttribute("data-message-path");
            var getrules =  $.ajax({
                type: 'POST',
                url: '/resGetdependentRules/',
                data: JSON.stringify ({messageName: dataMessage}), 
                success: function(data) {  
                    document.getElementById("previewMessage").innerHTML = data;
                    console.log("data =" , data); 
                },
                contentType: "application/json"
            });

            console.log("dataMessage" + dataMessage);
        }
       
        function preview(messageData){
            var dataMessage = messageData.getAttribute("data-message-path");
            var getrules =  $.ajax({
                type: 'POST',
                url: '/getMessageRendered/',
                data: JSON.stringify ({path: dataMessage}), 
                success: function(data) {  
                                       
                    document.getElementById("previewMessage").innerHTML = data;
                    
                },
                contentType: "application/json"
               
            });

            console.log("dataMessage" + dataMessage);
        } 

        function getMessageReview(e) {
            var frm = $('#reviewMessage');
            e.preventDefault();
    
            $.ajax({
                type: 'POST',
                url: '/getMessageReview',
                data: frm.serialize(),
                success: function (data) {
                    document.getElementById("result").innerHTML = data;
                },
                error: function (data) {
                    console.log('An error occurred.');
                    console.log(data);
                },
            });
         }

         function edit(e) {
            var frm = $('#reviewMessage');
            e.preventDefault();
    
            $.ajax({
                type: 'POST',
                url: '/editMessage',
                data: frm.serialize(),
                success: function (data) {
                    document.getElementById("result").innerHTML = data;
                },
                error: function (data) {
                    console.log('An error occurred.');
                    console.log(data);
                },
            });
         }

    </script>`;
}

function _getRenderedMessage(content, fileName, qReply, forminputElement) {

    let msgdiv = `
    <div style="margin-bottom: 28px;">
        <div class="alert alert-warning alert-dismissible fade show">
            <a class="alert-link" href="#" style="font-size:11px;">${fileName}</a>
        </div>
       
        ${content ? `${content}`: ``}
        ${qReply.length ? `<div style="margin-top: 8px;">${qReply.join('')}</div>`: ``}
    </div> `;

    let formDiv = `<div>
    <form id="reviewMessage">
       ${forminputElement}
       <input type="text" class="message " name="path" value=${fileName} hidden>
       <input type="submit" value="review" onclick="getMessageReview(event)">
       <button type="button" onclick="edit(event)">Edit</button>
     </form>
     
</div>
<div id="result"></div>`;

if (forminputElement) {
    return msgdiv + formDiv
}
else { return msgdiv;

}
    
}

function _getReviewMessage(content, fileName, qReply) {

    return`
        <div style="margin-bottom: 28px;">
            <div class="alert alert-warning alert-dismissible fade show">
                <a class="alert-link" href="#" style="font-size:11px;">${fileName}</a>
            </div>
            ${content.length ? `${content}`: ``}
            ${qReply.length ? `<div style="margin-top: 8px;">${qReply.join('')}</div>`: ``}
           
        </div>
        `;
    
}