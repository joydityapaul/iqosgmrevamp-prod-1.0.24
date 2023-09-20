
const csvWritercheck = require('csv-writer');
const Path = require('path');
const constants = require('./constants.js');
const createCsvWriter = csvWritercheck.createObjectCsvWriter;
const createCTACsvWriter = csvWritercheck.createObjectCsvWriter;
const createPrimaryMsgCsvWriter = csvWritercheck.createObjectCsvWriter;
const filepath = Path.join(...constants.publicPath, 'file', 'IQOSGM_RevampJourneyLineMessageLog.csv');
const CTAfilepath = Path.join(...constants.publicPath, 'file', 'IQOSGM_RevampJourneyLineMessageCTALog.csv');
const primaryMsgfilepath = Path.join(...constants.publicPath, 'file', 'IQOSGM_RevampJourneyLinePrimaryMessageLog.csv');
const primaryMsgWriter = createPrimaryMsgCsvWriter({
  path: primaryMsgfilepath,
  append: true,
  header: [
    { id: 'Spice_ID', title: 'Spice_Id' },
    { id: 'Action', title: 'Action' },
    { id: 'Journey', title: 'Journey' },
    { id: 'SegmentName', title: 'SegmentName' },
    { id: 'DateTime', title: 'DateTime' },
    { id: 'OtherInfo', title: 'OtherInfo' },
  ]
});
const csvWriter = createCsvWriter({
  path: filepath,
  append: true,
  header: [
    { id: 'Spice_ID', title: 'Spice_Id' },
    { id: 'Action', title: 'Action' },
    { id: 'Journey', title: 'Journey' },
    { id: 'Loyalty', title: 'Loyalty' },
    { id: 'Day', title: 'Day' },
    { id: 'Discount', title: 'Discount' },
    { id: 'Product_Family', title: 'Product_Family' },
    { id: 'Product_Color', title: 'Product_Color' },
    { id: 'ML_Asset', title: 'ML_Asset' },
    { id: 'ML_Tracking', title: 'ML_Tracking' },
    { id: 'Microsegment', title: 'Microsegment' },
    { id: 'Lifestage', title: 'Lifestage' },
    { id: 'Message', title: 'Message' },
    { id: 'ResponseType', title: 'Response_Type' },
    { id: 'ResponseCode', title: 'Response_Code' },
    { id: 'DateTime', title: 'DateTime' },
    { id: 'SegmentName', title: 'SegmentName' },
  ]
});
const CTAcsvWriter = createCTACsvWriter({
  path: CTAfilepath,
  append: true,
  header: [
    { id: 'Spice_ID', title: 'Spice_Id' },
    { id: 'Action', title: 'Action' },
    { id: 'Journey', title: 'Journey' },
    { id: 'Loyalty', title: 'Loyalty' },
    { id: 'Day', title: 'Day' },
    { id: 'Discount', title: 'Discount' },
    { id: 'Product_Family', title: 'Product_Family' },
    { id: 'Product_Color', title: 'Product_Color' },
    { id: 'ML_Asset', title: 'ML_Asset' },
    { id: 'ML_Tracking', title: 'ML_Tracking' },
    { id: 'Microsegment', title: 'Microsegment' },
    { id: 'Lifestage', title: 'Lifestage' },
    { id: 'DateTime', title: 'DateTime' },
    { id: 'SegmentName', title: 'SegmentName' },
  ]
});

module.exports = {
  writeLogInCSVFile: function (msg) {
    csvWriter.writeRecords(msg)
      .then((responsee) => {
        console.log('Log has been saved in CSV');
      }, (error) => {
        console.log('Error in writing Log :' + error);
      });

  },
  writeCTALogInCSVFile: function (msg) {
    CTAcsvWriter
      .writeRecords(msg)
      .then((responsee) => {
        console.log('CTA Log has been saved in CSV');
      }, (error) => {
        console.log('Error in writing CTA Log :' + error);
      });

  },
  primaryMsgLogInCSVFile: function (msg) {
    primaryMsgWriter
      .writeRecords(msg)
      .then((responsee) => {
        console.log('primary msgs Log has been saved in CSV');
      }, (error) => {
        console.log('Error in writing primary msgs Log :' + error);
      });

  }
}