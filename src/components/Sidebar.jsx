import GameIcon from './GameIcon.jsx';

const dots = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];

const Die = ({ value, rolling }) => <div className={`dice ${rolling ? 'rolling' : ''}`} aria-label={`Dice showing ${value}`}><div className="dice-face">{Array.from({ length: 9 }, (_, index) => <i className={dots[value].includes(index) ? 'on' : ''} key={index}/>)}</div></div>;

function Inventory({ engine, player, limit }) {
  return <><div className="inventory-heading"><span>Current powers</span><small>{player.inventory.length}/{limit}</small></div><div className="inventory-slots">{Array.from({ length: limit }, (_, index) => {
    const power = player.inventory[index] && engine.getPower(player.inventory[index]);
    return <div className={`inventory-slot ${power ? power.category : 'empty'}`} title={power?.description} tabIndex={power ? 0 : undefined} key={index}>{power ? <><GameIcon icon={power.icon} label={`${power.name}: ${power.description}`} size="lg" category={power.category}/><small>{power.name}</small></> : <><b>＋</b><small>Empty</small></>}</div>;
  })}</div></>;
}

function Statuses({ engine, player }) {
  return <div className="status-row">{player.statusEffects.diceCurse && <span><GameIcon icon="💀" size="md" label="Dice Curse"/> Cursed</span>}{player.statusEffects.skipNextTurn && <span><GameIcon icon="🚫" size="md" label="Skip next turn"/> Skip turn</span>}{engine.hasPower(player, 'snake-shield') && <span><GameIcon icon="🛡️" size="md" label="Snake Shield"/> Protected</span>}{engine.hasPower(player, 'double-roll') && <span><GameIcon icon="⚡" size="md" label="Double Roll"/> Double roll</span>}</div>;
}

export default function Sidebar({ engine, dice, secondDice, rolling, onRoll, hint, onClear, paused }) {
  const current = engine.currentPlayer;
  const limit = engine.settings.inventoryLimit;
  return <aside className="sidebar">
    <section className="turn-card"><div className="turn-label"><span className="pulse-dot"/> {current.isBot ? `${current.difficulty} bot` : 'Current turn'}</div><div className="current-player"><div className="current-token" style={{ '--player': current.color }}>{current.icon}</div><div><strong>{current.name}</strong><span>Tile {current.position || 'Start'} · P{current.id}</span></div></div><div className="dice-pair"><Die value={dice} rolling={rolling}/>{secondDice && <Die value={secondDice}/>}</div><button className="roll-button" type="button" onClick={onRoll} disabled={engine.busy || paused || current.isBot}><span>{current.isBot ? 'Bot is thinking…' : '🎲 Roll dice'}</span><kbd>Space</kbd></button><p className="turn-hint">{hint}</p>{limit > 0 && <div className="power-inventory"><Inventory engine={engine} player={current} limit={limit}/></div>}<Statuses engine={engine} player={current}/></section>
    {limit > 0 && <section className="panel local-mobile-inventory"><Inventory engine={engine} player={current} limit={limit}/><Statuses engine={engine} player={current}/></section>}
    <section className="panel race-panel"><div className="panel-title"><h2>Race standings</h2><span>Round {engine.round}</span></div><div className="rankings">{engine.rankings().map((player, index) => <div className={`ranking ${player === current ? 'active' : ''}`} key={player.id}><span className="rank">{index + 1}</span><span className="mini-token" style={{ '--player': player.color }}>{player.icon}</span><span className="rank-name">{player.name}{player.isBot && <small> · BOT</small>}</span><span className="ranking-meta">{player.statusEffects.diceCurse && '💀'}{player.statusEffects.skipNextTurn && '🚫'}{player.inventory.length > 0 && ` 🎒${player.inventory.length}`}</span><strong>{player.position || '—'}</strong></div>)}</div></section>
    <section className="panel log-panel"><div className="panel-title"><h2>Match log</h2><button onClick={onClear} type="button">Clear</button></div><div className="event-log">{engine.history.map((event, index) => <div className={`log-entry ${event.type}`} key={`${event.time}-${index}`}><i/><span>{event.text}</span>{index === 0 && <small>now</small>}</div>)}</div></section>
  </aside>;
}
