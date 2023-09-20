const AWS = require('aws-sdk');
const fs = require('fs');
const ID = 'AKIAUZX2RVXJMZ7RHYFB';
const SECRET = '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';
const regionval = '';
const BUCKET_NAME = 'gme-prd-v1-1-sitecontentbucket-ap-northeast-1';
//const filename = 'C:\Deepak_T480\Deepak\Deepak_Photo.png';

const s3 = new AWS.S3({
    accessKeyId: ID,
    secretAccessKey: SECRET,
});

async function dg_test_upload(BestSellerpathdownload,fileName)
{
    // Read content from the file
    const fileContent = fs.readFileSync(fileName);

    // Setting up S3 upload parameters
    const params = {
        Bucket: BUCKET_NAME,
        Key: 'Deepak_Photo.png', // File name you want to save as in S3
        Body: fileContent
    };
    
    // Uploading files to the bucket
    s3.upload(params, function(err, data) {
        if (err) {
            throw err;
        }
        console.log(`File uploaded successfully. ${data.Location}`);
    });

}
module.exports = {
    dg_test_upload
}