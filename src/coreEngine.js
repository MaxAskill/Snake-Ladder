import { EFFECT_BY_ID, pickWeightedEffect } from './rouletteConfig.js';
import { createSettings, GAME_BALANCE, TOKEN_ICONS } from './gameConfig.js';
import { DEFAULT_BOARD_PRESET_ID, getBoardPreset } from './boardPresets.js';
const fallback = getBoardPreset(DEFAULT_BOARD_PRESET_ID);
export const SNAKES = fallback.snakes;
export const LADDERS = fallback.ladders;
export const COLORS = ['#ea5b3d', '#3c73df', '#23a476', '#9a62d5', '#eba928', '#e35f96', '#168ea1', '#73564a'];
export const MAX_EVENT_CHAIN = GAME_BALANCE.maxEventChain;
export const INVENTORY_LIMIT = GAME_BALANCE.inventoryLimit;
export class GameEngine {
  constructor(profiles, options = {}) {
    this.settings = createSettings(options.mode || 'fate', options.settings || {});
    this.boardPreset = getBoardPreset(options.boardPresetId);
    this.boardPresetId = this.boardPreset.id; this.snakes = this.boardPreset.snakes; this.ladders = this.boardPreset.ladders;
    this.specialTiles = this.settings.wheelEnabled ? Object.fromEntries(Object.entries(this.boardPreset.specialTiles).filter(([, type]) => type !== 'chaos' || this.settings.chaosEnabled)) : {};
    this.players = profiles.map((profile, i) => { const data = typeof profile === 'string' ? { name: profile } : profile; return { id: i + 1, name: data.name?.trim() || `Player ${i + 1}`, color: data.color || COLORS[i], icon: data.icon || TOKEN_ICONS[i], isBot: Boolean(data.isBot), difficulty: data.difficulty || 'normal', position: 0, inventory: [], statusEffects: { skipNextTurn: false, diceCurse: false }, stats: this.createStats() }; });
    this.currentIndex = 0; this.round = 1; this.extraTurnOnSix = this.settings.extraTurnOnSix; this.winner = null; this.history = []; this.busy = false; this.pendingExtraTurn = false;
    this.log(`${this.players[0].name} begins the race.`);
  }
  get currentPlayer() { return this.players[this.currentIndex]; }
  roll() { return Math.floor(Math.random() * 6) + 1; }
  createStats() { return { diceRolls: 0, diceTotal: 0, totalSpacesMoved: 0, snakesHit: 0, laddersClimbed: 0, rouletteSpins: 0, powersReceived: 0, powersUsed: 0, attacksUsed: 0, attacksReceived: 0, defensesActivated: 0, playersSwapped: 0, turnsSkipped: 0, chaosEvents: 0, penaltiesReceived: 0 }; }
  spin(random = Math.random, pool = 'fate') { return pickWeightedEffect(random, this.settings, pool); }
  hasPower(player, id) { return player.inventory.includes(id); }
  consumePower(player, id) { const index = player.inventory.indexOf(id); if (index < 0) return false; player.inventory.splice(index, 1); return true; }
  addPower(player, id) { if (player.inventory.length >= this.settings.inventoryLimit) return false; player.inventory.push(id); player.stats.powersReceived++; return true; }
  replacePower(player, oldId, newId) { const index = player.inventory.indexOf(oldId); if (index >= 0) player.inventory.splice(index, 1, newId); }
  getPower(id) { return EFFECT_BY_ID[id]; }
  planMovement(player, amount, { exact = true } = {}) {
    const destination = player.position + amount;
    if (exact && this.settings.exactRoll && destination > 100) return { player, from: player.position, path: [], blocked: true };
    const target = Math.max(1, Math.min(100, destination));
    if (target === player.position) return { player, from: player.position, path: [], blocked: false };
    const direction = target > player.position ? 1 : -1;
    const path = [];
    for (let position = player.position + direction; direction > 0 ? position <= target : position >= target; position += direction) path.push(position);
    return { player, from: player.position, path, blocked: false };
  }
  planMove(roll) { return this.planMovement(this.currentPlayer, roll); }
  setPosition(player, position) { player.position = Math.max(1, Math.min(100, position)); }
  boardEventAt(position) {
    if (this.snakes[position]) return { type: 'snake', from: position, to: this.snakes[position] };
    if (this.ladders[position]) return { type: 'ladder', from: position, to: this.ladders[position] };
    if (this.specialTiles[position]) return { type: 'special', specialType: this.specialTiles[position], at: position };
    return null;
  }
  defenseOptions(player) { return ['reflect', 'cancel'].filter(id => this.hasPower(player, id)); }
  advanceTurn({ rolledSix = false } = {}) {
    const player = this.currentPlayer;
    if (player.position === 100) { this.winner = player; this.log(`${player.name} reached the summit and won!`, 'win'); return { winner: player }; }
    if (this.pendingExtraTurn) { this.pendingExtraTurn = false; this.log(`${player.name} earned an extra turn.`, 'bonus'); return { extraTurn: true }; }
    if (rolledSix && this.settings.extraTurnOnSix) { this.log(`${player.name} rolled a six and goes again.`, 'bonus'); return { extraTurn: true }; }
    this.currentIndex = (this.currentIndex + 1) % this.players.length; if (this.currentIndex === 0) this.round++;
    return { extraTurn: false };
  }
  skipUnavailableTurns() {
    const skipped = []; let guard = 0;
    while (this.currentPlayer.statusEffects.skipNextTurn && guard < this.players.length) {
      const player = this.currentPlayer; player.statusEffects.skipNextTurn = false; player.stats.turnsSkipped++; this.log(`${player.name} loses this turn.`, 'penalty'); skipped.push(player);
      this.currentIndex = (this.currentIndex + 1) % this.players.length; if (this.currentIndex === 0) this.round++; guard++;
    }
    return skipped;
  }
  log(text, type = 'info') { this.history.unshift({ text, type, time: Date.now() + Math.random() }); this.history = this.history.slice(0, 10); }
  rankings() { return [...this.players].sort((a, b) => b.position - a.position || a.id - b.id); }
  reset() { this.players.forEach(player => { player.position = 0; player.inventory = []; player.statusEffects = { skipNextTurn: false, diceCurse: false }; player.stats = this.createStats(); }); this.currentIndex = 0; this.round = 1; this.winner = null; this.history = []; this.busy = false; this.pendingExtraTurn = false; this.log(`${this.players[0].name} begins the race.`); }
}
