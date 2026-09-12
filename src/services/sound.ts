// Procedural Web Audio API sound effects generator for zero-latency FPS audio

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.6;
  private muted: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public getVolume(): number {
    return this.volume;
  }

  // Shoot sound based on weapon
  public playShoot(weapon: 'rifle' | 'shotgun' | 'sniper' | 'knife') {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.muted) return;

    const t = this.ctx.currentTime;

    if (weapon === 'knife') {
      // Swish whoosh
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.12);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.linearRampToValueAtTime(0.01, t + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.13);
      return;
    }

    // Noise buffer for gunshot transient
    const bufferSize = this.ctx.sampleRate * (weapon === 'sniper' ? 0.35 : weapon === 'shotgun' ? 0.28 : 0.12);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(weapon === 'sniper' ? 1800 : weapon === 'shotgun' ? 1200 : 2800, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + (weapon === 'sniper' ? 0.35 : 0.15));

    const noiseGain = this.ctx.createGain();
    const peakGain = weapon === 'sniper' ? 0.8 : weapon === 'shotgun' ? 0.7 : 0.45;
    noiseGain.gain.setValueAtTime(peakGain, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + (weapon === 'sniper' ? 0.35 : weapon === 'shotgun' ? 0.25 : 0.11));

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    whiteNoise.start(t);
    whiteNoise.stop(t + (weapon === 'sniper' ? 0.36 : 0.26));

    // Punchy low-end kick oscillator
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    const startFreq = weapon === 'sniper' ? 220 : weapon === 'shotgun' ? 180 : 160;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);

    oscGain.gain.setValueAtTime(weapon === 'sniper' ? 0.6 : 0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  // Hitmarker sound
  public playHitmarker() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.muted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.setValueAtTime(1100, t + 0.02);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // Kill chime sound (satisfying bell chime like Kirka.io)
  public playKill(isHeadshot: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.muted) return;

    const t = this.ctx.currentTime;
    const freqs = isHeadshot ? [1200, 1800, 2400] : [880, 1320];

    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.03);

      gain.gain.setValueAtTime(0.35, t + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.03);
      osc.stop(t + 0.42);
    });
  }

  // Jump sound
  public playJump() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.muted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.12);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  // Dash sound (Kirka 'E' dash)
  public playDash() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.muted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.2);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.21);
  }

  // Jump pad launch
  public playJumpPad() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.muted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(750, t + 0.25);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  // Reload sound
  public playReload() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.muted) return;

    const t = this.ctx.currentTime;
    // Click 1
    this.playMechanicalClick(t, 600);
    // Click 2
    this.playMechanicalClick(t + 0.4, 950);
  }

  private playMechanicalClick(startTime: number, freq: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.exponentialRampToValueAtTime(100, startTime + 0.05);

    gain.gain.setValueAtTime(0.18, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + 0.06);
  }

  // Empty magazine click
  public playEmpty() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.muted) return;
    this.playMechanicalClick(this.ctx.currentTime, 800);
  }

  // Taking damage
  public playHurt() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.muted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Match victory fanfare
  public playVictory() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.muted) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const t = this.ctx.currentTime;

    notes.forEach((note, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note, t + i * 0.14);

      gain.gain.setValueAtTime(0.3, t + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.14 + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + i * 0.14);
      osc.stop(t + i * 0.14 + 0.52);
    });
  }
}

export const sound = new SoundEngine();
