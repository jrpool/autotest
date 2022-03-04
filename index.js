/*
  index.js
  autotest main script.
*/
// ########## IMPORTS
// Module to access files.
const fs = require('fs/promises');
// Module to keep secrets local.
require('dotenv').config();
// Module to create an HTTP server and client.
const http = require('http');
// Module to create an HTTPS server and client.
const https = require('https');
// Create PDF reports
const html_to_pdf = require('html-pdf-node');

const {getWhats, isValidScript, isValidBatch, isValidValidator, scriptHandler, runScriptWithBatch, generateHtmlReportFromData} = require('./core');

const postToSlack = (text) => {
  if (!process.env.SLACK_WEBHOOK_URL) {
    console.error('SLACK_WEBHOOK_URL is not set, not posting to Slack');
    return;
  }
  const req = https.request(process.env.SLACK_WEBHOOK_URL, {
    port: 443,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  }, res => {
    console.log(`slack webhook - statusCode: ${res.statusCode}`);
  });
  req.on('error', error => {
    console.error('slack webhook - error', error);
  });
  req.write(JSON.stringify({text}));
  req.end();
};

// ########## CONSTANTS
// Set debug to true to add debugging features.
const protocol = process.env.PROTOCOL || 'https';
// Files servable without modification.
const statics = {
  '/index.html': 'text/html',
  '/style.css': 'text/css'
};
// URLs to be redirected.
const redirects = {
  '/': '/autotest/index.html',
  '/which.html': '/autotest/run.html'
};
// Pages to be served as error notifications.
const customErrorPageStart = [
  '<html lang="en-US">',
  '  <head>',
  '    <meta charset="utf-8">',
  '    <title>ERROR</title>',
  '  </head>',
  '  <body><main>',
  '    <h1>ERROR</h1>',
  '    <p>__msg__</p>'
];
const systemErrorPageStart = customErrorPageStart.concat(...[
  '    <p>Location:</p>',
  '    <pre>__stack__</pre>'
]);
const errorPageEnd = [
  '  </main></body>',
  '</html>',
  ''
];
const customErrorPage = customErrorPageStart.concat(...errorPageEnd);
const systemErrorPage = systemErrorPageStart.concat(...errorPageEnd);
// ########## FUNCTIONS
// Serves a redirection.
const redirect = (url, response) => {
  response.statusCode = 303;
  response.setHeader('Location', url);
  response.end();
};
// Serves a system error message.
const serveError = (error, response) => {
  if (response.writableEnded) {
    console.log(error.message);
    console.log(error.stack);
  }
  else {
    response.statusCode = 400;
    response.write(
      systemErrorPage
      .join('\n')
      .replace('__msg__', error.message)
      .replace('__stack__', error.stack)
    );
    response.end();
  }
  return '';
};
// Serves a custom error message.
const serveMessage = (msg, response) => {
  if (response.writableEnded) {
    console.log(msg);
  }
  else {
    response.statusCode = 400;
    response.write(customErrorPage.join('\n').replace('__msg__', msg));
    response.end();
  }
  return '';
};
// Serves a page.
const servePage = (content, newURL, mimeType, response) => {
  response.setHeader('Content-Type', `${mimeType}; charset=UTF-8`);
  if (newURL) {
    response.setHeader('Content-Location', newURL);
  }
  response.end(content);
};
// Serves or returns part or all of an HTML or plain-text page.
const render = (path, stage, which, query, response) => {
  if (! response.writableEnded) {
    // If an HTML page is to be rendered:
    if (['all', 'raw'].includes(stage)) {
      // Get the page.
      return fs.readFile(`./${path}/${which}.html`, 'utf8')
      .then(
        // When it arrives:
        page => {
          // Replace its placeholders with eponymous query parameters.
          const renderedPage = page.replace(/__([a-zA-Z]+)__/g, (ph, qp) => query[qp]);
          // If the page is ready to serve in its entirety:
          if (stage === 'all') {
            // Serve it.
            servePage(renderedPage, `/${path}-out.html`, 'text/html', response);
            return '';
          }
          // Otherwise, i.e. if the page needs modification before it is served:
          else {
            return renderedPage;
          }
        },
        error => serveError(new Error(error), response)
      );
    }
    // Otherwise, if a plain-text page is ready to start:
    else if (stage === 'start') {
      // Serve its start.
      response.setHeader('Content-Type', 'text/plain; charset=UTF-8');
      // Set headers to tell the browser to render content chunks as they arrive.
      response.setHeader('Transfer-Encoding', 'chunked');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      if (path) {
        response.setHeader('Content-Location', `/${path}-out.txt`);
      }
      response.write(`Report timestamp: ${query.timeStamp}\n\nProcessed URL 0\n`);
      return '';
    }
    // Otherwise, if a plain-text page is ready to continue:
    else if (stage === 'more') {
      // Serve its continuation.
      response.write(`Processed URL ${query.hostIndex}\n`);
      return '';
    }
    // Otherwise, if a plain-text page is ready to end:
    else if (stage === 'end') {
      // Serve its end.
      response.end(`Processed URL ${query.hostIndex}\n`);
      return '';
    }
    else {
      serveError('ERROR: Invalid stage', response);
    }
  }
};

