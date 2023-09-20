const constants = require("./constants.js");
const utility = require("./utility.js");
const Path = require("path");
const fs = require('fs');
var request = require('request');
const {
  SendLineMessageSync, SendIS_Sync
} = require("./lineApiResponse.js");

const JWT = require(Path.join(__dirname, "..", "lib", "jwtDecoder.js"));
const writeCTALogInCSVFile = require('./writeLogInCSVFile.js');
const GMRevampRules = require('../public/mapping/rules/GMRevamp/rules.json');
const GMRevampRulesConfig = require('../public/common/GMRevamp-config.json');


const Enum = require('../public/common/enum/messageType');
const Logger = require('../public/common/utilities/logger');

const messageRefreshService = require('../public/common/utilities/GMRevamp-jsonrefresh.js');
const importDRM_FTPFileService = require('../public/common/utilities/importDRM_FTPFile');




// method will be used to send messages based on delay property which is 0 default ie no delay, (primary & secondary)
const sendMessages = async function (payLoad, messagesConfig, messageType, rule, res, ctaLog = null) {

  return new Promise(async (resolve, reject) => {
    await createGroupsBasedOnDelay(messagesConfig).then(async (groups) => {
      const allGroups = Object.keys(groups);
      await allGroups.forEach(async (group) => {

        try {
          let messageSet = {};
          let index = 0;
          groups[group].forEach(item => {
            messageSet[index.toString()] = item.config.content;
            index += 1;
          });
          await timeout(parseInt(group));

          const resx = await sendMessagesBasedOnDelay(payLoad, messageSet, messageType, rule, res, ctaLog);

          resolve({
            "success": resx.success,
            "message": allGroups.length > 1 ? 'Some of the messages are in delay' : 'Successfully sent'
          });
        } catch (error) {
          reject({
            "success": false,
            "message": 'Something went wrong.' + error.message
          });
        }

      });

    })
  })

}

// create centralized action object for line message
function createPayload(productBaseURL, payLoad, action) {
  let spiceId = payLoad.spice_id || payLoad.SID,
    lastName = payLoad.lname || payLoad.c_LN,
    firstName = payLoad.c_fname || payLoad.c_FN,
    journey = payLoad.journey || payLoad.c_J,
    SegmentName = payLoad.SegmentName || payLoad.s_N;

  let objectToParse = JSON.stringify(constants.PostbackDataCTA);
  objectToParse = objectToParse.replace('##action##', action)
  objectToParse = objectToParse.replace('##spiceId##', spiceId)
  objectToParse = objectToParse.replace('##lastName##', lastName)
  objectToParse = objectToParse.replace('##firstName##', firstName)
  objectToParse = objectToParse.replace('##journey##', journey)
  objectToParse = objectToParse.replace('##segmentName##', SegmentName)
  const payLoadurl = `${productBaseURL}${encodeURIComponent(objectToParse)}`;
  return payLoadurl;

}

// create primary msg payload
function primaryMsgPayloadLog(Spice_ID, Action, Journey, SegmentName, OtherInfo) {
  let primaryMsgRef = {
    Spice_ID: Spice_ID,
    Action: Action,
    Journey: Journey,
    SegmentName: SegmentName,
    DateTime: new Date().toUTCString(),
    OtherInfo: OtherInfo
  };
  return primaryMsgRef;

}

// function will be used to replace dynaimc content in JSON messages based on IS response.

