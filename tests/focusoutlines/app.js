// Tabulates and lists focusable elements with and without outlines when focused.
exports.reporter = async page => {
  const data = await require('../../procs/test/focusOutline').focusOutline(page, false);
  return {result: data};
};