// Handles a request.
const requestHandler = (request, response) => {
  const {method} = request;
  const bodyParts = [];
  request.on('error', err => {
    console.error(err);
  })
  .on('data', chunk => {
    bodyParts.push(chunk);
  })
  // When the request has arrived:
  .on('end', async () => {
    // Identify its WHATWG URL instance.
    let url = new URL(request.url, `${protocol}://${request.headers.host}`);
    // Identify the pathname, with any initial 'autotest/' segment deleted.
    let pathName = url.pathname;
    if (pathName.startsWith('/autotest/')) {
      pathName = pathName.slice(9);
    }
    else if (pathName === '/autotest') {
      pathName = '/';
    }
    const query = {};
    // Allow scanning requests over GET or POST
    if (pathName === '/api/scan') {
      let searchParams;
      if (method === 'GET') {
        searchParams = url.searchParams;
      } else if (method === 'POST') {
        const queryString = Buffer.concat(bodyParts).toString();
        searchParams = new URLSearchParams(queryString);
      }
      searchParams.forEach((value, name) => {
        query[name] = value;
      });
      const urls = query.url?.split(',') ?? query.text?.split(',') ?? [];

      // TODO: this endpoint only supports one hardcoded report
      const SCRIPT_NAME = 'short';
      
      const urlToFilename = (auditUrl, isSummary = false) => {
        let newUrl = auditUrl;
        if (isSummary) {
          newUrl = `${auditUrl}-summary`;
        }
        // strip off protocol, replace slashes with underscores
        return newUrl.replace('https://', '').replace('http://', '').replace('/', '_');
      };

      const urlToReportUrl = (auditUrl, isSummary = false) => `https://${request.headers.host}/reports/${urlToFilename(auditUrl, isSummary)}.pdf`;

      query.reportDir = process.env.REPORTDIR;
      const server = {query, response, render: () => {}};
      const scriptDir = process.env.SCRIPTDIR || '';
      const scriptJSON = await fs.readFile(`${scriptDir}/${SCRIPT_NAME}.json`, 'utf8');
      const script = JSON.parse(scriptJSON);

      const batch = {
        what: 'Automated Accessibility Scan',
        hosts: urls.map(which => (
          {
            which,
            what: which,
          }))
      };
      if (isValidScript(script) && isValidBatch(batch)) {
        // First, respond immediately with a preview of where reports will be generated
        const progressResponse = `
          <main>
          Audit in progress. Your report(s) will be available at:
          <ul>
          ${urls.map(url => `<li><a href='${urlToReportUrl(url)}'>${urlToFilename(url)}.pdf</a></li>\n
                             <li><a href='${urlToReportUrl(url, true)}'>${urlToFilename(url, true)}.pdf</a></li>\n
          `).join('')}
          </ul>
  </main>
          `;
        response.setHeader('Content-Type', 'text/html; charset=UTF-8');
        response.write(progressResponse);
        response.end();

        // Then start running audits and generating reports
        const REPORT_DIR = process.env.REPORTDIR || '';
        postToSlack(`Starting audit (${urls})`);
        const reports = await runScriptWithBatch(script, batch, server);
        await Promise.all(reports.map(async report => {
          await Promise.all(['passio', 'passio-summary'].map(async (DOC_SUBDIR, index) => {
            // Generate html report
            const template = await fs.readFile(`./docTemplates/${DOC_SUBDIR}/index.html`, 'utf8');
            const {parameters} = require(`./docTemplates/${DOC_SUBDIR}/index`);
            const doc =  await generateHtmlReportFromData('filename', report, template, parameters);
            const auditUrl = report.acts.filter(act => act.type === 'url')[0].which;
            const reportFilename = index === 1 ? `${urlToFilename(auditUrl)}-summary` : urlToFilename(auditUrl) ;
            await fs.writeFile(`${REPORT_DIR}/${reportFilename}.html`, doc);
            // Generate PDF report
            await html_to_pdf.generatePdf({content: doc}, {format: 'A4', path:`${REPORT_DIR}/${reportFilename}.pdf`, margin: {top: 16, bottom: 16}});
          }));
        }));
        
        const slackMessageContent = `
          Audits complete:
          ${urls.map(url => `
            - ${urlToReportUrl(url)}\n
            - ${urlToReportUrl(url, true)}
            `).join('\n')}
          `;
        postToSlack(slackMessageContent);
      }
      else {
        // Serve an error message.
        serveMessage('ERROR: script or batch invalid', response);
      }
    } 
    // If the request method is GET:
    else if (method === 'GET') {
      // Identify a query object, presupposing no query name occurs twice.
      const searchParams = url.searchParams;
      searchParams.forEach((value, name) => {
        query[name] = value;
      });
      let type = statics[pathName];
      let encoding;
      if (type) {
        encoding = 'utf8';
      }
      else if (pathName.endsWith('.png')) {
        type = 'image/png';
        encoding = null;
      }
      const target = redirects[pathName];
      // If a requestable static file is requested:
      if (type) {
        // Get the file content.
        const content = await fs.readFile(pathName.slice(1), encoding);
        // When it has arrived, serve it.
        servePage(content, pathName, type, response);
      }
      // Otherwise, if the request must be redirected:
      else if (target) {
        // Redirect it.
        redirect(target, response);
      }
      // Otherwise, if the site icon was requested:
      else if (pathName === '/favicon.ico') {
        // Get the file content.
        const content = await fs.readFile('favicon.png');
        // When it has arrived, serve it.
        response.setHeader('Content-Type', 'image/png');
        response.write(content, 'binary');
        response.end();
      }
      // Otherwise, if the run page was requested:
      else if (pathName === '/run.html') {
        // Add properties to the query.
        query.scriptDir = process.env.SCRIPTDIR || '';
        query.batchDir = process.env.BATCHDIR || '';
        query.reportDir = process.env.REPORTDIR || '';
        // Render the page.
        render('', 'all', 'run', query, response);
      }
      // Otherwise, if the validate page was requested:
      else if (pathName === '/validate.html') {
        // Add properties to the query.
        const validators = await fs.readdir('validation/scripts');
        query.validatorSize = validators.length;
        const validatorNames = validators.map(name => name.slice(0, -5));
        query.validatorNames = validatorNames
        .map(name => `<option value="${name}">${name}</option>`)
        .join('\n              ');
        query.reportDir = process.env.REPORTDIR || '';
        // Render the page.
        render('', 'all', 'validate', query, response);
      }
      // Otherwise, i.e. if the URL is invalid:
      else {
        serveMessage('ERROR: Invalid URL', response);
      }
    }
    // Otherwise, if the request method is POST:
    else if (method === 'POST') {
      // Get a query string from the request body.
      const queryString = Buffer.concat(bodyParts).toString();
      // Create a query object.
      const searchParams = new URLSearchParams(queryString);
      searchParams.forEach((value, name) => {
        query[name] = value;
      });
      // Add a timeStamp for any required report file to the query.
      query.timeStamp = Math.floor((Date.now() - Date.UTC(2021, 4)) / 10000).toString(36);
      // If the request submitted the run form:
      if (pathName === '/run' && query.scriptDir && query.batchDir && query.reportDir) {
        const {scriptDir, batchDir} = query;
        // Get an array of the names of the files in the script directory.
        const scriptFileNames = await fs.readdir(scriptDir);
        // When the array arrives, get an array of script names from it.
        const scriptNames = scriptFileNames
        .filter(name => name.endsWith('.json'))
        .map(name => name.slice(0, -5));
        // If any exist:
        if (scriptNames.length) {
          // Add their count to the query.
          query.scriptSize = scriptNames.length;
          // Get their descriptions.
          const scriptWhats = await getWhats(scriptDir, scriptNames, []);
          // When the descriptions arrive, add them as options to the query.
          query.scriptNames = scriptWhats.map((pair, index) => {
            const state = index === 0 ? 'selected ' : '';
            return `<option ${state}value="${pair[0]}">${pair[0]}: ${pair[1]}</option>`;
          }).join('\n              ');
          // Request an array of the names of the files in the batch directory.
          const batchFileNames = await fs.readdir(batchDir);
          // When the array arrives, get an array of batch names from it.
          const batchNames = batchFileNames
          .filter(name => name.endsWith('.json'))
          .map(name => name.slice(0, -5));
          // Get their descriptions.
          const batchWhats = await getWhats(batchDir, batchNames, []);
          // Prepend a no-batch option to the name/description array.
          batchWhats.unshift(['None', 'Perform the script without a batch']);
          // Add the count of batches to the query.
          query.batchSize = batchWhats.length;
          // Add the batch names and descriptions as options to the query.
          query.batchNames = batchWhats.map((pair, index) => {
            const state = index === 0 ? 'selected ' : '';
            return `<option ${state}value="${pair[0]}">${pair[0]}: ${pair[1]}</option>`;
          }).join('\n              ');
          // Render the choice page.
          render('', 'all', 'which', query, response);
        }
        // Otherwise, i.e. if no scripts exist in the script directory:
        else {
          // Serve an error message.
          serveMessage(`ERROR: No scripts in ${scriptDir}`, response);
        }
      }
      // Otherwise, if the request submitted the run-which form:
      else if (
        pathName === '/which'
        && query.scriptDir
        && query.batchDir
        && query.reportDir
        && query.scriptName
        && query.batchName
      ) {
        const {scriptDir, batchDir, scriptName, batchName} = query;
        // Get the content of the script.
        const scriptJSON = await fs.readFile(`${scriptDir}/${scriptName}.json`, 'utf8');
        // When the content arrives, if there is any:
        if (scriptJSON) {
          // Get the script data.
          const script = JSON.parse(scriptJSON);
          // If the script is valid:
          if (isValidScript(script)) {
            const {what, strict, commands} = script;
            console.log(`>>>>>>>> ${scriptName}: ${what}`);
            const server = { render, query, response };
            // If there is no batch:
            if (batchName === 'None') {
              // Process the script, using the commands as the initial acts.
              await scriptHandler(what, strict, commands, 'all', -1, server);
            }
            // Otherwise, i.e. if there is a batch:
            else {
              // Get its content.
              const batchJSON = await fs.readFile(`${batchDir}/${batchName}.json`, 'utf8');
              // When the content arrives, if there is any:
              if (batchJSON) {
                // Get the batch data.
                const batch = JSON.parse(batchJSON);
                // If the batch is valid:
                if (isValidBatch(batch)) {
                  await runScriptWithBatch(script, batch, server);
                }
                // Otherwise, i.e. if the batch is invalid:
                else {
                  // Serve an error message.
                  serveMessage(`ERROR: Batch ${batchName} invalid`, response);
                }
              }
              // Otherwise, i.e. if the batch has no content:
              else {
                // Serve an error message.
                serveMessage(`ERROR: Batch ${batchName} empty`, response);
              }
            }
          }
          // Otherwise, i.e. if the script is invalid:
          else {
            // Serve an error message.
            serveMessage(`ERROR: Script ${scriptName} invalid`, response);
          }
        }
        // Otherwise, i.e. if the script has no content:
        else {
          // Serve an error message.
          serveMessage(`ERROR: Script ${scriptName} empty`, response);
        }
      }
      // Otherwise, if the request submitted the validate form:
      else if (pathName === '/validate' && query.validatorName && query.reportDir) {
        const {validatorName} = query;
        // Get the content of the validator script.
        const scriptJSON = await fs.readFile(`validation/scripts/${validatorName}.json`, 'utf8');
        // When the content arrives, if there is any:
        if (scriptJSON) {
          // Get the script data.
          const script = JSON.parse(scriptJSON);
          // If the validator is valid:
          if (isValidValidator(script)) {
            console.log(`>>>>>>>> ${validatorName}: ${what}`);
            // Process it, using the commands as the initial acts.
            const {what, strict, commands} = script;
            const server = { render, query, response };
            scriptHandler(what, strict, commands, 'all', -1, server);
          }
          // Otherwise, i.e. if the validator is invalid:
          else {
            // Serve an error message.
            serveMessage(`ERROR: Validator script ${validatorName} invalid`, response);
          }
        }
        // Otherwise, i.e. if the validator has no content:
        else {
          // Serve an error message.
          serveMessage(`ERROR: Validator script ${validatorName} empty`, response);
        }
      }
      // Otherwise, i.e. if the request is invalid:
      else {
        // Serve an error message.
        serveMessage('ERROR: Form submission invalid', response);
      }
    }
  });
};
// ########## SERVER
const serve = (protocolModule, options) => {
  const server = protocolModule.createServer(options, requestHandler);
  const host = process.env.HOST || 'localhost';
  // Choose the port specified by the argument or the .env file.
  const port = process.argv[2] || process.env.PORT || '3000';
  server.listen(port, () => {
    console.log(`Server listening at ${protocol}://${host}:${port}.`);
  });
};
if (protocol === 'http') {
  serve(http, {});
}
else if (protocol === 'https') {
  fs.readFile(process.env.KEY)
  .then(
    key => {
      fs.readFile(process.env.CERT)
      .then(
        cert => {
          serve(https, {key, cert});
        },
        error => console.log(error.message)
      );
    },
    error => console.log(error.message)
  );
}
