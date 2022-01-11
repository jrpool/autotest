// Goal: a single javascript file, which takes a URL as input, and:
// * runs the audit script on that url
// * 


// ########## IMPORTS
// Module to keep secrets local.

require('dotenv').config();

const {which} = require('./core');

const scoreDoc = require('./procs/report/scoreDoc');

const init = async (scriptName, batchName='None') => {
  const scriptDir = process.env.SCRIPTDIR || '';
  const batchDir = process.env.BATCHDIR || '';
  const reportDir = process.env.REPORTDIR || '';

  // Recreate the `query` variable as index.js would
  const query = {
    scriptName,
    batchName,
    reportDir,
    // Add a timeStamp for any required report file to the query.
    timeStamp: Math.floor((Date.now() - Date.UTC(2021, 4)) / 10000).toString(36),
  };
  const server = {
    query,
    render: (path, stage, which, query, response) => {
      console.log('rendering');
    }
  };

  // Generate a report from the script
  const report = await which(scriptDir, scriptName, batchDir, batchName, server);

  // If batchName is set, we loop through reports to generate docs:
  const reports = batchName === 'None' ? [report] : report;
  const reportsWithDocs = reports.map(report => ({
    report,
    doc: scoreDoc('test', report, 'asp08')
  }));
  return reportsWithDocs;
};

init('short', 'test-batch');
