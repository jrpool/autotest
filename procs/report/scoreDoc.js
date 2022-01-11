/*
  scoreDoc.js
  Creates HTML reports from the JSON reports of a batch.
  Arguments:
    0. Subdirectory of the report directory.
    1. Subdirectory of the docTemplates directory.
    2. Score proc, if not in the JSON reports.
    3. Score-proc version, if not in the JSON reports.
*/
// ########## IMPORTS
// Module to access files.
const fs = require('fs');
// Module to keep secrets local.
require('dotenv').config();

const {generateHtmlReportFromData} = require('../../core');

// ########## OPERATION
let [reportSubdir, docSubdir, scoreProc, version] = process.argv.slice(2);
// Directory.
const dir = `${process.env.REPORTDIR}/${reportSubdir}`;
const fileNames = fs.readdirSync(`${dir}/jsonReports`);
const template = fs.readFileSync(`./docTemplates/${docSubdir}/index.html`, 'utf8');
const {parameters} = require(`../../docTemplates/${docSubdir}/index`);
// For each JSON report file:
fileNames.forEach(fn => {
  // Get its content.
  const fileBase = fn.slice(0, -5);
  const sourceJSON = fs.readFileSync(`${dir}/jsonReports/${fn}`, 'utf8');
  const sourceData = JSON.parse(sourceJSON);
  const htmlReport = generateHtmlReportFromData(fn, sourceData, template, parameters, scoreProc, version);
  fs.writeFileSync(`${dir}/htmlReports/${fileBase}.html`, htmlReport);
});
