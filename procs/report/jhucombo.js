/*
  jhuCombo.js
  Converts JSON jhuWave1 and jhuAxe reports to an HTML jhuCombo report.
  This proc requires 3 arguments:
    0. the suffix of the base of the name of the jhuWave1 report.
    1. the suffix of the base of the name of the jhuAxe report.
    2. the suffix of the base of the name of the jhuCombo report.
*/
// ########## IMPORTS
// Module to access files.
const fs = require('fs').promises;
// Module to keep secrets local.
require('dotenv').config();
// ########## CONSTANTS
// Filenames.
const waveSuffix = process.argv[2] || 'MISSING';
const axeSSuffix = process.argv[3] || 'MISSING';
const comboSuffix = process.argv[4] || 'MISSING';
// Report directory.
const reportDir = process.env.REPORTDIR || 'MISSING';
// ########## FUNCTIONS
// Creates and records an HTML report.
const webify = relArray => {
  const data = relArray
  .map(act => {
    const {score, name, url} = act;
    return `<tr><td>${score}</td><td>${name}</td><td><a href="${url}">${url}</a></td></tr>`;
  })
  .join('\n            ');
  const page = `<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="utf-8">
    <title>Web-page accessibility comparison</title>
    <meta
      name="description"
      content="Comparison of accessibility of web pages per the JHU-Combo rule"
    >
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" href="favicon.png">
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
    <main>
      <h1>Web-page accessibility comparison</h1>
      <section class="etc wide">
        <p>The table below ranks and scores web pages on accessibility, as measured by the <dfn>JHU-Combo rule</dfn>.</p>
        <ol>
          <li>The first step in this rule is to apply the method used by the Johns Hopkins University (<abbr>JHU</abbr>) Disability Health Research Center in producing its <a href="https://disabilityhealth.jhu.edu/vaccinedashboard/webaccess/">Vaccine Website Accessibility dashboard</a>, which uses the <a href="https://wave.webaim.org/api/">WAVE API</a> to rate web pages on accessibility.</li>
          <li>The second step is to apply the same method, except substituting the <a href="https://github.com/dequelabs/axe-core">axe-core</a> ruleset for the WAVE ruleset.</li>
          <li>The third step is to give each page a deficit score equal to the sum of the scores it received in the first two steps.</li>
        </ol>
        <p>This table was produced with <a href="https://github.com/jrpool/autotest">Autotest</a>.</p>
        <table>
          <caption>Results of JHU-Combo test of web pages</caption>
          <thead>
            <tr><th>Deficit</th><th>Name</th><th>URL</th></tr>
          </thead>
          <tbody class="firstCellRight">
            ${data}
          </tbody>
        </table>
      </section>
    </main>
  </body>
</html>
`;
  fs.writeFile(`${reportDir}/report-${comboSuffix}.html`, page);
};
// ########## OPERATION
(async () => {
  const waveJSON = await fs.readFile(`${reportDir}/report-${waveSuffix}.json`);
  const axeSJSON = await fs.readFile(`${reportDir}/report-${axeSSuffix}.json`);
  const waveArray = JSON.parse(waveJSON).sort((a, b) => a.index - b.index);
  const axeSArray = JSON.parse(axeSJSON).sort((a, b) => a.index - b.index);
  const relArray = waveArray
  .map((act, index) => ({
    score: act.score + axeSArray[index].score,
    name: act.name,
    url: act.url
  }))
  .sort((a, b) => a.score - b.score);
  webify(relArray);
})();
