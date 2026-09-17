/* RL7 Private Frequency → Bluefy redirect
   Add this file as js/private-frequency-bluefy.js
*/
(function () {
  'use strict';

  var TARGET = 'https://lil22016.github.io/shixinjie-RL7/nyx-control.html';

  window.openPrivateFrequency = function () {
    // Already in Bluefy / any browser with Web Bluetooth: open Nyx directly.
    if (navigator.bluetooth) {
      window.location.href = TARGET;
      return;
    }

    var isiOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // iPhone/iPad PWA/Safari → Bluefy, already pointed at the Nyx page.
    if (isiOS) {
      window.location.href =
        'bluefy://open?url=' + encodeURIComponent(TARGET);
      return;
    }

    // Desktop fallback.
    window.location.href = 'nyx-control.html';
  };
})();
