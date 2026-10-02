export const TOKEN_ICONS = ['🐱', '🐶', '🦊', '🐼', '🐸', '🐯', '🐵', '🐧'];
export const GAME_BALANCE = Object.freeze({ boostMovement: 3, backtrackMovement: 3, jackpotMovement: 6, pullBackMovement: 3, diceCursePenalty: 2, inventoryLimit: 2, maxEventChain: 10, rocketMovement: 10, everyoneBackMovement: 2, leaderTroubleMovement: 5, lastPlaceBoostMovement: 5 });
export const ANIMATION_SPEEDS = {
  fast: { tileStep: 200, diceResultPause: 280, finalLandingPause: 260, powerStep: 220, pullBackStep: 260, ladderTravel: 550, snakeTravel: 650, swapTravel: 450, event: 260, bot: 300, feedback: 850, wheel: 900 },
  normal: { tileStep: 350, diceResultPause: 500, finalLandingPause: 350, powerStep: 250, pullBackStep: 280, ladderTravel: 900, snakeTravel: 1000, swapTravel: 650, event: 500, bot: 700, feedback: 1400, wheel: 2400 },
  cinematic: { tileStep: 550, diceResultPause: 750, finalLandingPause: 500, powerStep: 380, pullBackStep: 420, ladderTravel: 1300, snakeTravel: 1400, swapTravel: 950, event: 900, bot: 1100, feedback: 2100, wheel: 4200 },
};
export const MODE_PRESETS = {
  classic: { id: 'classic', name: 'Classic', description: 'Pure dice, snakes, and ladders.', exactRoll: true, extraTurnOnSix: true, wheelEnabled: false, rouletteFrequency: 'normal', inventoryLimit: 0, snakes: 'normal', ladders: 'normal', chaosEnabled: false, animationSpeed: 'cinematic' },
  fate: { id: 'fate', name: 'Wheel of Fate', description: 'The complete power-and-roulette race.', exactRoll: true, extraTurnOnSix: true, wheelEnabled: true, rouletteFrequency: 'normal', inventoryLimit: 2, snakes: 'normal', ladders: 'normal', chaosEnabled: true, animationSpeed: 'cinematic' },
  party: { id: 'party', name: 'Party Chaos', description: 'More wheels, attacks, and wild reversals.', exactRoll: true, extraTurnOnSix: true, wheelEnabled: true, rouletteFrequency: 'high', inventoryLimit: 2, snakes: 'high', ladders: 'normal', chaosEnabled: true, animationSpeed: 'cinematic' },
};
export const DEFAULT_CUSTOM = { ...MODE_PRESETS.fate, id: 'custom', name: 'Custom Game' };
export const ROULETTE_TILE_SETS = { low: [18, 39, 58, 77, 94], normal: [7, 18, 27, 39, 45, 58, 69, 77, 89, 94], high: [5, 7, 13, 18, 25, 27, 33, 39, 45, 54, 58, 61, 69, 77, 83, 89, 94] };
export function createSettings(mode = 'fate', custom = {}) { const base = mode === 'custom' ? DEFAULT_CUSTOM : MODE_PRESETS[mode] || MODE_PRESETS.fate; return { ...base, ...custom, id: mode }; }
export const DEFAULT_PREFERENCES = { soundEnabled: true, soundVolume: 0.35, musicEnabled: false, musicVolume: 0.2, preferredMode: 'fate', animationSpeed: 'cinematic' };
export function loadPreferences() { try { return { ...DEFAULT_PREFERENCES, ...JSON.parse(localStorage.getItem('snakes-ladders-preferences') || '{}') }; } catch { return DEFAULT_PREFERENCES; } }
export function savePreferences(preferences) { try { localStorage.setItem('snakes-ladders-preferences', JSON.stringify(preferences)); } catch { /* storage is optional */ } }
