/*
  rescoreBulk.js
  Amends the scores of the “bulk” test, and accordingly the total scores, in the reports of a batch.
  The reports must be in a “jsonReports” subdirectory. The amended reports will be in a
  “newJSONReports” subdirectory. The amended scores conform to a11y07.
  Arguments:
    0. Subdirectory of report directory.
*/
// ########## IMPORTS
// Module to access files.
const fs = require('fs');
// Module to keep secrets local.
require('dotenv').config();
// ########## OPERATION
// Directories.
const oldDir = `${process.env.REPORTDIR}/${process.argv[2]}/jsonReports`;
const newDir = `${process.env.REPORTDIR}/${process.argv[2]}/newJSONReports`;
fs.mkdirSync(newDir);
// Identify the reports.
const reportNames = fs.readdirSync(oldDir);
// For each one:
reportNames.forEach(fn => {
  // Get it as an object.
  const reportObj = JSON.parse(fs.readFileSync(`${oldDir}/${fn}`));
  // Git its “bulk” result.
  const bulkCount = reportObj
  .acts
  .filter(act => act.type === 'test' && act.which === 'bulk')[0]
  .result
  .visibleElements;
  // Get the scores.
  const scoreObj = reportObj.acts.filter(act => act.type === 'score')[0];
  const deficits = scoreObj.result.deficit;
  const oldBulk = deficits.bulk;
  if (oldBulk !== null) {
    // Amend the “bulk” score and the total score.
    deficits.bulk = Math.floor(0.15 * Math.pow(Math.max(0, bulkCount - 250), 0.9));
    const change = deficits.bulk - oldBulk;
    deficits.total += change;
  }
  // Add proc and version data.
  scoreObj.result.scoreProc = 'ally';
  scoreObj.result.version = '7';
  // Save the amended file.
  fs.writeFileSync(`${newDir}/${fn}`, JSON.stringify(reportObj, null, 2));
});
