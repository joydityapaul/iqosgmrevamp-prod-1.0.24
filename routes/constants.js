const utility = require('./utility.js');
const path = require('path');

const xApiKey = '';
const xapikeyPrimary = '';

const errorMessage = {
  "error": "Invalid API request."
};
const successMessage = {
  "Success": "Message sent successfully"
};
const noMessageFoundToSend = "No message found to send from menifist file";
const errorInvalidMessage = {
  "error": "Invalid message to send"
};

const LineMessagesParentFolderName = "LineMessage";
const payloadHeader = "ib://salesforce/transfer/gmrevamp?";
const payloadHeaderWithText = "ib://salesforce/transfer/iqos_gmrevamp_proxy?";
const publicPath = [__dirname, '..', 'public'];

const envURLVariable = "{{env}}";
const envURLVariableValue = '';
const productBaseURL = '';
const utmBaseURL='';
const profillingQuizSurveyUrl='';
const checkPointSurveyPageUrl='';
const needHelpSurvey6BUrl='';
const envBasedURLVariable = "{{envBasedUrl}}";
const envBasedURLConstant = /{{envBasedUrl}}/gi;
const envBasedURLVariableValue = '';

const DRM_Json_Upload = "DRM_Json_upload.csv";
const IQOSGM_RevampJourneyLineMessageLog = "IQOSGM_RevampJourneyLineMessageLog.csv";
const IQOSGM_RevampJourneyLineMessageCTALog = "IQOSGM_RevampJourneyLineMessageCTALog.csv";
const IQOSGM_RevampJourneyLinePrimaryMessageLog = "IQOSGM_RevampJourneyLinePrimaryMessageLog.csv";

const remoteDir = '/Import/PMJ/GM_Revamp';
const remoteDRMDir = '/Export/PMJ/GM_Revamp';
const logFileParentFolder = 'file';
const enviromentVariable = process && process.env && process.env.Deployment_Env ? process.env.Deployment_Env : 'staging';
const ipWhiteListValue = process && process.env && process.env.IPWhiteList ? process.env.IPWhiteList : '';
const ConfigObject = getCofigValue();
const errorLogMessage = {
  "Manifest": "Manifest file not found",
  "Payload": "Incorrect Payload",
  "tryCatch": "Error in tryCatch",
  "ReqPayload": "CTA Request Payload",
  "ErrorInLogging": "Unable to Log",
  "JWT_ERROR": "Error in JWT",
  "ErrorInSendingMessage": "Unable to send message",
  "xapikey": "Invalid KEY"
}

module.exports = {

  successMessageObject: successMessage,
  errorMessageObject: errorMessage,
  //encodeHash: encodeHash,

  payloadHeader: payloadHeader,
  payloadHeaderWithText: payloadHeaderWithText,
  noMessageFoundToSend: noMessageFoundToSend,
  errorInvalidMessage: errorInvalidMessage,
  LineMessagesParentFolderName: LineMessagesParentFolderName,

  publicPath: publicPath,
  envURLVariable: envURLVariable,
  envURLVariableValue: ConfigObject ? ConfigObject.envURL : envURLVariableValue,
  productBaseURL: ConfigObject ? ConfigObject.productBaseURL : productBaseURL,
  utmBaseURL: ConfigObject ? ConfigObject.utmBaseURL : utmBaseURL,
  profillingQuizSurveyUrl: ConfigObject ? ConfigObject.profillingQuizSurveyUrl : profillingQuizSurveyUrl,
  checkPointSurveyPageUrl: ConfigObject ? ConfigObject.checkPointSurveyPageUrl : checkPointSurveyPageUrl,
  needHelpSurvey6BUrl: ConfigObject ? ConfigObject.needHelpSurvey6BUrl : needHelpSurvey6BUrl,

  IQOSGM_RevampJourneyLineMessageLog: ConfigObject ? ConfigObject.IQOSGM_RevampJourneyLineMessageLog : IQOSGM_RevampJourneyLineMessageLog,
  IQOSGM_RevampJourneyLineMessageCTALog: ConfigObject ? ConfigObject.IQOSGM_RevampJourneyLineMessageCTALog : IQOSGM_RevampJourneyLineMessageCTALog,
  IQOSGM_RevampJourneyLinePrimaryMessageLog: ConfigObject ? ConfigObject.IQOSGM_RevampJourneyLinePrimaryMessageLog : IQOSGM_RevampJourneyLinePrimaryMessageLog,

  DRM_Json_Upload: ConfigObject ? ConfigObject.DRM_Json_Upload : DRM_Json_Upload,
  
  remoteDir: ConfigObject ? ConfigObject.remoteDir : remoteDir,
  remoteDRMDir: ConfigObject ? ConfigObject.remoteDRMDir : remoteDRMDir,
  logFileParentFolder: logFileParentFolder,

  ftpConfig: getFTPConfig(),
  xkeyConfig: getXKeyConfig(),
  xApiKey: getXApiKeyConfig(),
  getCofigValue: getCofigValue(),

  ipWhiteList: ipWhiteListValue,

  envBasedURLVariable: envBasedURLVariable,
  envBasedURLConstant: envBasedURLConstant,
  envBasedURLVariableValue: ConfigObject ? ConfigObject.envBasedUrl : envBasedURLVariableValue,
  errorLogMessage: errorLogMessage,

  IS_Url: getIsUrl(),
  IS_Auth: getIsAuth(),
  getRefreshJsonAuthObj: fetchKeyValueFromDefault('refreshJsonAuthTokenPayload'),
  getS3BaseURL: fetchKeyValueFromDefault('S3BaseUrl'),
  JSONRefresh: fetchKeyValueFromDefault('JSONRefresh'),
  DRM_FTP_Details: fetchKeyValueFromDefault('DRM_FTP_Details'),
  getLoggerMode: getLoggerMode(),
  fileAgeInDays: fetchKeyValueFromDefault('fileAgeInDays'),
  PostbackDataCTA: fetchKeyValueFromDefault('PostbackDataCTA'),
  DRMPostbackDataCTA: fetchKeyValueFromDefault('DRMPostbackDataCTA'),
  PostbackDataNative: fetchKeyValueFromDefault('PostbackDataNative'),
  DRMPostbackDataNative: fetchKeyValueFromDefault('DRMPostbackDataNative'),
  NewRelic: fetchKeyValueFromDefault('NewRelic'),
  MultiClick: fetchKeyValueFromDefault('MultiClick'),
  DefaultPath:fetchKeyValueFromDefault('DefaultPath'),
  envWebURL: fetchKeyValueFromDefault('envWebURL'),

  drm_xApiKey : get_xapikey(),
  drm_linkUrl : get_link_url(),
  drm_UnlinkUrl : get_unlink_url(),
  drm_CreateUrl : get_create_url(),
  drm_AliasUrl : get_alias_url(),

  get_DRM_url
}

