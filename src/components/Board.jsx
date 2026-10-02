import { LADDERS, SNAKES } from '../gameEngine.js';
import { SPECIAL_TILE_TYPES } from '../boardPresets.js';
import BoardConnections from './BoardConnections.jsx';

const tiles = Array.from({ length: 100 }, (_, index) => 100 - index);
const POWER_BADGES = {
  'snake-shield': { icon: '🛡️', label: 'Snake Shield', type: 'shield' },
  'double-roll': { icon: '⚡', label: 'Double Roll', type: 'double' },
  reflect: { icon: '🪞', label: 'Reflect', type: 'reflect' },
  cancel: { icon: '❌', label: 'Cancel', type: 'cancel' },
};

function TokenBadges({ player }) {
  const badges = (player.inventory || []).map(id => POWER_BADGES[id]).filter(Boolean);
  if (player.statusEffects?.diceCurse) badges.push({ icon: '💀', label: 'Dice Curse', type: 'curse' });
  if (player.statusEffects?.skipNextTurn) badges.push({ icon: '🚫', label: 'Skip Turn', type: 'skip' });
  return <span className="token-power-badges">{badges.slice(0, 3).map((badge, index) => <i className={`token-power-badge ${badge.type}`} title={badge.label} aria-label={badge.label} style={{ '--badge-index': index }} key={`${badge.type}-${index}`}>{badge.icon}</i>)}</span>;
}

export default function Board({ players, activeTile, finalLandingTile, specialTiles = {}, snakes = SNAKES, ladders = LADDERS, currentPlayerId, movingPlayerId, connectionTravel }) {
  return <section className="board-shell" aria-label="Snakes and Ladders board"><div className="board-scroll"><div className="board">{tiles.map(number => {
    const occupants = players.filter(player => player.position === number);
    const special = SPECIAL_TILE_TYPES[specialTiles[number]];
    const classes = ['tile', occupants.length && 'occupied', number === 100 && 'finish', ladders[number] && 'ladder-start', snakes[number] && 'snake-start', special && `special-${special.type}`, activeTile === number && 'landed', finalLandingTile === number && 'final-landed'].filter(Boolean).join(' ');
    return <div className={classes} data-tile={number} key={number}><span className="tile-number">{number}</span>{special && <span className={`tile-special special-icon ${special.type}-icon`} title={`${special.label} tile`}>{special.icon}<small>{special.label}</small></span>}{number === 100 && <span className="tile-special finish-icon" title="Finish">★</span>}<div className={`token-grid tokens-${occupants.length}`}>{occupants.map(player => {
      const playerNumber = player.playerNumber ?? players.indexOf(player) + 1;
      return <span className={`board-token ${player.id === currentPlayerId ? 'current-board-token' : ''} ${player.id === movingPlayerId ? 'moving-board-token' : ''} ${connectionTravel?.playerId === player.id ? 'connection-source-token' : ''}`} style={{ '--player': player.color }} title={`${player.name} · P${playerNumber}`} key={player.id}><b className="token-icon">{player.icon}</b><small className="token-id">P{playerNumber}</small><TokenBadges player={player}/></span>;
    })}</div></div>;
  })}<BoardConnections ladders={ladders} snakes={snakes} activeTile={activeTile} travel={connectionTravel}/></div></div><div className="board-legend"><span><i className="legend-ladder">🪜</i> Ladder</span><span><i className="legend-snake">🐍</i> Snake</span>{Object.values(SPECIAL_TILE_TYPES).map(special => <span key={special.type}><i>{special.icon}</i> {special.label}</span>)}<span><i className="legend-goal">★</i> Finish</span></div></section>;
}