async function fetchDataFromISResponse(payLoad, messages, messageType, rule, sync, response_ISObj, needCSVLogs) {
  let msg = [],
    spiceId = payLoad.spice_id || payLoad.SID,
    action = payLoad.action,
    c_loyaltyE = payLoad.c_loyalty || payLoad.c_L,
    firstName = payLoad.c_fname || payLoad.c_FN,
    lastName = payLoad.lname || payLoad.c_LN,
    day = payLoad.c_day || payLoad.c_D,
    journey = payLoad.journey || payLoad.c_J,
    SegmentName = payLoad.SegmentName || payLoad.s_N;
   

  

  // this is getting used for Send & CTA logs 
  let mappedPropertiesRef = {
    Spice_ID: spiceId,
    Action: action,
    Journey: journey,
    Loyalty: c_loyaltyE,
    Day: day,
    Discount: null,
    Product_Family: "",
    Product_Color: "",
    ML_Asset: "",
    ML_Tracking: '',
    Microsegment: '',
    Lifestage: '',
    //Product_Name: '',
    SegmentName: SegmentName
  }

  return new Promise(async (resolve, reject) => {
    const responsePayloadIS = (response_ISObj.campaignResponses[0] && response_ISObj.campaignResponses[0].payload) || '';

    
    if(!lastName || lastName == "")
    {
      lastName = responsePayloadIS.userLastname;
      payLoad.lname = lastName;
      payLoad.c_LN = lastName;
    }
    if(!firstName || firstName == ""){
      firstName =  responsePayloadIS.userFirstName;
      payLoad.c_fname = firstName;
      payLoad.c_FN = firstName;
    }
    // S3 bucket images
    const baseurl = constants.getS3BaseURL;
   
    for (const message in messages) {

      let pathProp = 'path';
      let messageStr = '';
      let messagePath='';

      if (messages[message][pathProp].indexOf('##userInterestsSurvey##') > 0 && responsePayloadIS){
   
          // ----  STARTS -- batch 2 and 4 existingDiff specific case   
          if(action == "PackCodes" && responsePayloadIS.userInterestsSurvey && responsePayloadIS.userInterestsSurvey == "InsertCigarette"){
            messagePath = messages[message][pathProp].replace('##userInterestsSurvey##', responsePayloadIS.userInterestsSurvey);
            messageStr = utility.readJSONFile(messagePath);
          }
          else if(action.includes("IQOSSpot") && responsePayloadIS.userInterestsSurvey && responsePayloadIS.userInterestsSurvey == "DeviceFirmware"){
            messagePath = messages[message][pathProp].replace('##userInterestsSurvey##', responsePayloadIS.userInterestsSurvey);
            messageStr = utility.readJSONFile(messagePath);
          }
          else if(action == "PackCodes" && responsePayloadIS.userInterestsSurvey && responsePayloadIS.userInterestsSurvey == "InsertCigarette|DeviceFirmware"){
            let userInterestsSurveyArray= responsePayloadIS.userInterestsSurvey.split("|");
            messagePath = messages[message][pathProp].replace('##userInterestsSurvey##', userInterestsSurveyArray[0]);
            messageStr = utility.readJSONFile(messagePath);
          }
          else if(action.includes("IQOSSpot") && responsePayloadIS.userInterestsSurvey && responsePayloadIS.userInterestsSurvey == "InsertCigarette|DeviceFirmware"){
            let userInterestsSurveyArray= responsePayloadIS.userInterestsSurvey.split("|");
            messagePath = messages[message][pathProp].replace('##userInterestsSurvey##', userInterestsSurveyArray[1]);
            messageStr = utility.readJSONFile(messagePath);
          }
          else{
            messagePath = messages[message][pathProp].replace('##userInterestsSurvey##', "WithOutLastCard");
            messageStr = utility.readJSONFile(messagePath);
          }
          // ----  ENDS --  batch 2 and 4 existingDiff specific case
      }
      else {
        messageStr = utility.readJSONFile(messages[message][pathProp]);
      }

    
      if (messageStr) {
        
        let personalizedMessageStr = messageStr;
       
        // for s3 bucket URL
        personalizedMessageStr = personalizedMessageStr.replace((new RegExp("##base_url##", 'g')), baseurl);
     
        if(personalizedMessageStr.includes("##name##")){     
            if (firstName != null && firstName != "") {
              personalizedMessageStr = personalizedMessageStr.replace(new RegExp("##name##", 'g'), firstName);
            } else if (lastName != null && lastName != "") {
              personalizedMessageStr = personalizedMessageStr.replace(new RegExp("##name##", 'g'), lastName);
            }
            else{
              personalizedMessageStr = personalizedMessageStr.replace(new RegExp("##name##", 'g'), 'お客');
            }
        }
        
        // personalizedMessageStr = personalizedMessageStr.replace((new RegExp("##envURL##",'g')),`https://jp.${constants.envWebURL}.com`)


        if (responsePayloadIS) {

          personalizedMessageStr = personalizedMessageStr.replace((new RegExp("##promoted_image##", 'g')), responsePayloadIS.promotionImageUrl);
          personalizedMessageStr = personalizedMessageStr.replace((new RegExp("##promoUrl##", 'g')), responsePayloadIS.promoUrl);
         
          mappedPropertiesRef['ML_Asset'] = responsePayloadIS.promotionImageUrl;
         
          //--STARTS --batch 2 TobaccoCarousel specific case personalization - NDR and RegisteredNew
          if(responsePayloadIS.userTobaccoSurvey && responsePayloadIS.userTobaccoSurvey.length>0 && personalizedMessageStr.includes("##userTobaccoSurvey##")){
           
            const userTobaccoSurveyArray = responsePayloadIS.userTobaccoSurvey.split("|");
            //userTobaccoSurveyArray contains 4 flavours for which cards need to be displayed in Line
            //userTobaccoSurvey attribute also includes the default case of mid/prime and one devices .Thr logic is already handled by server side template
            userTobaccoSurveyArray.forEach((name) => {
              personalizedMessageStr = personalizedMessageStr.replace((new RegExp("##userTobaccoSurvey##")), GMRevampRulesConfig["userTobaccoSurveyMapping"][name]);
              personalizedMessageStr = personalizedMessageStr.replace((new RegExp("##userTobaccoSurveyUrl##")), GMRevampRulesConfig["userTobaccoSurveyUrlMapping"][name]);

              // UTM - Tracking
              if (personalizedMessageStr.includes('##utm_content##')) {
                personalizedMessageStr = personalizedMessageStr.replace((new RegExp("##utm_content##")), GMRevampRulesConfig["UTMContentMapping"][name]);
              }
            });
          }
          //--ENDS --batch 2 TobaccoCarousel specific case personalization - NDR and RegisteredNew
          
        }
       
        // logic to convert ##action## to payload which will postback and will be used for sending secondary messages when it hit secondary message Api
        while (personalizedMessageStr.indexOf("##ACTION##") >= 0) {
          let firstOccr = personalizedMessageStr.substring(personalizedMessageStr.indexOf('##ACTION##') + '##ACTION##'.length);
          let nextAction = firstOccr.substring(0, firstOccr.indexOf('##ACTION##'));
          // process action
          
          const getDataObject = createPayload(constants.payloadHeader, payLoad, nextAction);
          personalizedMessageStr = personalizedMessageStr.replace(`##ACTION##${nextAction}##ACTION##`, getDataObject);
        }
    
       // logic to convert ##Naction## to Url with payload which will be used for logging purposes when it hit secondary message Api
        if (personalizedMessageStr.includes("##NACTION##")) {
          const regex = /##NACTION##(.*?)##NACTION##/g;
       
          let match;
          
          while ((match = regex.exec(personalizedMessageStr)) !== null) {
             
              const parts = match[1].split('_');
            
              if (parts.length === 2) {
                  const nativeAction = parts[0];
                  const displayText = parts[1];
                  let objectToParse = constants.PostbackDataNative;
                 
                    objectToParse = objectToParse
                      .replace("##action##", nativeAction)
                      .replace("##postbackjourney##", journey)
                      .replace("##SegmentName##", SegmentName)
                      .replace("##ntext##", encodeURIComponent(displayText));
        
                    const getDataObject = `${constants.payloadHeaderWithText}${objectToParse}`;
                    personalizedMessageStr = personalizedMessageStr.replace(
                      `##NACTION##${nativeAction}_${displayText}##NACTION##`,
                      getDataObject
                    );
              }
          }
        }
      
      
        // cache bursting
        if (personalizedMessageStr.indexOf('.png') > 0) {
            personalizedMessageStr = personalizedMessageStr.replace((new RegExp(".png", 'g')), '.png?dx=' + new Date().getTime());
        }
        if (personalizedMessageStr.indexOf('.jpg') > 0) {
            personalizedMessageStr = personalizedMessageStr.replace((new RegExp(".jpg", 'g')), '.jpg?dx=' + new Date().getTime());
        }
  
        personalizedMessageStr = personalizedMessageStr.replace((new RegExp("##spiceId##", 'g')), spiceId);
       
        // UTM - Tracking -- Start
        if (
          personalizedMessageStr.includes('##utmBaseURL##') ||
          personalizedMessageStr.includes('##utm_source##') ||
          personalizedMessageStr.includes('##utm_medium##') ||
          personalizedMessageStr.includes('##utm_campaign##')
        ) {
          personalizedMessageStr = personalizedMessageStr.replace((new RegExp("##utmBaseURL##", 'g')), constants.utmBaseURL);
          personalizedMessageStr = personalizedMessageStr.replace((new RegExp("##utm_source##", 'g')), GMRevampRulesConfig.UTMSource);
          personalizedMessageStr = personalizedMessageStr.replace((new RegExp("##utm_medium##", 'g')), GMRevampRulesConfig.UTMMedium);  
          personalizedMessageStr = personalizedMessageStr.replace((new RegExp("##utm_campaign##", 'g')), GMRevampRulesConfig["UTMJourneyMapping"][mappedPropertiesRef.Journey]);
        }
        // UTM - Tracking -- END

       
        // for Cloud Pages Urls
        if (
          personalizedMessageStr.includes('##profillingQuizSurveyUrl##') ||
          personalizedMessageStr.includes('##checkPointSurveyPageUrl##') ||
          personalizedMessageStr.includes('##needHelpSurvey6BUrl##') ||
          personalizedMessageStr.includes('##journey##') ||
          personalizedMessageStr.includes('##nowTime##')
        ){
          personalizedMessageStr = personalizedMessageStr.replace((new RegExp("##profillingQuizSurveyUrl##", 'g')), constants.profillingQuizSurveyUrl);
          personalizedMessageStr = personalizedMessageStr.replace((new RegExp("##checkPointSurveyPageUrl##", 'g')), constants.checkPointSurveyPageUrl);
          personalizedMessageStr = personalizedMessageStr.replace((new RegExp("##needHelpSurvey6BUrl##", 'g')), constants.needHelpSurvey6BUrl);
          personalizedMessageStr = personalizedMessageStr.replace((new RegExp("##journey##", 'g')), journey);
          let currentDate=Date.now();
          personalizedMessageStr = personalizedMessageStr.replace((new RegExp("##nowTime##", 'g')), currentDate);
        }
      
        
        msg.push({
          ...messages[message],
          content: JSON.parse(personalizedMessageStr)
        });
        
        // To simulate the line app on browser
        utility.logMessage(spiceId, `${messageType}_${rule}_${message}`, personalizedMessageStr, constants.getLoggerMode);
     
      }
   
    }
    // add final properties to cta log object and pass it to writeCTALog event. , will write only in case of secondary messages
    const CTALogs = [];
    CTALogs.push({
      ...mappedPropertiesRef,
      ...{
        'DateTime': new Date().toUTCString(),
        'Message': ``,
        'ResponseType': null,
        'ResponseCode': null
      }
    });
   
    if (needCSVLogs)
      writeCTALogInCSVFile.writeCTALogInCSVFile(CTALogs);

    resolve({ messages: msg, ctaLog: mappedPropertiesRef });
    
  })

}

