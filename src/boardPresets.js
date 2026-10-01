const preset = (data) => Object.freeze({ ...data, snakes: Object.freeze(data.snakes), ladders: Object.freeze(data.ladders), specialTiles: Object.freeze(data.specialTiles) });

export const SPECIAL_TILE_TYPES = Object.freeze({
  fate: { type: 'fate', icon: '🎡', label: 'FATE' },
  fortune: { type: 'fortune', icon: '🎁', label: 'FORTUNE' },
  battle: { type: 'battle', icon: '⚔️', label: 'BATTLE' },
  chaos: { type: 'chaos', icon: '🔥', label: 'CHAOS' },
});

export const BOARD_PRESETS = Object.freeze({
  classic: preset({ id: 'classic', name: 'Classic Kingdom', icon: '🌿', style: 'BALANCED', description: 'Clear opportunities and dangers, balanced across the full climb.', theme: 'classic', recommendedMode: 'Classic', ladders: { 4:22,12:31,25:46,35:57,48:68,59:79,70:88,81:96 }, snakes: { 29:14,43:27,55:38,66:49,76:58,85:65,92:73,97:82 }, specialTiles: { 7:'fate',18:'fate',39:'fate',51:'fate',63:'fate',89:'fate',23:'fortune',73:'fortune',33:'battle',87:'battle' } }),
  climbers: preset({ id: 'climbers', name: "Climber's Paradise", icon: '🪜', style: 'FAST', description: 'More routes upward create a brisk, optimistic race.', theme: 'highlands', recommendedMode: 'Classic', ladders: { 5:21,14:35,24:44,34:54,45:65,57:77,68:86,78:93,84:99 }, snakes: { 32:17,49:30,61:42,74:56,89:69,96:81 }, specialTiles: { 8:'fate',27:'fate',52:'fate',72:'fate',91:'fate',19:'fortune',39:'fortune',63:'fortune',82:'battle' } }),
  snakePit: preset({ id: 'snake-pit', name: 'Snake Pit', icon: '🐍', style: 'DANGEROUS', description: 'Fewer escape routes and a tense upper board reward careful power use.', theme: 'jungle', recommendedMode: 'Wheel of Fate', ladders: { 6:23,17:36,31:50,46:64,62:80,75:91 }, snakes: { 28:13,42:25,54:37,67:48,73:55,82:63,88:70,94:76,98:84 }, specialTiles: { 9:'fate',21:'fate',39:'fate',58:'fate',79:'fate',34:'fortune',69:'fortune',52:'battle',86:'battle' } }),
  wheelMania: preset({ id: 'wheel-mania', name: 'Wheel Mania', icon: '🎡', style: 'ROULETTE', description: 'Frequent opportunities, gambits, and rival encounters put the wheel center stage.', theme: 'carnival', recommendedMode: 'Wheel of Fate', ladders: { 4:20,16:34,30:49,44:62,60:78,76:92 }, snakes: { 27:12,41:24,56:38,71:53,85:66,97:81 }, specialTiles: { 7:'fate',18:'fate',25:'fate',37:'fate',52:'fate',64:'fate',74:'fate',89:'fate',11:'fortune',33:'fortune',58:'fortune',82:'fortune',22:'battle',47:'battle',69:'battle',93:'battle',79:'chaos' } }),
  chaosRealm: preset({ id: 'chaos-realm', name: 'Chaos Realm', icon: '🔥', style: 'CHAOTIC', description: 'Battle and chaos flare up often, without overwhelming the core race.', theme: 'volcano', recommendedMode: 'Party Chaos', ladders: { 5:22,15:33,28:47,40:59,53:72,65:83,77:94 }, snakes: { 26:11,38:20,51:32,63:45,74:56,84:67,91:73,98:82 }, specialTiles: { 8:'fate',19:'fate',35:'fate',57:'fate',70:'fate',87:'fate',24:'fortune',61:'fortune',31:'battle',48:'battle',68:'battle',89:'battle',43:'chaos',79:'chaos' } }),
});

export const DEFAULT_BOARD_PRESET_ID = 'classic';
export const getBoardPreset = id => BOARD_PRESETS[id] || Object.values(BOARD_PRESETS).find(board => board.id === id) || BOARD_PRESETS[DEFAULT_BOARD_PRESET_ID];
export const getSpecialTileCounts = board => Object.values(board.specialTiles).reduce((counts, type) => ({ ...counts, [type]: (counts[type] || 0) + 1 }), {});

export function validateBoardPreset(board) {
  const errors = [], starts = new Set([...Object.keys(board.snakes), ...Object.keys(board.ladders)].map(Number));
  for (const [kind, connections] of [['snake', board.snakes], ['ladder', board.ladders]]) for (const [rawStart, end] of Object.entries(connections)) { const start = Number(rawStart); if (start <= 1 || start >= 100 || end <= 1 || end >= 100) errors.push(`${kind} endpoint outside 2-99`); if (kind === 'snake' ? end >= start : end <= start) errors.push(`invalid ${kind} ${start}-${end}`); }
  if (starts.size !== Object.keys(board.snakes).length + Object.keys(board.ladders).length) errors.push('duplicate connection trigger');
  for (const tile of Object.keys(board.specialTiles).map(Number)) { if (tile <= 1 || tile >= 100) errors.push('special tile outside 2-99'); if (starts.has(tile)) errors.push(`special tile conflict at ${tile}`); if (!SPECIAL_TILE_TYPES[board.specialTiles[tile]]) errors.push(`unknown special type at ${tile}`); }
  return { valid: errors.length === 0, errors };
}
