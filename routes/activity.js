'use strict';
const util = require('util');

const lineApiResponse = require('./lineApiResponse.js')
const executeMethod = require('./executeMethod.js')
const http = require('https');
const request = require('request');

exports.logExecuteData = [];


function logData(req) {
    exports.logExecuteData.push({
        body: req.body,
        headers: req.headers,
        trailers: req.trailers,
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
        route: req.route,
        cookies: req.cookies,
        ip: req.ip,
        path: req.path,
        host: req.host,
        fresh: req.fresh,
        stale: req.stale,
        protocol: req.protocol,
        secure: req.secure,
        originalUrl: req.originalUrl
    });
}


/*
 * POST Handler for / route of Activity (this is the edit route).
 */
exports.edit = function (req, res) {
    // Data from the req and put it in an array accessible to the main app.
    logData(req);
    res.send(200, 'Edit');
};

/*
 * POST Handler for /save/ route of Activity.
 */
exports.save = function (req, res) {
    // Data from the req and put it in an array accessible to the main app.
    logData(req);
    res.send(200, 'Save');
};


/*
 * POST Handler for /execute/ route of Activity.
 */

exports.execute = (req, res) => {
    executeMethod.excute(req, res).then(response =>
        res.status(200).send(response)
    );
};

/*
 * POST Handler for /publish/ route of Activity.
 */
exports.publish = function (req, res) {
    // Data from the req and put it in an array accessible to the main app.
    logData(req);
    res.send(200, 'Publish');
};

/*
 * POST Handler for /validate/ route of Activity.
 */
exports.validate = function (req, res) {
    // Data from the req and put it in an array accessible to the main app.
    logData(req);
    res.send(200, 'Validate');
};

exports.messageRefresh = (req, res) => {
    executeMethod.messageRefresh(req, res).then(response =>
        res.status(200).send(response)
    );
};

exports.importDRM_FTPFile = (req, res) => {
    executeMethod.importDRM_FTPFile(req, res).then(response =>
        res.status(200).send(response)
    );
};
exports.createCsvFromJSONs = (req, res) => {
    executeMethod.createCsvFromJSONs(req, res).then(response =>
        res.status(200).send(response)
    );
};