async function processAction(payload) {
  let action = payload.action;
  const response = {
    data: null,
    rule: null
  }
  const ISAction = `${payload.journey}_${action}`
  if (action) {
    rule = null;
    // if (!payload.async) {
    let response_IS = await SendIS_Sync(payload.spice_id, ISAction);

    // add check for AC
    // if no products

    Logger.logInfo('SendIsAsync', 'processAction', payload.journey, ISAction, response_IS)
    if (response_IS && response_IS.campaignResponses && response_IS.campaignResponses[0] && response_IS.campaignResponses[0].payload.nextMessageID) {
      rule = response_IS.campaignResponses[0].payload.nextMessageID;
    } else {
      Logger.logError('processAction', "Either IS Response or Campaign Response is null", 'processAction', 'No CampaignResponse', { response_IS });
    }
    response.rule = rule;
    response.data = response_IS;
    // } else {
    //   SendIS_Sync(payload.spice_id, ISAction);
    //   response.rule = ISAction;
    // }
  } else {
    Logger.logError("processAction", "Action is Null in payload", 'processAction', 'processAction', {
      "payload": payload
    });
  }
  return response;
}


// keeping delay prop in json messages which will define the delay in messsages
async function sendMessagesBasedOnDelay(payLoad, messages, messageType, rule, res, ctaLog = null) {
  payLoad.messagePayload = !!payLoad.messagePayload ? payLoad.messagePayload : payLoad;
  let spiceId = payLoad.messagePayload.spice_id || payLoad.messagePayload.SID;
  let response = await SendLineMessageSync(messages, parseInt(spiceId), payLoad.messagePayload, ctaLog);
  response = response ? JSON.parse(response.body) : {
    "success": false
  };

  if (!response.success) {
    Logger.logError("Response_Error", constants.errorLogMessage.ErrorInSendingMessage, 'SendMessage', 'Response', {
      "response": response
    });
  }
  return response;
}
function returnExecuteResponse(response) {
  var resObj = { "journeySwitch": response };
  return resObj;
}
function createGroupsBasedOnDelay(messagesConfig) {
  return new Promise(resolve => {
    var allMessages = [];
    var sort = function (prop, arr) {
      prop = prop.split('.');
      var len = prop.length;

      arr.sort(function (a, b) {
        var i = 0;
        while (i < len) { a = a[prop[i]]; b = b[prop[i]]; i++; }
        if (a < b) {
          return -1;
        } else if (a > b) {
          return 1;
        } else {
          return 0;
        }
      });
      return arr;
    };

    Object.keys(messagesConfig).forEach(message => {
      allMessages.push({
        message,
        config: messagesConfig[message]
      })
    });
    const sortedMessages = sort('config.delay', allMessages)
    const groupBasedOnDelay = allMessages.reduce(function (r, a) {
      r[a.config.delay] = r[a.config.delay] || [];
      r[a.config.delay].push(a);
      return r;
    }, Object.create(null));

    resolve(groupBasedOnDelay);
  });

}
function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