function fetchKeyValueFromDefault(key) {
  var JSONModel = utility.readJSONFile(path.join(__dirname, '..', 'default.json'));
  let config = JSON.parse(JSONModel)[`${enviromentVariable}`];
  return config[key];
}

function getLoggerMode() {
  const enviromentVariable = process && process.env && process.env.loggingMode ? process.env.loggingMode : 'both';
  return enviromentVariable;
}


function getFTPConfig() {

  var JSONModel = utility.readJSONFile(path.join(__dirname, '..', 'default.json'));
  let FTPConfig = JSON.parse(JSONModel)[`${enviromentVariable}`];
  let obj = FTPConfig ? {
    "host": FTPConfig.Host,
    "port": FTPConfig.Port,
    "username": FTPConfig.User,
    "password": FTPConfig.Password
  } : null;
  let data = JSON.stringify(obj)
  let newdata = JSON.parse(data)
  return newdata;
}

//X-key primary config
function getXKeyConfig() {

  var JSONModel = utility.readJSONFile(path.join(__dirname, '..', 'default.json'));
  let xkeyConfig = JSON.parse(JSONModel)[`${enviromentVariable}`];

  let xkey = xkeyConfig.xapikeyPrimary;

  return xkey ? xkey : null;
}

function getXApiKeyConfig() {

  var JSONModel = utility.readJSONFile(path.join(__dirname, '..', 'default.json'));
  let xApiKeyConfig = JSON.parse(JSONModel)[`${enviromentVariable}`];

  let xApiKey = xApiKeyConfig.xApiKey;

  return xApiKey ? xApiKey : null;
}

function getCofigValue() {
  var JSONModel = utility.readJSONFile(path.join(__dirname, '..', 'default.json'));
  let envURLVariableValue = JSON.parse(JSONModel)[`${enviromentVariable}`];
  return envURLVariableValue ? envURLVariableValue : null;
}

//IS Url primary config
function getIsUrl() {

  var JSONModel = utility.readJSONFile(path.join(__dirname, '..', 'default.json'));
  let ISobj = JSON.parse(JSONModel)[`${enviromentVariable}`];

  let url = ISobj.IS.url;

  return url ? url : null;
}

//IS auth token primary config
function getIsAuth() {

  var JSONModel = utility.readJSONFile(path.join(__dirname, '..', 'default.json'));
  let ISobj = JSON.parse(JSONModel)[`${enviromentVariable}`];

  let auth = ISobj.IS.authToken;

  return auth ? auth : null;
}

//DRM XAPI
function get_xapikey() {

  var JSONModel = utility.readJSONFile(path.join(__dirname, '..', 'default.json'));
  let ISobj = JSON.parse(JSONModel)[`${enviromentVariable}`];

  let xapikey = ISobj.DRM.xapikey;

  return xapikey ? xapikey : null;
}

//DRM LinkUrl
function get_link_url() {

  var JSONModel = utility.readJSONFile(path.join(__dirname, '..', 'default.json'));
  let ISobj = JSON.parse(JSONModel)[`${enviromentVariable}`];

  let link_url = ISobj.DRM.link_url;

  return link_url ? link_url : null;
}

//DRM UnLinkUrl
function get_unlink_url() {

  var JSONModel = utility.readJSONFile(path.join(__dirname, '..', 'default.json'));
  let ISobj = JSON.parse(JSONModel)[`${enviromentVariable}`];

  let unlink_url = ISobj.DRM.unlink_url;

  return unlink_url ? unlink_url : null;
}

//DRM Create Menu
function get_create_url() {

  var JSONModel = utility.readJSONFile(path.join(__dirname, '..', 'default.json'));
  let ISobj = JSON.parse(JSONModel)[`${enviromentVariable}`];

  let url = ISobj.DRM.create_url;

  return url ? url : null;
}

//DRM Menu Alias
function get_alias_url() {

  var JSONModel = utility.readJSONFile(path.join(__dirname, '..', 'default.json'));
  let ISobj = JSON.parse(JSONModel)[`${enviromentVariable}`];

  let url = ISobj.DRM.alias_url;

  return url ? url : null;
}

//DRM url
function get_DRM_url(key_val) {

  var JSONModel = utility.readJSONFile(path.join(__dirname, '..', 'default.json'));
  let ISobj = JSON.parse(JSONModel)[`${enviromentVariable}`];

  let url = ISobj.DRM[key_val];
   return url ? url : null;
}

