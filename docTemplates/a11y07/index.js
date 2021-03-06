// a11y version 7 template placeholder replacements.
exports.parameters = (
  fn, sourceData, testData, scoreData, scoreProc, version, orgData, testDate
) => {
  // Makes strings HTML-safe.
  const htmlEscape = textOrNumber => textOrNumber
  .toString()
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;');
  // Newlines with indentations.
  const joiner = '\n      ';
  const innerJoiner = '\n        ';
  // Creates messages about results of packaged tests.
  const packageSucceedText = package =>
    `<p>The page <strong>passed</strong> the <code>${package}</code> test.</p>`;
  const packageFailText = (score, package, failures) =>
    `<p>The page <strong>did not pass</strong> the <code>${package}</code> test and received a score of ${score} on <code>${package}</code>. The details are in the <a href="../jsonReports/${fn}">JSON-format file</a>, in the section starting with <code>"which": "${package}"</code>. There was at least one failure of:</p>${joiner}<ul>${innerJoiner}${failures}${joiner}</ul>`;
  // Creates messages about results of custom tests.
  const customSucceedText =
    test => `<p>The page <strong>passed</strong> the <code>${test}</code> test.</p>`;
  const customFailText = (score, test) =>
    `<p>The page <strong>did not pass</strong> the <code>${test}</code> test and received a score of ${score} on <code>${test}</code>. The details are in the <a href="../jsonReports/${fn}">JSON-format file</a>, in the section starting with <code>"which": "${test}"</code>.</p>`;
  const testCrashText = (score, test) => `<p>The <code>${test}</code> test could not be performed. The page received an inferred score of ${score} on <code>${test}</code>.</p>`;
  const customFailures = failObj => Object
  .entries(failObj)
  .map(entry => `<li>${entry[0]}: ${entry[1]}</li>`)
  .join(innerJoiner);
  const customFailMore = failures =>
    `<p>Summary of the details:</p>${joiner}<ul>${innerJoiner}${failures}${joiner}</ul>`;
  const customResult = (score, test, failures) =>
    `${customFailText(score, test)}${joiner}${customFailMore(failures)}`;
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
  // Get summary-table data for scoreDoc.
  const deficitData = Object.assign({}, deficit, scoreData.inferences);
  const deficitTypes = Object.keys(deficitData);
  paramData.deficitRows = deficitTypes
  .sort((a, b) => deficitData[b] - deficitData[a])
  .map(type => `<tr><th>${type}</th><td>${deficitData[type]}</td></tr>`)
  .join(innerJoiner);
  paramData.scoreTable = JSON.stringify(scoreData.deficit, null, 2).replace(/^\{\n|[}","]/g, '');
  // Get package-test result messages for scoreDoc.
  if (deficit.axe) {
    const axeFailures = testData.axe.result.items.map(
      item => `<li>${item.rule}: ${htmlEscape(item.description)}</li>`
    ).join(innerJoiner);
    paramData.axeResult = packageFailText(deficit.axe, 'axe', axeFailures);
  }
  else if (scoreData.inferences.axe) {
    paramData.axeResult = testCrashText(deficitData.axe, 'axe');
  }
  else {
    paramData.axeResult = packageSucceedText('axe');
  }
  if (deficit.ibm) {
    const {result} = testData.ibm;
    const contentItems = result.content.items;
    const urlItems = result.url.items;
    const items = [];
    if (contentItems) {
      items.push(...contentItems);
    }
    if (urlItems) {
      items.push(...urlItems);
    }
    const ibmFailures = Array.from(new Set(items.map(
      item => `<li>${item.ruleId}: ${htmlEscape(item.message)}</li>`
    )).values()).join(innerJoiner);
    paramData.ibmResult = packageFailText(deficit.ibm, 'ibm', ibmFailures);
  }
  else if (scoreData.inferences.ibm) {
    paramData.ibmResult = testCrashText(deficitData.ibm, 'ibm');
  }
  else {
    paramData.ibmResult = packageSucceedText('ibm');
  }
  if (deficit.wave) {
    const waveResult = testData.wave.result.categories;
    const waveItems = [];
    ['error', 'contrast', 'alert'].forEach(category => {
      waveItems.push(
        ... Object
        .entries(waveResult[category].items)
        .map(entry => `<li>${category}/${entry[0]}: ${entry[1].description}</li>`)
      );
    });
    const waveFailures = waveItems.join(innerJoiner);
    paramData.waveResult = packageFailText(deficit.wave, 'wave', waveFailures);
  }
  else if (scoreData.inferences.wave) {
    paramData.waveResult = testCrashText(deficitData.wave, 'wave');
  }
  else {
    paramData.waveResult = packageSucceedText('wave');
  }
  // Get custom-test result messages for scoreDoc.
  if (deficit.bulk) {
    paramData.bulkResult = `The page <strong>did not pass</strong> the <code>bulk</code> test. The count of visible elements in the page was ${testData.bulk.result.visibleElements}, resulting in a score of ${deficit.bulk} on <code>bulk</code>.`;
  }
  else if (scoreData.inferences.bulk) {
    paramData.bulkResult = testCrashText(deficitData.bulk, 'bulk');
  }
  else {
    paramData.bulkResult = customSucceedText('bulk');
  }
  if (deficit.embAc) {
    const failures = customFailures(testData.embAc.result.totals);
    paramData.embAcResult = customResult(deficit.embAc, 'embAc', failures);
  }
  else if (scoreData.inferences.embAc) {
    paramData.embAcResult = testCrashText(deficitData.ebmAc, 'ebmAc');
  }
  else {
    paramData.embAcResult = customSucceedText('embAc');
  }
  if (deficit.focAll) {
    const failures = customFailures(testData.focAll.result);
    paramData.focAllResult = customResult(deficit.focAll, 'focAll', failures);
  }
  else if (scoreData.inferences.focAll) {
    paramData.focAllResult = testCrashText(deficitData.focAll, 'focAll');
  }
  else {
    paramData.focAllResult = customSucceedText('focAll');
  }
  if (deficit.focInd) {
    const failSource = testData.focInd.result.totals.types;
    const failObj = {
      indicatorMissing: failSource.indicatorMissing.total,
      nonOutlinePresent: failSource.nonOutlinePresent.total
    };
    const failures = customFailures(failObj);
    paramData.focIndResult = customResult(deficit.focInd, 'focInd', failures);
  }
  else if (scoreData.inferences.focInd) {
    paramData.focIndResult = testCrashText(deficitData.focInd, 'focInd');
  }
  else {
    paramData.focIndResult = customSucceedText('focInd');
  }
  if (deficit.focOp) {
    const failSource = testData.focOp.result.totals.types;
    const failObj = {
      onlyFocusable: failSource.onlyFocusable.total,
      onlyOperable: failSource.onlyOperable.total
    };
    const failures = customFailures(failObj);
    paramData.focOpResult = customResult(deficit.focOp, 'focOp', failures);
  }
  else if (scoreData.inferences.focOp) {
    paramData.focOpResult = testCrashText(deficitData.focOp, 'focOp');
  }
  else {
    paramData.focOpResult = customSucceedText('focOp');
  }
  if (deficit.hover) {
    const failures = customFailures(testData.hover.result.totals);
    paramData.hoverResult = customResult(deficit.hover, 'hover', failures);
  }
  else if (scoreData.inferences.hover) {
    paramData.hoverResult = testCrashText(deficitData.hover, 'hover');
  }
  else {
    paramData.hoverResult = customSucceedText('hover');
  }
  if (deficit.labClash) {
    const {totals} = testData.labClash.result;
    delete totals.wellLabeled;
    const failures = customFailures(totals);
    paramData.labClashResult = customResult(deficit.labClash, 'labClash', failures);
  }
  else if (scoreData.inferences.labClash) {
    paramData.labClashResult = testCrashText(deficitData.labClash, 'labClash');
  }
  else {
    paramData.labClashResult = customSucceedText('labClash');
  }
  if (deficit.linkUl) {
    const failures = customFailures(testData.linkUl.result.totals.inline);
    paramData.linkUlResult = customResult(deficit.linkUl, 'linkUl', failures);
  }
  else if (scoreData.inferences.linkUl) {
    paramData.linkUlResult = testCrashText(deficitData.linkUl, 'linkUl');
  }
  else {
    paramData.linkUlResult = customSucceedText('linkUl');
  }
  if (deficit.log) {
    const {logCount, logSize, visitRejectionCount, prohibitedCount, visitTimeoutCount} = sourceData;
    const logData = {logCount, logSize, visitRejectionCount, prohibitedCount, visitTimeoutCount};
    const failures = customFailures(logData);
    paramData.logResult = customResult(deficit.log, 'log', failures);
  }
  else if (scoreData.inferences.log) {
    paramData.logResult = testCrashText(deficitData.log, 'log');
  }
  else {
    paramData.logResult = customSucceedText('log');
  }
  if (deficit.menuNav) {
    const failSource = testData.menuNav.result.totals;
    const failObj = {
      navigations: failSource.navigations.all.incorrect,
      menuItems: failSource.menuItems.incorrect,
      menus: failSource.menus.incorrect
    };
    const failures = customFailures(failObj);
    paramData.menuNavResult = customResult(deficit.menuNav, 'menuNav', failures);
  }
  else if (scoreData.inferences.menuNav) {
    paramData.menuNavResult = testCrashText(deficitData.menuNav, 'menuNav');
  }
  else {
    paramData.menuNavResult = customSucceedText('menuNav');
  }
  if (deficit.motion) {
    const {result} = testData.motion;
    result.bytes = result.bytes.join(', ');
    result.localRatios = result.localRatios.join(', ');
    result.pixelChanges = result.pixelChanges.join(', ');
    const failures = customFailures(result);
    paramData.motionResult = customResult(deficit.motion, 'motion', failures);
  }
  else if (scoreData.inferences.motion) {
    paramData.motionResult = testCrashText(deficitData.motion, 'motion');
  }
  else {
    paramData.motionResult = customSucceedText('motion');
  }
  if (deficit.radioSet) {
    const failures = customFailures(testData.radioSet.result.totals);
    paramData.radioSetResult = customResult(deficit.radioSet, 'radioSet', failures);
  }
  else if (scoreData.inferences.radioSet) {
    paramData.radioSetResult = testCrashText(deficitData.radioSet, 'radioSet');
  }
  else {
    paramData.radioSetResult = customSucceedText('radioSet');
  }
  if (deficit.role) {
    const {result} = testData.role;
    delete result.tagNames;
    const failures = customFailures(result);
    paramData.roleResult = customResult(deficit.role, 'role', failures);
  }
  else if (scoreData.inferences.role) {
    paramData.roleResult = testCrashText(deficitData.role, 'role');
  }
  else {
    paramData.roleResult = customSucceedText('role');
  }
  if (deficit.styleDiff) {
    const {totals} = testData.styleDiff.result;
    const styleCounts = {};
    Object.keys(totals).forEach(key => {
      const data = totals[key];
      const count = data.subtotals ? data.subtotals.length : 1;
      styleCounts[key] = `${count} ${count === 1 ? 'style' : 'different styles'}`;
    });
    const failures = customFailures(styleCounts);
    paramData.styleDiffResult = customResult(deficit.styleDiff, 'styleDiff', failures);
  }
  else if (scoreData.inferences.styleDiff) {
    paramData.styleDiffResult = testCrashText(deficitData.styleDiff, 'styleDiff');
  }
  else {
    paramData.roleResult = customSucceedText('role');
  }
  if (deficit.tabNav) {
    const failSource = testData.tabNav.result.totals;
    const failObj = {
      navigations: failSource.navigations.all.incorrect,
      tabElements: failSource.tabElements.incorrect,
      tabLists: failSource.tabLists.incorrect
    };
    const failures = customFailures(failObj);
    paramData.tabNavResult = customResult(deficit.tabNav, 'tabNav', failures);
  }
  else if (scoreData.inferences.tabNav) {
    paramData.tabNavResult = testCrashText(deficitData.tabNav, 'tabNav');
  }
  else {
    paramData.tabNavResult = customSucceedText('tabNav');
  }
  if (deficit.zIndex) {
    const {tagNames} = testData.zIndex.result.totals;
    const failures = customFailures(tagNames);
    paramData.zIndexResult = customResult(deficit.zIndex, 'zIndex', failures);
  }
  else if (scoreData.inferences.zIndex) {
    paramData.zIndexResult = testCrashText(deficitData.zIndex, 'zIndex');
  }
  else {
    paramData.zIndexResult = customSucceedText('zIndex');
  }
  return paramData;
};
