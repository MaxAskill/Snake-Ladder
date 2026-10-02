import { BOARD_PRESETS, validateBoardPreset } from '../src/boardPresets.js';
import { GameEngine } from '../src/coreEngine.js';
const modes = ['classic', 'fate', 'party', 'custom'];
for (const board of Object.values(BOARD_PRESETS)) {
  const validation = validateBoardPreset(board);
  if (!validation.valid) throw new Error(`${board.name}: ${validation.errors.join(', ')}`);
  for (const mode of modes) for (const playerCount of [2, 8]) {
    const players = Array.from({ length: playerCount }, (_, index) => ({ name: `P${index + 1}`, isBot: index % 2 === 1 }));
    const engine = new GameEngine(players, { mode, boardPresetId: board.id });
    if (engine.boardPresetId !== board.id || engine.snakes !== board.snakes || engine.ladders !== board.ladders) throw new Error(`${board.name} was not preserved by ${mode}`);
    if (mode === 'classic' && Object.keys(engine.specialTiles).length) throw new Error(`Classic mode enabled special tiles on ${board.name}`);
    engine.players[0].position = 42; engine.reset();
    if (engine.boardPresetId !== board.id || engine.players.some(player => player.position !== 0)) throw new Error(`Rematch reset failed for ${board.name}`);
  }
}
const bounceEngine = new GameEngine([{ name: 'Bounce' }, { name: 'Other' }], { mode: 'classic' });
bounceEngine.players[0].position = 97;
const bounce = bounceEngine.planMovement(bounceEngine.players[0], 5);
if (!bounce.bounced || bounce.overshoot !== 2 || bounce.path.join(',') !== '98,99,100,99,98') throw new Error(`Finish bounce path is incorrect: ${bounce.path.join(',')}`);
console.log('Validated all 5 board presets, every game mode, and finish bounce-back movement.');
