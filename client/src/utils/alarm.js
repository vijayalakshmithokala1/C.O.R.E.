/**
 * alarm.js — Web Audio API alarm synthesizer for C.O.R.E.
 * Generates all sounds programmatically — no audio files required.
 */

let audioCtx = null;

function getCtx() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/**
 * Play a single beep tone.
 * @param {number} freq       - Frequency in Hz
 * @param {number} startTime  - AudioContext time to start
 * @param {number} duration   - Duration in seconds
 * @param {number} gain       - Volume 0–1
 * @param {'sine'|'square'|'sawtooth'} type - Waveform
 */
function beep(freq, startTime, duration, gain = 0.6, type = 'square') {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
  gainNode.gain.setValueAtTime(gain, startTime + duration - 0.03);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * INCIDENT ALARM — urgent triple-beep pattern
 * Played when a new incident arrives for relevant staff.
 * Medium urgency, attention-grabbing.
 */
export function playIncidentAlarm() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Three rising beeps: 880Hz → 1046Hz → 1318Hz
    const pattern = [880, 1046, 1318];
    pattern.forEach((freq, i) => {
      beep(freq, now + i * 0.18, 0.14, 0.7, 'square');
    });

    // Repeat once after a pause
    setTimeout(() => {
      try {
        const ctx2 = getCtx();
        const t = ctx2.currentTime;
        pattern.forEach((freq, i) => {
          beep(freq, t + i * 0.18, 0.14, 0.7, 'square');
        });
      } catch (_) {}
    }, 700);
  } catch (err) {
    console.warn('Audio playback blocked:', err);
  }
}

let emergencyInterval = null;

/**
 * EMERGENCY BUZZ ALARM — loud, continuous klaxon
 * Played when staff triggers the emergency broadcast.
 * Maximum urgency — full-on alarm sound.
 */
export function playEmergencyBuzzAlarm() {
  if (emergencyInterval) return; // Already playing

  try {
    const playBurst = () => {
      const ctx = getCtx();
      const now = ctx.currentTime;
      for (let cycle = 0; cycle < 6; cycle++) {
        const t = now + cycle * 0.3;
        // High tone
        beep(960,  t,        0.15, 0.85, 'sawtooth');
        // Low tone
        beep(720,  t + 0.15, 0.15, 0.85, 'sawtooth');
      }
    };

    // Play immediately
    playBurst();

    // Loop every 2 seconds
    emergencyInterval = setInterval(() => {
      try {
        playBurst();
      } catch (_) {}
    }, 2000);
  } catch (err) {
    console.warn('Audio playback blocked:', err);
  }
}

export function stopEmergencyBuzzAlarm() {
  if (emergencyInterval) {
    clearInterval(emergencyInterval);
    emergencyInterval = null;
  }
}

/**
 * DISCHARGE NOTIFICATION — soft descending chime
 * Played when a patient session ends.
 */
export function playDischargeChime() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    [880, 698, 523].forEach((freq, i) => {
      beep(freq, now + i * 0.2, 0.18, 0.4, 'sine');
    });
  } catch (_) {}
}

/**
 * Call this on any user interaction to unlock the AudioContext.
 * Must be called before any alarm will work due to browser autoplay policy.
 */
export function unlockAudio() {
  try {
    getCtx();
  } catch (_) {}
}
