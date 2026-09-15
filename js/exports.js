/* ===== 导出全局 ===== */
window.renderPeriod = renderPeriod;
window.changePeriodMonth = changePeriodMonth;
window.recordPeriodDay = recordPeriodDay;
window.closePeriodRecordPanel = closePeriodRecordPanel;
window.selectPeriodFlow = selectPeriodFlow;
window.selectPeriodPain = selectPeriodPain;
window.togglePeriodMark = togglePeriodMark;
window.endPeriodNow = endPeriodNow;
window.cancelPeriodRecord = cancelPeriodRecord;
window.checkPeriodReminder = checkPeriodReminder;
window.closePeriodReminder = closePeriodReminder;
window.savePeriodRecord = savePeriodRecord;
window.renderHomeQuote = renderHomeQuote;
window.renderQuotes = renderQuotes;
window.addQuote = addQuote;
window.editQuote = editQuote;
window.deleteQuote = deleteQuote;
window.importQuotesJSON = importQuotesJSON;
window.exportQuotesJSON = exportQuotesJSON;
window.deduplicateQuotes = deduplicateQuotes;
window.renderShop = renderShop;
window.renderShopCart = renderShopCart;
window.ShopApp = ShopApp;

/* RL7 hard-fix loader v3 */
(function () {
  var old = document.getElementById('rl7-patches-loader');
  if (old) old.remove();
  var s = document.createElement('script');
  s.id = 'rl7-patches-loader';
  s.src = 'js/rl7-patches.js?v=20260915-hardfix22';
  s.async = false;
  document.head.appendChild(s);
})();
