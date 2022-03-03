// Passio template placeholder replacements.
exports.parameters = (
  fn, sourceData, testData, scoreData, scoreProc, version, orgData, testDate
) => {
  // Newlines with indentations.
  const innerJoiner = '\n        ';

  // Get general data for scoreDoc.
  const paramData = {};
  const date = new Date();
  paramData.dateISO = date.toISOString().slice(0, 10);
  paramData.dateSlash = paramData.dateISO.replace(/-/g, '/');
  paramData.file = fn;
  paramData.testDate = testDate;
  paramData.scoreProc = scoreProc;
  paramData.version = version;
  paramData.org = orgData.what;
  paramData.url = orgData.which;
  const {deficit} = scoreData;
  paramData.totalScore = deficit.total;
  const deficitTypes = Object.keys(deficit);

  const scoreIsGreen = deficit.total < 450;
  const scoreIsYellow = deficit.total > 450 && deficit.total < 1000;
  const scoreIsOrange = deficit.total > 999 && deficit.total < 2000;

  paramData.scoreIndicatorGraphic = scoreIsGreen ? `<svg width="120" height="33" viewBox="0 0 120 33" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0.0224266 0.00653076H30.0223V20.0065H0.0224266V0.00653076Z" fill="#6AA84F"/>
  <path d="M30.0223 0.00653076H60.0222V20.0065H30.0223V0.00653076Z" fill="#F1C232"/>
  <path d="M60.0225 0.00653076L90.0225 0.00653076V20.0065H60.0225V0.00653076Z" fill="#E69138"/>
  <path d="M90.0224 0.00653076H120.022V20.0065H90.0224V0.00653076Z" fill="#CC0000"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M15.0229 14.739C16.8568 14.739 23.9687 28.9636 23.0228 30.7396C22.0816 32.5061 7.88211 32.35 7.02287 30.7396C6.06269 28.9392 13.3007 14.739 15.0229 14.739Z" fill="black"/>
  </svg>` : scoreIsYellow ? `<svg width="120" height="33" viewBox="0 0 120 33" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8.96454e-05 0.00653076H30V20.0065H8.96454e-05V0.00653076Z" fill="#6AA84F"/>
  <path d="M30 0.00653076H59.9999V20.0065H30V0.00653076Z" fill="#F1C232"/>
  <path d="M60.0001 0.00653076L90 0.00653076V20.0065L60.0001 20.0065V0.00653076Z" fill="#E69138"/>
  <path d="M90.0001 0.00653076H120V20.0065H90.0001V0.00653076Z" fill="#CC0000"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M44.9139 14.739C46.7478 14.739 53.8597 28.9636 52.9138 30.7396C51.9725 32.5061 37.7731 32.35 36.9139 30.7396C35.9537 28.9392 43.1917 14.739 44.9139 14.739Z" fill="black"/>
  </svg>` : scoreIsOrange ? `<svg width="120" height="33" viewBox="0 0 120 33" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0.0548992 0.00653076H30.0548V20.0065H0.0548992V0.00653076Z" fill="#6AA84F"/>
  <path d="M30.0548 0.00653076H60.0547V20.0065H30.0548V0.00653076Z" fill="#F1C232"/>
  <path d="M60.0549 0.00653076L90.0548 0.00653076V20.0065H60.0549V0.00653076Z" fill="#E69138"/>
  <path d="M90.0548 0.00653076H120.055V20.0065H90.0548V0.00653076Z" fill="#CC0000"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M75.0553 14.739C76.8892 14.739 84.0011 28.9636 83.0551 30.7396C82.1139 32.5061 67.9145 32.35 67.0552 30.7396C66.095 28.9392 73.3331 14.739 75.0553 14.739Z" fill="black"/>
  </svg>` : `<svg width="120" height="33" viewBox="0 0 120 33" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0.137655 0.0291138H30.1376V20.0291H0.137655V0.0291138Z" fill="#6AA84F"/>
  <path d="M30.1375 0.0291138H60.1375V20.0291H30.1375V0.0291138Z" fill="#F1C232"/>
  <path d="M60.1378 0.0291138L90.1377 0.0291138V20.0291L60.1378 20.0291V0.0291138Z" fill="#E69138"/>
  <path d="M90.1377 0.0291138H120.138V20.0291H90.1377V0.0291138Z" fill="#CC0000"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M105.138 14.7615C106.972 14.7615 114.084 28.9862 113.138 30.7621C112.197 32.5287 97.9972 32.3725 97.138 30.7621C96.1778 28.9617 103.416 14.7615 105.138 14.7615Z" fill="black"/>
  </svg>`;

  // only show failing tests by filtering out anything with a score of 0 (passed tests) or null (inferred score)
  paramData.deficitSummary = deficitTypes
  .sort((a, b) => deficit[b] - deficit[a])
  .filter(type => type !== 'total' && deficit[type] > 0 && deficit[type] !== 0)
  .map(type => `<div><code class="bold">${type}:</code> did not pass</div>`)
  .join(innerJoiner);
  return paramData;
};
