(() => {
  'use strict';

  const SERVICE_UUID = '78667579-7b48-43db-b8c5-7928a6b0a335';
  const TX_UUID = '78667579-a914-49a4-8333-aa3c0cd8fedc';

  let device = null;
  let characteristic = null;
  let randomTimer = null;
  let countdownTimer = null;
  let randomRunning = false;
  let nextAt = 0;

  const $ = (id) => document.getElementById(id);

  const connectBtn = $('connectBtn');
  const connectionText = $('connectionText');
  const statusDot = $('statusDot');
  const browserWarning = $('browserWarning');
  const slider = $('intensitySlider');
  const intensityValue = $('intensityValue');
  const randomCurrent = $('randomCurrent');
  const nextChange = $('nextChange');

  function setConnected(connected) {
    connectionText.textContent = connected ? (device?.name || 'Nyx connected') : 'Not connected';
    statusDot.classList.toggle('connected', connected);
    connectBtn.textContent = connected ? 'Connected' : 'Connect Nyx';
  }

  function buildCommand(speed) {
    const v = Math.max(0, Math.min(100, Math.round(Number(speed) || 0)));
    return new Uint8Array([
      0x10, 0xff, 0x04, 0x0a, 0x32, 0x32, 0x00,
      0x04, 0x08, v, 0x64, 0x00,
      0x04, 0x08, v, 0x64, 0x01
    ]);
  }

  async function writeIntensity(speed) {
    if (!characteristic) throw new Error('Nyx is not connected');

    const value = Math.max(0, Math.min(100, Math.round(Number(speed) || 0)));
    const data = buildCommand(value);

    if (typeof characteristic.writeValueWithoutResponse === 'function') {
      await characteristic.writeValueWithoutResponse(data);
    } else {
      await characteristic.writeValue(data);
    }

    slider.value = value;
    intensityValue.textContent = value;
    randomCurrent.textContent = `${value}%`;
  }

  async function connectNyx() {
    if (!navigator.bluetooth) {
      browserWarning.classList.remove('hidden');
      return;
    }

    browserWarning.classList.add('hidden');

    try {
      connectBtn.disabled = true;
      connectBtn.textContent = 'Connecting…';

      device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'nyx' }],
        optionalServices: [SERVICE_UUID]
      });

      device.addEventListener('gattserverdisconnected', () => {
        characteristic = null;
        stopRandom(false);
        setConnected(false);
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      characteristic = await service.getCharacteristic(TX_UUID);

      setConnected(true);
    } catch (err) {
      console.error(err);
      setConnected(false);
      alert(`连接失败：${err.message || err}`);
    } finally {
      connectBtn.disabled = false;
    }
  }

  function weightedRandomIntensity() {
    const r = Math.random();
    let min, max;

    if (r < 0.20) {
      [min, max] = [0, 20];
    } else if (r < 0.55) {
      [min, max] = [21, 50];
    } else if (r < 0.85) {
      [min, max] = [51, 80];
    } else {
      [min, max] = [81, 100];
    }

    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomDelayMs() {
    return 2000 + Math.floor(Math.random() * 5001); // 2–7 sec
  }

  function startCountdown(delay) {
    clearInterval(countdownTimer);
    nextAt = Date.now() + delay;

    const update = () => {
      const remain = Math.max(0, nextAt - Date.now());
      nextChange.textContent = remain > 0 ? `${(remain / 1000).toFixed(1)}s` : 'now';
    };

    update();
    countdownTimer = setInterval(update, 100);
  }

  async function scheduleNext() {
    if (!randomRunning) return;

    try {
      const level = weightedRandomIntensity();
      await writeIntensity(level);
    } catch (err) {
      console.error(err);
      stopRandom(false);
      alert(`控制失败：${err.message || err}`);
      return;
    }

    const delay = randomDelayMs();
    startCountdown(delay);
    randomTimer = setTimeout(scheduleNext, delay);
  }

  async function startRandom() {
    if (!characteristic) {
      alert('请先连接 Nyx');
      return;
    }
    if (randomRunning) return;

    randomRunning = true;
    $('startRandomBtn').textContent = 'Running…';
    await scheduleNext();
  }

  async function stopRandom(sendStop = true) {
    randomRunning = false;
    clearTimeout(randomTimer);
    clearInterval(countdownTimer);
    randomTimer = null;
    countdownTimer = null;
    nextChange.textContent = '—';
    $('startRandomBtn').textContent = 'Start random';

    if (sendStop && characteristic) {
      try {
        await writeIntensity(0);
      } catch (err) {
        console.error(err);
      }
    }
  }

  connectBtn.addEventListener('click', connectNyx);

  slider.addEventListener('input', () => {
    intensityValue.textContent = slider.value;
  });

  slider.addEventListener('change', async () => {
    if (!characteristic) {
      alert('请先连接 Nyx');
      slider.value = 0;
      intensityValue.textContent = '0';
      return;
    }
    try {
      await stopRandom(false);
      await writeIntensity(Number(slider.value));
    } catch (err) {
      alert(`控制失败：${err.message || err}`);
    }
  });

  document.querySelectorAll('[data-level]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!characteristic) {
        alert('请先连接 Nyx');
        return;
      }
      try {
        await stopRandom(false);
        await writeIntensity(Number(btn.dataset.level));
      } catch (err) {
        alert(`控制失败：${err.message || err}`);
      }
    });
  });

  $('startRandomBtn').addEventListener('click', startRandom);
  $('stopBtn').addEventListener('click', () => stopRandom(true));

  window.addEventListener('pagehide', () => {
    clearTimeout(randomTimer);
    clearInterval(countdownTimer);
  });

  if (!navigator.bluetooth) {
    browserWarning.classList.remove('hidden');
  }
})();
