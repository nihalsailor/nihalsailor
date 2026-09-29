/**
 * NIHALSAILOR SOUND ENGINE
 * Web Audio API synthesized ambient ocean waves, distant wind rumblings, and UI interaction audio.
 * 100% client-side synthesized - no external audio files required!
 */

class MaritimeAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.waveGain = null;
    this.windGain = null;
    this.masterGain = null;
    this.isMuted = true;
    this.waveInterval = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.warn('Web Audio API not supported on this vessel.');
      return;
    }
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.setupWindAmbience();
    this.setupWaveAmbience();
  }

  createNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise filter approximation
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
    return buffer;
  }

  setupWindAmbience() {
    const noiseBuffer = this.createNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Filter for distant eerie sea wind
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, this.ctx.currentTime);
    filter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    noiseSource.start();

    // Gentle wind lfo modulation
    setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;
      const targetFreq = 180 + Math.random() * 220;
      filter.frequency.linearRampToValueAtTime(targetFreq, this.ctx.currentTime + 3.0);
    }, 3200);
  }

  setupWaveAmbience() {
    this.waveGain = this.ctx.createGain();
    this.waveGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.waveGain.connect(this.masterGain);

    // Periodic ocean swells
    this.triggerWaveSwell = () => {
      if (!this.isPlaying || !this.ctx) return;
      const noiseBuffer = this.createNoiseBuffer();
      const wave = this.ctx.createBufferSource();
      wave.buffer = noiseBuffer;

      const waveFilter = this.ctx.createBiquadFilter();
      waveFilter.type = 'bandpass';
      waveFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
      waveFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

      const individualGain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      const swellDuration = 4.5 + Math.random() * 2;

      // Envelope: swelling ocean wave crash & ebb
      individualGain.gain.setValueAtTime(0.0001, now);
      individualGain.gain.exponentialRampToValueAtTime(0.28, now + swellDuration * 0.4);
      individualGain.gain.exponentialRampToValueAtTime(0.0001, now + swellDuration);

      waveFilter.frequency.exponentialRampToValueAtTime(520, now + swellDuration * 0.35);
      waveFilter.frequency.exponentialRampToValueAtTime(160, now + swellDuration);

      wave.connect(waveFilter);
      waveFilter.connect(individualGain);
      individualGain.connect(this.waveGain);

      wave.start(now);
      wave.stop(now + swellDuration);
    };
  }

  toggleSound() {
    if (!this.ctx) {
      this.init();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = !this.isPlaying;

    if (this.isPlaying) {
      const now = this.ctx.currentTime;
      this.windGain.gain.cancelScheduledValues(now);
      this.windGain.gain.linearRampToValueAtTime(0.18, now + 1.5);

      this.waveGain.gain.cancelScheduledValues(now);
      this.waveGain.gain.linearRampToValueAtTime(0.24, now + 1.5);

      // Fire first swell immediately and schedule ongoing swells
      this.triggerWaveSwell();
      this.waveInterval = setInterval(() => {
        this.triggerWaveSwell();
      }, 5500);
    } else {
      const now = this.ctx.currentTime;
      this.windGain.gain.cancelScheduledValues(now);
      this.windGain.gain.linearRampToValueAtTime(0.0001, now + 1);

      this.waveGain.gain.cancelScheduledValues(now);
      this.waveGain.gain.linearRampToValueAtTime(0.0001, now + 1);

      if (this.waveInterval) {
        clearInterval(this.waveInterval);
        this.waveInterval = null;
      }
    }

    return this.isPlaying;
  }

  // Play a gilded pirate doubloon / blade chime on UI interaction
  playChime(type = 'click') {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (type === 'blade') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.35);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.18);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      }

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.38);
    } catch (e) {
      // Audio might be suspended until interaction
    }
  }
}

window.maritimeAudio = new MaritimeAudioEngine();
