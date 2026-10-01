export const SNAKES = { 98: 78, 95: 75, 92: 71, 87: 24, 62: 19, 56: 36, 49: 11, 47: 26, 16: 6 };
export const LADDERS = { 3: 22, 8: 30, 20: 41, 28: 55, 36: 57, 51: 72, 63: 84, 71: 91, 80: 99 };
export const COLORS = ['#ea5b3d','#3c73df','#23a476','#9a62d5','#eba928','#e35f96','#168ea1','#73564a'];

export class GameEngine {
  constructor(names, options = {}) {
    this.players = names.map((name, i) => ({ id: i + 1, name: name.trim() || `Player ${i + 1}`, color: COLORS[i], position: 0 }));
    this.currentIndex = 0;
    this.round = 1;
    this.extraTurnOnSix = options.extraTurnOnSix ?? true;
    this.winner = null;
    this.history = [];
    this.busy = false;
    this.log(`${this.players[0].name} begins the race.`);
  }
  get currentPlayer() { return this.players[this.currentIndex]; }
  roll() { return Math.floor(Math.random() * 6) + 1; }
  planMove(roll) {
    const player = this.currentPlayer;
    if (player.position + roll > 100) return { player, roll, from: player.position, path: [], blocked: true, events: [] };
    const path = Array.from({ length: roll }, (_, i) => player.position + i + 1);
    const landing = path.at(-1);
    const events = [];
    if (LADDERS[landing]) events.push({ type: 'ladder', from: landing, to: LADDERS[landing] });
    else if (SNAKES[landing]) events.push({ type: 'snake', from: landing, to: SNAKES[landing] });
    return { player, roll, from: player.position, path, blocked: false, events };
  }
  setPosition(player, position) { player.position = position; }
  completeTurn(roll) {
    const player = this.currentPlayer;
    if (player.position === 100) { this.winner = player; this.log(`${player.name} reached the summit and won!`, 'win'); return; }
    if (roll === 6 && this.extraTurnOnSix) { this.log(`${player.name} rolled a six and goes again.`, 'bonus'); return; }
    this.currentIndex = (this.currentIndex + 1) % this.players.length;
    if (this.currentIndex === 0) this.round++;
  }
  log(text, type = 'info') { this.history.unshift({ text, type, time: Date.now() }); this.history = this.history.slice(0, 10); }
  rankings() { return [...this.players].sort((a, b) => b.position - a.position || a.id - b.id); }
  reset() { this.players.forEach(p => p.position = 0); this.currentIndex = 0; this.round = 1; this.winner = null; this.history = []; this.log(`${this.players[0].name} begins the race.`); }
}
