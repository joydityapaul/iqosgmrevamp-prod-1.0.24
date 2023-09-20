var request = require('request');
const constants = require('./constants.js')
const utility = require('./utility.js');
const writeLogInCSVFile = require('./writeLogInCSVFile.js');
const Logger = require('../public/common/utilities/logger');
var requestRetry = require('requestretry');
const writeCTALogInCSVFile = require('./writeLogInCSVFile.js');



module.exports = {
  SendLineMessageSync: async function (msgObjectCollection, spiceId, payLoad, ctaLog = null) {
    try {
      let date = new Date(), xkey = constants.xkeyConfig, msgLog = [];
      let response = await asyncRequest({
        "headers": {
          "content-type": "application/json",
          "x-api-key": xkey
        },
        "url": `https://line.${constants.envURLVariableValue}.jp/external/salesforce/push_message.json`,
        "body": JSON.stringify({
          "spice_id": spiceId,
          "messages": msgObjectCollection,
          "annotation": ["gmrevamp"]
        })
      });
      if (response.error) {
        msgLog.push(
          ...ctaLog,
          ...{
            'DateTime': new Date().toUTCString(),
            'Message': `Error Message : ${response.error.message}`,
            'ResponseType': "Error",
            'ResponseCode': response.error.code
          });
      } else if (response.response.statusCode == 200 && response.response.statusMessage == 'OK') {
        let objResponseBody = JSON.parse(response.body);
        let code = "";
        let success = "";
        let messageBody = "";
        if (objResponseBody) {
          code = objResponseBody.code;
          success = objResponseBody.success;
          messageBody = objResponseBody.message || '';
        }
        msgLog.push({
          ...ctaLog,
          ...{
            'DateTime': new Date().toUTCString(),
            'Message': `${success ? 'Success' : 'Error'} Message : ${messageBody}`,
            'ResponseType': success,
            'ResponseCode': code
          }
        });
      }
      writeLogInCSVFile.writeLogInCSVFile(msgLog);
      return response.response;
    } catch (error) {
    }
  },

  SendIS_Sync: async function (spiceId, action) {

    try {
      const iSAuthorization = constants.IS_Auth;
      const iSurl = constants.IS_Url;
      let objResponseBody;

      const response = await requestRetry({
        "method": "POST",
        "headers": {
          "Authorization": iSAuthorization,
          "Content-Type": "application/json"
        },
        "url": iSurl,
        "body": JSON.stringify({
          "action": action,
          "user": { "id": spiceId },
          "source": { "channel": "Server" }
        }),
        maxAttempts: 1,
        retryDelay: 500,
        retryStrategy: retryStrategy
      });
      if (response.error) {
        console.log(`${utility.formattedTimeObj().TimeString}\nError in SpiceID: ${spiceId} & Action: ${action}`);

        // ### - need addittional logging to know IS API Response threw error - Event -> IS API Response Error ###
        primaryMsgPayloadLog(spiceId, action, 'IS', '', 'IS API Response Error');


      } else if (response.statusCode == 200 || response.statusCode == 201) {
        objResponseBody = JSON.parse(response.toJSON().body);
        //let objResponseBody = dummyAC_ISResponse;
        let code = "";
        let success = "";
        let messageBody = "";
        if (objResponseBody) {
          code = objResponseBody.code;
          success = objResponseBody.success;
          messageBody = objResponseBody.message || '';
        }

        // need to test once with finalised IS response.
        feedbackML(objResponseBody, spiceId);

      }

      return objResponseBody;
    } catch (error) {
      console.log(`${utility.formattedTimeObj().TimeString}\nError in sending message : ${error}`);
      
      // ### - need addittional logging to know SendIS_Sync catch error - Event -> SendIS_Sync Catch Error ###
      primaryMsgPayloadLog(spiceId, action, 'IS', '', 'SendIS_Sync Catch Error');

    
    }
  }
}

function retryStrategy(err, response, body, options) {
  let mustRetry = false;
  if (err) {
    mustRetry = true;
    Logger.logError("Error", "retryStrategy", 'retryStrategy', 'retryStrategy', err);
  } else if (response.statusCode == 200 || response.statusCode == 201) {
    //
  } else {
    mustRetry = true;
    Logger.logError(JSON.stringify(response), "retryStrategy", 'retryStrategy', 'retryStrategy', JSON.parse(options.body));
  }
  return {
    mustRetry,
    options,
  }
}

