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

// Returns the generate html for a given report data, doc tempalte, scoring and version
const scoreDoc = (fn, sourceData, docSubdir, scoreProc, version) => {
  const template = fs.readFileSync(`./docTemplates/${docSubdir}/index.html`, 'utf8');
  const {parameters} = require(`../../docTemplates/${docSubdir}/index`);
  // Get its data.
  const {testDate} = sourceData;
  const testActs = sourceData.acts.filter(act => act.type === 'test');
  const testData = {};
  testActs.forEach(act => {
    testData[act.which] = act;
  });
  const scoreData = sourceData.acts.find(act => act.type === 'score').result;
  scoreProc || (scoreProc = scoreData.scoreProc);
  version || (version = scoreData.version);
  const orgData = sourceData.acts.find(act => act.type === 'url');
  // Compute the values to be substituted for HTML template placeholders.
  const paramData = parameters(
    fn, sourceData, testData, scoreData, scoreProc, version, orgData, testDate
  );
    // Replace the placeholders.
  const htmlReport = template
  .replace(/__([a-zA-Z]+)__/g, (placeHolder, param) => paramData[param]);
  return htmlReport;
};


// Create an html report for each jsonReport in the given report directory
const scoreDocs = (dir, docSubdir, scoreProc, version) => {
  const fileNames = fs.readdirSync(`${dir}/jsonReports`);
  // For each JSON report file:
  fileNames.forEach(fn => {
    const fileBase = fn.slice(0, -5);
    // Get its content.
    const sourceJSON = fs.readFileSync(`${dir}/jsonReports/${fn}`, 'utf8');
    const sourceData = JSON.parse(sourceJSON);
    const htmlReport = scoreDoc(fn, sourceData, docSubdir, scoreProc, version);
    fs.writeFileSync(`${dir}/htmlReports/${fileBase}.html`, htmlReport);
  });
};

// If called as a node script (e.g by scoreAll.sh)
if (require.main === module) {
  // ########## OPERATION
  let [reportSubdir, docSubdir, scoreProc, version] = process.argv.slice(2);
  // Directory.
  const dir = `${process.env.REPORTDIR}/${reportSubdir}`;
  scoreDocs(dir, docSubdir, scoreProc, version);
}

module.exports = scoreDoc;