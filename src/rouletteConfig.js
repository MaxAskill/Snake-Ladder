export const ROULETTE_TILES = [7, 18, 27, 39, 45, 58, 69, 77, 89, 94];
export const ROULETTE_EFFECTS = [
  { id: 'snake-shield', name: 'Snake Shield', icon: '🛡️', category: 'defense', rarity: 'rare', weight: 11, stored: true, description: 'Block the next snake.' },
  { id: 'double-roll', name: 'Double Roll', icon: '⚡', category: 'power', rarity: 'rare', weight: 9, stored: true, description: 'Roll twice next turn and use the higher result. Maximum 1 stored charge.' },
  { id: 'boost', name: 'Boost', icon: '⏩', category: 'power', rarity: 'common', weight: 15, stored: false, description: 'Move forward 3 tiles.' },
  { id: 'backtrack', name: 'Backtrack', icon: '⏪', category: 'penalty', rarity: 'common', weight: 12, stored: false, description: 'Move backward 3 tiles.' },
  { id: 'position-swap', name: 'Position Swap', icon: '🔄', category: 'attack', rarity: 'epic', weight: 7, stored: false, description: 'Swap places with a rival.' },
  { id: 'pull-back', name: 'Pull Back', icon: '🧲', category: 'attack', rarity: 'rare', weight: 10, stored: false, description: 'Pull a rival back 3 tiles.' },
  { id: 'skip-turn', name: 'Skip Turn', icon: '🚫', category: 'penalty', rarity: 'common', weight: 10, stored: false, description: 'Lose your next turn.' },
  { id: 'extra-turn', name: 'Extra Turn', icon: '🎲', category: 'power', rarity: 'rare', weight: 10, stored: false, description: 'Take another turn.' },
  { id: 'reflect', name: 'Reflect', icon: '🪞', category: 'defense', rarity: 'epic', weight: 7, stored: true, description: 'Reflect a targeted attack.' },
  { id: 'cancel', name: 'Cancel', icon: '❌', category: 'defense', rarity: 'rare', weight: 7, stored: true, description: 'Cancel a targeted attack.' },
  { id: 'jackpot', name: 'Jackpot', icon: '🎁', category: 'power', rarity: 'legendary', weight: 4, stored: false, description: 'Move forward 6 tiles.' },
  { id: 'dice-curse', name: 'Dice Curse', icon: '💀', category: 'penalty', rarity: 'common', weight: 9, stored: false, description: 'Next movement is reduced by 2.' },
  { id: 'everyone-back', name: 'Everyone Back', icon: '🔥', category: 'chaos', rarity: 'legendary', weight: 2, stored: false, description: 'Every rival moves back 2.' },
  { id: 'rocket', name: 'Rocket', icon: '🚀', category: 'chaos', rarity: 'legendary', weight: 2, stored: false, description: 'Launch forward 10 tiles.' },
  { id: 'snake-panic', name: 'Snake Panic', icon: '🐍', category: 'chaos', rarity: 'legendary', weight: 2, stored: false, description: 'Drop a random rival below a snake.' },
  { id: 'ladder-rush', name: 'Ladder Rush', icon: '🪜', category: 'chaos', rarity: 'legendary', weight: 2, stored: false, description: 'Rush to the next ladder.' },
  { id: 'mass-shuffle', name: 'Mass Shuffle', icon: '🔀', category: 'chaos', rarity: 'legendary', weight: 2, stored: false, description: 'Shuffle every player position.' },
  { id: 'leader-trouble', name: 'Leader Trouble', icon: '👑', category: 'chaos', rarity: 'epic', weight: 3, stored: false, description: 'The leader moves back 5.' },
  { id: 'last-place-boost', name: 'Last Place Boost', icon: '🐢', category: 'chaos', rarity: 'epic', weight: 3, stored: false, description: 'Last place moves forward 5.' },
  { id: 'dice-battle', name: 'Dice Battle', icon: '🎲', category: 'chaos', rarity: 'legendary', weight: 2, stored: false, description: 'Challenge a rival to a dice duel.' },
];
export const EFFECT_BY_ID = Object.fromEntries(ROULETTE_EFFECTS.map(effect => [effect.id, effect]));
export const EFFECT_POOLS = Object.freeze({
  fate: ROULETTE_EFFECTS.map(effect => effect.id),
  fortune: ['snake-shield', 'double-roll', 'boost', 'extra-turn', 'jackpot'],
  battle: ['position-swap', 'pull-back', 'dice-battle', 'reflect'],
  chaos: ['everyone-back', 'rocket', 'snake-panic', 'ladder-rush', 'mass-shuffle', 'leader-trouble', 'last-place-boost', 'dice-battle'],
});
export function effectsForPool(pool = 'fate', settings = {}) {
  return (EFFECT_POOLS[pool] || EFFECT_POOLS.fate).map(id => EFFECT_BY_ID[id]).filter(effect => settings.chaosEnabled !== false || effect.category !== 'chaos');
}
export function pickWeightedEffect(random = Math.random, settings = {}, pool = 'fate') {
  const available = effectsForPool(pool, settings);
  const weighted = available.map(effect => ({ ...effect, effectiveWeight: effect.weight * (settings.id === 'party' && ['attack', 'chaos'].includes(effect.category) ? 2.5 : 1) }));
  const total = weighted.reduce((sum, effect) => sum + effect.effectiveWeight, 0);
  let value = random() * total;
  for (const effect of weighted) { value -= effect.effectiveWeight; if (value < 0) return EFFECT_BY_ID[effect.id]; }
  return EFFECT_BY_ID[weighted.at(-1).id];
}
