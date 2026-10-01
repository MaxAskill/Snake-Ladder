export class AudioManager {
  constructor(preferences) { this.preferences = preferences; this.context = null; }
  update(preferences) { this.preferences = preferences; }
  unlock() { if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)(); if (this.context.state === 'suspended') this.context.resume(); }
  play(kind) {
    if (!this.preferences.soundEnabled || !this.context) return;
    const tones = { button: [420,.035], dice: [180,.09], move: [300,.025], ladder: [520,.18], snake: [120,.22], wheel: [240,.12], result: [620,.15], power: [540,.13], attack: [150,.14], defense: [720,.16], jackpot: [880,.3], chaos: [100,.28], victory: [760,.45] };
    const [frequency, duration] = tones[kind] || tones.button; const oscillator = this.context.createOscillator(); const gain = this.context.createGain(); oscillator.connect(gain); gain.connect(this.context.destination); oscillator.frequency.value = frequency; gain.gain.setValueAtTime(this.preferences.soundVolume * .12, this.context.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, this.context.currentTime + duration); oscillator.start(); oscillator.stop(this.context.currentTime + duration);
  }
}
