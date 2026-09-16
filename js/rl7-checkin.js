/* RL7 Check In v1
 * Adds a manual Check In action to the chat + menu.
 * Uses the existing RL7 whereabouts source / Location + Activity pools.
 */
(function () {
  'use strict';

  if (window.__rl7CheckInV1Installed) return;
  window.__rl7CheckInV1Installed = true;

  var LOC_KEY = 'rl7_whereabout_locations_v2';
  var ACT_KEY = 'rl7_whereabout_actions_v2';

  var CHECK_IN_LINES = [
    'What are you doing?',
    'What are you up to?',
    'Checking in ♡',
    'Where are you?',
    'Whatcha doing?',
    'Just checking on you.',
    "What's my husband up to?",
    'Status report, please.'
  ];

  var TEASING_LINES = [
    'Checking up on me?',
    'Missed me already?',
    'Keeping tabs on me, darling?',
    'Curious about your husband, are we?',
    'Aw. Were you wondering where I was?',
    "You could've just said you missed me.",
    "Checking whether I'm behaving?",
    'Need to know where I am at all times, hm?',
    'How attentive of you.',
    "Worried I've wandered off somewhere interesting?",
    'And here I thought you were trying to play it cool.',
    'Looking for me, love?'
  ];

  function pick(a) {
    return a && a.length ? a[Math.floor(Math.random() * a.length)] : '';
  }

  function readArray(key) {
    try {
      var x = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(x) ? x.map(function(v){ return String(v || '').trim(); }).filter(Boolean) : [];
    } catch (_) {
      return [];
    }
  }

  function currentChatId() {
    try {
      if (typeof window._currentChatId === 'function') {
        var id = window._currentChatId();
        if (id) return id;
      }
    } catch (_) {}
    var page = document.getElementById('page-chat-room');
    return page && page.dataset ? (page.dataset.chatId || '') : '';
  }

  function whereabouts() {
    /* First preference: the existing RL7 whereabouts source.
       This keeps manual Check In on the same Location/Activity logic as reports. */
    try {
      if (typeof window._getWhereaboutSource === 'function') {
        var source = window._getWhereaboutSource();
        if (Array.isArray(source) && source.length) {
          var x = pick(source) || {};
          return {
            place: String(x.place || '').trim(),
            action: String(x.action || '').trim()
          };
        }
      }
    } catch (_) {}

    /* Fallback: the exact same two RL7 pools. */
    return {
      place: pick(readArray(LOC_KEY)),
      action: pick(readArray(ACT_KEY))
    };
  }

  function activitySentence(place, action) {
    place = String(place || '').trim();
    action = String(action || '').trim();

    if (place && action) {
      var a = action.replace(/[.!?]+$/, '');
      return "I'm at " + place + ", " + a + ".";
    }
    if (place) return "I'm at " + place + ".";
    if (action) return "I'm " + action.replace(/[.!?]+$/, '') + ".";
    return "I'm around. Nothing particularly dramatic at the moment.";
  }

  function pushMessage(chatId, type, text) {
    var now = Date.now();
    var messages = [];
    try { messages = Storage.getMessages(chatId) || []; } catch (_) {}

    messages.push({
      id: now + Math.floor(Math.random() * 1000),
      type: type,
      text: text,
      time: now,
      msgType: 'text'
    });

    try { Storage.setMessages(chatId, messages); } catch (_) {}
    try { if (typeof updateLastMsg === 'function') updateLastMsg(chatId, text); } catch (_) {}
    try { if (typeof renderChatMessages === 'function') renderChatMessages(chatId); } catch (_) {}
  }

  function closePlusPanel() {
    try {
      var area = document.getElementById('chat-panel-area');
      var plus = document.getElementById('plus-panel');
      if (area) area.classList.remove('open-plus');
      if (plus) plus.classList.remove('active');
    } catch (_) {}
  }

  function showTyping(on) {
    try {
      var bubble = document.getElementById('chat-typing-bubble');
      if (!bubble) return;
      if (on) bubble.classList.add('show');
      else bubble.classList.remove('show');
    } catch (_) {}
  }

  function runCheckIn() {
    var chatId = currentChatId();
    if (!chatId) return;

    closePlusPanel();

    var mine = pick(CHECK_IN_LINES);
    pushMessage(chatId, 'self', mine);
    try { if (window.App && App.playSound) App.playSound('send'); } catch (_) {}

    var wa = whereabouts();
    var reply = activitySentence(wa.place, wa.action);

    /* About 45%: add a second teasing sentence.
       Otherwise: only the straightforward whereabouts reply. */
    if (Math.random() < 0.45) {
      reply += ' ' + pick(TEASING_LINES);
    }

    showTyping(true);

    /* Small natural reply delay; location/activity were already chosen at click time. */
    var delay = 650 + Math.floor(Math.random() * 850);
    setTimeout(function () {
      showTyping(false);
      pushMessage(chatId, 'other', reply);
      try { if (window.App && App.playSound) App.playSound('receive'); } catch (_) {}
    }, delay);
  }

  function installMenuItem() {
    var grid = document.getElementById('plus-menu-grid');
    if (!grid) return false;
    if (document.getElementById('plus-menu-checkin')) return true;

    var pages = grid.querySelectorAll('.plus-menu-page');
    if (!pages.length) return false;

    /* Second page currently has spare room, so this avoids disturbing page 1. */
    var target = pages.length > 1 ? pages[1] : pages[0];

    var item = document.createElement('div');
    item.className = 'plus-menu-item';
    item.id = 'plus-menu-checkin';
    item.innerHTML = '<i class="fas fa-location-dot"></i><span>Check In</span>';
    item.addEventListener('click', runCheckIn);

    target.insertBefore(item, target.firstChild);
    return true;
  }

  window.rl7CheckIn = runCheckIn;

  function boot() {
    installMenuItem();

    /* The app can repaint panels during navigation; quietly restore the item if needed. */
    var observer = new MutationObserver(function () {
      if (!document.getElementById('plus-menu-checkin')) installMenuItem();
    });

    var root = document.getElementById('app') || document.body;
    if (root) observer.observe(root, { childList: true, subtree: true });

    [100, 400, 1000, 2500].forEach(function(ms){
      setTimeout(installMenuItem, ms);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
