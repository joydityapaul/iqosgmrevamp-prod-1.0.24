'use strict';
// Module Dependencies
// -------------------
const newrelic = require('newrelic');
var express = require('express');
var bodyParser = require('body-parser');
var errorhandler = require('errorhandler');
var http = require('http');
var routes = require('./routes');
var activity = require('./routes/activity');
var renderLog = require('./routes/renderLog');
const fs = require('fs');
const executeMethod = require('./routes/executeMethod.js')
const scheduleLoggingJob = require('./routes/scheduleLoggingJob.js')
const constants = require('./routes/constants.js');

const richMenu = require('./routes/dynamic-rich-menu.js');

var app = express();

// Configure Express
app.set('port', process.env.PORT ||3001);
app.use(bodyParser.raw({
  type: 'application/jwt'
}));

app.use(bodyParser.urlencoded({
  extended: true
}))


app.use(bodyParser.json())

app.use(express.static('public'))

app.use('/errorlog', express.static(`${__dirname}/errorlog`));
app.get('/errorlog', renderLog.errorlog);

app.post('/clearLog', renderLog.clearLog);


// POC for CMS
// app.get('/getMappingDetails', mappingDetails.getDetails);
// app.post('/resGetdependentRules', mappingDetails.resGetdependentRules);
// app.get('/getMappingDetailsRenderedPage', mappingDetails.getMappingDetailsRenderedPage);
// app.post('/getMessageRendered', mappingDetails.getMessageRendered);
// app.post('/getMessageReview', mappingDetails.getMessageReview);
// app.post('/editMessage', mappingDetails.editMessage);


// Express in Development Mode
if ('development' == app.get('env')) {
  app.use(errorhandler());
}

// HubExchange Routes
app.get('/', routes.index);
app.post('/login', routes.login);
app.post('/logout', routes.logout);

// Custom Activity Routes
app.post('/journeybuilder/save/', activity.save);
app.post('/journeybuilder/validate/', activity.validate);
app.post('/journeybuilder/publish/', activity.publish);
app.post('/journeybuilder/execute/', activity.execute);

/** 
 * This is exposed API to send secondry messages.
 */
app.post('/api/sfmc/sendgmrevampLineMsg', (req, res) => {
  executeMethod.SendSecondaryMessages(req, res);
});


if (constants.getLoggerMode === 'both' || constants.getLoggerMode === 'info') {
  app.post('/api/sfmc/sendgmrevampPrimaryLineMsg', (req, res) => {
    executeMethod.SendPrimaryMessage(req, res).then(response =>
      res.status(200).send(response)
    );
  });

  app.post('/sfmc/createjson/', activity.createCsvFromJSONs);

  app.use('/log', express.static(`${__dirname}/log`));
  app.get('/log', renderLog.msgLog);

  app.use('/infolog', express.static(`${__dirname}/infolog`));
  app.get('/infolog', renderLog.infolog);
}

setConfigForEnviorment();


app.post('/sfmc/refreshjson/', activity.messageRefresh);
app.post('/sfmc/DRMLink/', activity.importDRM_FTPFile);


// setting up shedule to send CSV log msgs to FTP server
scheduleLoggingJob.scheduleLoggingJob();

// Creating Express server for unit test during development
http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});

checkLogsFiles();

function checkDirExistsElseCreate(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  } catch (err) {
    console.error(err);
  }
}

function checkLogsFiles() {
  const logdir = `./log`;
  const infoLogdir = `./infolog`;
  const errorlogdir = `./errorlog`;
  checkDirExistsElseCreate(logdir);
  checkDirExistsElseCreate(infoLogdir);
  checkDirExistsElseCreate(errorlogdir);
}

function setConfigForEnviorment() {
  const enviromentVariable = process && process.env && process.env.Deployment_Env ? process.env.Deployment_Env : 'staging';
  const configFile = enviromentVariable === "production" ? "./public/config_prod.json" : "./public/config_dev.json"
  fs.readFile(configFile, (err, contents) => {
    if (err) console.log(err);
    fs.writeFile('./public/config.json', contents, () => {
      console.log('config switched to ' + configFile);
    });
  });

}

// uncomment to operate richmenu manually
// Step 1 : Create RichMenu IDs Based on DRM Jsons
// Step 2 : Create Rich Menu Aliases
// richMenu.initilizeDRMCreation('0');
// richMenu.initilizeDRMAliasing('0');
// Step 3 : Generate CSV to record DRM and Alias IDs
// richMenu.generateCSV();
// Step 4: Link DRM to contacts as needed
// richMenu.processDRMlinking("C:/PMJ/IQOSIQ/iqosiq-dev/public/DRM/JSONs/Single-Coins-Post-PM-May22/DRM_Link_Menu_Journey_20220530.csv");

// Un Link DRM from contacts as needed
// richMenu.processDRMunlinking();

// Delete RichMenu Process
// Step 1: Delete Rich Menu Aliasing
// richMenu.initilizeDRMAliasDeletion();
// Step 2: Delete Rich Menu's
// richMenu.initilizeDRMDeletion();

//richMenu.initilizeDRMAliasDeletionFromFile();
//richMenu.initilizeDRMDeletionFromFile();

// POC to replace assets on S3
//const dg_test_S3_Upload = require('./routes/dg_test_S3_Upload.js');
//dg_test_S3_Upload.dg_test_upload('C:\Deepak_T480\Deepak\Deepak_Photo.png');