module.exports = {

  excute: async function (req, res) {
    // journey builder pass a JWT token , which we compare with env variable., this is to ensure security.

    Logger.logInfo('Before JWT', constants.errorLogMessage.ReqPayload, 'JT', 'ReqPayload', {
      "payload": {
        "headers": req.headers,
        "body": req.body
      }
    });

    return new Promise((resolve, reject) => {
      JWT(req.body, process.env.jwtSecret, async (err, decoded) => {
        if (err) {
          console.error(`${utility.formattedTimeObj().TimeString}\n${err}`);
          // Error log
          Logger.logError(err, constants.errorLogMessage.JWT_ERROR, 'JWT', 'ErrorLog');
          resolve(returnExecuteResponse("false"))
        } else {
          try {
            Logger.logInfo('DecodedPayLoad', constants.errorLogMessage.payload, 'JWT', 'DecodedPayLoad', {
              "payload": decoded
            });
            responseFlag = await this.SendPrimaryMessageJT(decoded.inArguments[0], res);
            //resolve(returnExecuteResponse(!responseFlag ? "false" : "true"))
            resolve(returnExecuteResponse("false"))
          } catch (error) {
            // Error log
            Logger.logError(getDetailedError(error, decoded), constants.errorLogMessage.tryCatch, 'JWT', 'ErrorLog');
            resolve(returnExecuteResponse("false"))
          }
        }
      })
    });
  },

  SendSecondaryMessages: async function (req, res) {
    //  Req Payload Log
    Logger.logInfo('ReqPayload', constants.errorLogMessage.ReqPayload, 'Secondary', 'ReqPayload', {
      "payload": {
        "headers": req.headers,
        "body": req.body
      }
    });

    if (!utility.isValidKey(req, constants)) {
      Logger.logError('xApiKey', constants.errorLogMessage.xapikey, 'XAPI', 'XAPI');
      res.status(200).send({
        "success": false,
        "message": constants.errorLogMessage.xapikey
      });
      return;
    }

    try {
      if (req && req.body && typeof req.body === 'object') {
        let reqBodyData = req.body.DATA;

        // updated to accomodate DRM scenario for Line Native
        if (!reqBodyData) {
          reqBodyData = JSON.parse("[]");
          reqBodyData.SID = req.body.sid || req.body.SID || req.body.spice_id;
          reqBodyData.text = req.body.text;
          reqBodyData.action = req.body.action;
          reqBodyData.s_N = req.body.s_N;
          reqBodyData.journey = req.body.c_J;

        } else {

          // usual postback data scenario
          reqBodyData.SID = reqBodyData.SID || reqBodyData.Spice_ID || reqBodyData.spice_id || req.body.SID || req.body.sid || req.body.spice_id;
          reqBodyData.journey = reqBodyData.journey || reqBodyData.c_J;

        }
        // return in case of line native text is present
        if (reqBodyData.text) {
          Logger.logInfo('ReqPayloadWithLineNative', constants.errorLogMessage.ReqPayload, 'Secondary', 'ReqPayloadWithLineNative', {
            "payload": {
              "headers": req.headers,
              "body": req.body
            }
          });

          //cta logs
          NACTIONCTA_Logs(reqBodyData);

          res.status(200).send(constants.successMessageObject);
          return;
        }
        //////////////////////////////////////////////

        reqBodyData.async = false;
        let reqBodyData_rule;
        let response_ISObj;
        let manifest;
        let rule;
        let loyaltyData;
        let action = reqBodyData.action;
        let journey = reqBodyData.journey;
        let DRMjourney = "";

        const ISAction = `${journey}_${action}`

        

        if (action) {

            // Multiple CTA check - 12th April 2022

            let ctaFilePath = Path.join(...constants.publicPath, constants.logFileParentFolder, constants.IQOSGM_RevampJourneyLineMessageCTALog);

            if (fs.existsSync(ctaFilePath)) {

              var ctaData = await utility.csvToJsonParser(ctaFilePath);
              let ctaFound = await utility.findCTA(reqBodyData.SID, reqBodyData.action, constants.MultiClick, ctaData);

              if (ctaFound) {

                res.status(200).send({ "error": "Message not sent due to multiple CTA" });
                return;
              }

            }
            /////////////////////////////////////////

           
           
            let response_IS = await SendIS_Sync(reqBodyData.SID, ISAction);
            if (response_IS && response_IS.campaignResponses && response_IS.campaignResponses[0] && response_IS.campaignResponses[0].payload.nextMessageID) {
                reqBodyData_rule = response_IS.campaignResponses[0].payload.nextMessageID;
            } else {
                Logger.logError('Error', "No CampaignResponse", 'Secondary', 'No CampaignResponse', { response_IS });
              }
              response_ISObj = response_IS;
            
          }

          rule = reqBodyData_rule;

          if (reqBodyData_rule) {
           
              // updated to hide first message of DRM-ExAO Purchase Journey (WelcomeLAU)
              if (DRMjourney && GMRevampRules["JOURNEY"][DRMjourney] &&
                GMRevampRules["JOURNEY"][DRMjourney][reqBodyData_rule]) {
                manifest = utility.getManifestObj(reqBodyData_rule, DRMjourney, true);    //DRM JOURNEY   CAN REMOVE IT AS WE DO NOT HAVE DRM HOURNEY
              }
              else {
                manifest = utility.getManifestObj(reqBodyData_rule, journey, true);    //FLEX JOURNEY
              }
            
            //////////////////////////////////////////////////////////////////////////
          }
        

          if (manifest && Object.keys(manifest).length) {
            const messagePayload = utility.enumeratedPayload(reqBodyData);

            let processedISReponse;
          
            processedISReponse = await fetchDataFromISResponse(reqBodyData, manifest.Messages, "SendSecondaryMessages", rule, !reqBodyData.async, response_ISObj, true);
            

            await sendMessages(messagePayload, processedISReponse.messages, 'Secondary', rule, res, processedISReponse.ctaLog);
            res.status(200).send(constants.successMessageObject);
          } else {
            // Error Log
            Logger.logError('Error', constants.errorLogMessage.Manifest, 'Secondary', 'Manifest', {
              "BR_shorten": rule || 'BR not available',
              "BR": rule || 'Rule not available'
            });
            res.status(200).send(constants.errorMessageObject);
          }
      } else {
        // Error Log
        Logger.logError('Error', constants.errorLogMessage.Payload, 'Secondary', 'Payload', {
          "payload": {
            "headers": req.headers,
            "body": req.body
          }
        });
        res.status(200).send(constants.errorMessageObject);
      }
    } catch (error) {
      // Error Log
      const payload = req.body.DATA || req.body;
      Logger.logError(getDetailedError(error, payload), constants.errorLogMessage.tryCatch, 'Secondary', 'TryCatch');
      res.status(200).send(constants.errorMessageObject);
    }
  },

  SendPrimaryMessage: async function (req, res) {
    return new Promise(async (resolve, reject) => {
      req.body.messageType = Enum.MessageType.Primary;
      const resx = await this.SendPrimaryMessageJT(req.body, res);
      resolve({ "success": true });
    })
  },

  SendPrimaryMessageJT: async function (payload, res) {
    return new Promise(async (resolve, reject) => {
     
   
      const flow = !!payload.messageType ? 'API Flow' : 'JT Flow';
    
      Logger.logInfo(flow, constants.errorLogMessage.ReqPayload, 'SendPrimaryMessageJT', 'ReqPayload', {
        "payload": {
          "body": payload
        }
      });
     
      let rule, manifest, ISParsedResponse, loyaltyData;
      const messageType = !!payload.messageType ? payload.messageType : Enum.MessageType.PrimaryJT;
      const primaryMsgLogs = [];
     
      try {
       
        payload.spice_id = !!payload.spice_id ? payload.spice_id : payload.ContactKey;
      
        // for scenarios other than DRM
        if (payload.journey != "DRM") {
           
              // primary msgs logs
              primaryMsgLogs.push({ ...primaryMsgPayloadLog(payload.spice_id, payload.action, payload.journey, payload.SegmentName, '') });
              writeCTALogInCSVFile.primaryMsgLogInCSVFile(primaryMsgLogs);


              ISParsedResponse = await processAction(payload);
              rule = ISParsedResponse.rule;
              if (!rule) {
                  Logger.logError("Error", "NextMessageID doesnt exists", messageType, "SendPrimaryMessageJT", payload);
                  resolve(false)
                }

              manifest = utility.getManifestObj(rule, payload.journey, true);

              if (manifest && Object.keys(manifest).length) {
                  
                  const postbackPayload = utility.enumeratedPayload(payload);// can remove this line but debug first
                  responseFlag = false;
                  let processedISReponse;

              
                  processedISReponse = await fetchDataFromISResponse(payload, manifest.Messages, "SendPrimaryMessageJT", rule, !payload.async, ISParsedResponse.data, false);
                  

                  responseFlag = await sendMessages({
                    messagePayload: payload,
                    postbackPayload: postbackPayload
                  }, processedISReponse.messages, messageType, rule, res, processedISReponse.ctaLog);

                  // SM: need to return false in case of success scenario so that journeySwitch is set to false
                  responseFlag = false;
              
                  resolve(true)
              }
              else {
                Logger.logError('Error', constants.errorLogMessage.Manifest, messageType, 'Manifest', payload);
                resolve(false)
              }
        }
      }
      catch (error) {
        Logger.logError(getDetailedError(error, payload), constants.errorLogMessage.tryCatch, messageType, "TryCatch");
        resolve(false)
      }
    });
  },

  messageRefresh: async function (req, res) {
    return new Promise((resolve, reject) => {
      messageRefreshService.refreshAllJsons(req).then(data => {
        resolve(data)
      })
    })
  },

  importDRM_FTPFile: async function (req, res) {
    return new Promise((resolve, reject) => {
      importDRM_FTPFileService.importDRM_FTPFile(req).then(data => {
        resolve(data)
      })
    })
  },

  createCsvFromJSONs: async function (req, res) {
    return new Promise((resolve, reject) => {
      messageRefreshService.createCsvFromJSONs().then(data => {
        resolve(data)
      })

    })
  }
};

function getDetailedError(error, payload) {
  const errorMessage = error.message;
  const errorStack = error.stack;

  return `Error : ${errorMessage} | Error-Stack : ${errorStack} | Payload : ${JSON.stringify(payload)}`;
}


function NACTIONCTA_Logs(payload) {
  let mappedPropertiesRef = {
    Spice_ID: payload.SID,
    Action: payload.action,
    Journey: payload.Journey,
    Loyalty: '',
    Day: '',
    Discount: null,
    Product_Family: "",
    Product_Color: "",
    ML_Asset: "",
    ML_Tracking: payload.text,
    Microsegment: '',
    Lifestage: '',
    SegmentName: payload.SegmentName || payload.s_N
  };

  const CTALogs = [];
  CTALogs.push({
    ...mappedPropertiesRef,
    ...{
      'DateTime': new Date().toUTCString(),
      'Message': ``,
      'ResponseType': null,
      'ResponseCode': null
    }
  });
  writeCTALogInCSVFile.writeCTALogInCSVFile(CTALogs);
}