function primaryMsgPayloadLog(Spice_ID, Action, Journey, SegmentName, OtherInfo ) {
  let primaryMsgRef = {
    Spice_ID: Spice_ID,
    Action: Action,
    Journey: Journey,
    SegmentName: SegmentName,
    DateTime: new Date().toUTCString(),
    OtherInfo: OtherInfo
  };
  const primaryMsgLogs = [];

  primaryMsgLogs.push({...primaryMsgRef});
  writeCTALogInCSVFile.primaryMsgLogInCSVFile(primaryMsgLogs);

}

async function feedbackML(response, spiceId) {
  Logger.logInfo('SendIsAsync', "SendIS_Sync processISResponse", 'SendIS_Sync_Response', 'ReqPayload', {
    "payload": {
      "body": response
    }
  });
  const payload_is = response.campaignResponses[0] && response.campaignResponses[0].payload;
  if (payload_is) {    

    let sendFeedback = false;
    let promoProductId = '';

    let parsedIsObj = {
      experience: payload_is && payload_is.experience,      
      promotionId: [ payload_is && payload_is.promoId ],      
      machineLearningFeedback: payload_is && payload_is.machineLearningFeedback,
      mlFeedbackType: payload_is && payload_is.mlFeedbackType
    }
    
    if (payload_is && payload_is.secondaryPromotion && payload_is.secondaryPromotion.promoId)
    {
      parsedIsObj.promotionId.push(payload_is.secondaryPromotion.promoId);
    }

    if (parsedIsObj.machineLearningFeedback) {
      let payload = {};

      if (parsedIsObj.mlFeedbackType === "Promotion" && parsedIsObj.promotionId 
            && parsedIsObj.experience && spiceId) {

        promoProductId = parsedIsObj.promotionId;
        sendFeedback = true;

        payload = {
          "source": {
            "channel": "Server"
          },
          "user": {
            "id": spiceId
          },
          "campaignStats": [
            {
              "experienceId": parsedIsObj.experience,
              "stat": "Impression",
              "control": false,
              "catalog": {
                "Promotion": parsedIsObj.promotionId
              }
            }
          ]
        }
      } else if(parsedIsObj.mlFeedbackType === "Product" && 
                payload_is.products && payload_is.products.length > 0 
                && payload_is.products[0].id && parsedIsObj.experience && spiceId) {
                  
        sendFeedback = true;

        const product = payload_is.products[0];
        promoProductId = [product.id];

        payload = { // if promotion doesnt exists
          "source": {
            "channel": "Server"
          },
          "user": {
            "id": spiceId
          },
          "campaignStats": [
            {
              "experienceId": parsedIsObj.experience,
              "stat": "Impression",
              "control": false,
              "catalog": {
                "Product": [product.id]
              }
            }
          ]
        }
      }

      if(sendFeedback)  {

        const iSAuthorization = constants.IS_Auth;
        const iSurl = constants.IS_Url;
        
        let responsex = await asyncRequest({
          "method": "POST",
          "headers": {
            "Authorization": iSAuthorization,
            "Content-Type": "application/json"
          },
          "url": iSurl,
          "body": JSON.stringify(payload)

        });
        if (responsex.error) {
          console.log(`feedbackML : ${utility.formattedTimeObj().TimeString} Error`);
          Logger.logError('feedbackML', "feedbackMLError", 'SendIS_Sync_Response', 'ReqPayload', {
            "payload": {  "body": JSON.stringify(responsex)}  
			    });

          // ### - need addittional logging to know feedbackML error - Event -> IS Campaign Stat API Error ###
          primaryMsgPayloadLog(spiceId, parsedIsObj.experience, 'IS', promoProductId, 'IS Campaign Stat API Error');


        } else if (responsex.response.statusCode == 200 && responsex.response.statusMessage == 'OK') {
          // Do nothing
        }
        
     }
     else
     {
        // Error in Feedback payload
        // ### - need addittional logging to know feedbackML send payload error - Event -> IS Campaign Stat API Send Payload Error ###
        primaryMsgPayloadLog(spiceId, parsedIsObj.experience, 'IS', promoProductId, 'IS Campaign Stat API Send Payload Error');

     }
    }
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
