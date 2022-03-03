/*
  index.js
  autotest main script.
*/
// ########## IMPORTS
// Module to access files.
const fs = require('fs/promises');
// Module to keep secrets local.
require('dotenv').config();
// Create PDF reports
const html_to_pdf = require('html-pdf-node');

const {
 
  generateHtmlReportFromData,
} = require('./core');

const DOCS_SUBDIR = 'passio-summary';
const REPORT_DIR = process.env.REPORTDIR || '';
const urlToFilename = (auditUrl) => auditUrl.replace('https://', '').replace('http://', '').replace('/', '_');

const init = async () => {
  const report = JSON.parse(await fs.readFile(`${REPORT_DIR}/report-undefined-000.json`, 'utf8'));
  const template = await fs.readFile(
    `./docTemplates/${DOCS_SUBDIR}/index.html`,
    'utf8'
  );
  const { parameters } = require(`./docTemplates/${DOCS_SUBDIR}/index`);
  const doc = await generateHtmlReportFromData(
    'filename',
    report,
    template,
    parameters
  );
  const auditUrl = report.acts.filter((act) => act.type === 'url')[0].which;
  const reportFilename = urlToFilename(auditUrl);
  await fs.writeFile(`${REPORT_DIR}/${reportFilename}.html`, doc);
  // Generate PDF report
  await html_to_pdf.generatePdf(
    { content: doc },
    {
      format: 'A4',
      path: `${REPORT_DIR}/${reportFilename}.pdf`,
      margin: { top: 16, bottom: 16 },
    }
  );
};

init();
