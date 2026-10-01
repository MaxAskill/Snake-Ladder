import { useEffect, useRef, useState } from 'react';
import { getBoardPreset } from '../boardPresets.js';
import Board from './Board.jsx';

const delay = ms => new Promise(resolve => window.setTimeout(resolve, ms));
const dots = [[],[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]];
const DiceFace = ({ value }) => <div className="dice-face">{Array.from({ length: 9 }, (_, index) => <i className={dots[value].includes(index) ? 'on' : ''} key={index}/>)}</div>;
const request = (socket, event, payload = {}) => new Promise(resolve => socket.timeout(8000).emit(event, payload, (error, response) => resolve(error ? { ok: false, error: 'The server did not respond.' } : response)));

export default function OnlineGame({ socket, room, self, onSnapshot, onLeave }) {
  const [players, setPlayers] = useState(room.players);
  const [dice, setDice] = useState(1);
  const [dicePreview, setDicePreview] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [announcement, setAnnouncement] = useState(null);
  const [activeTile, setActiveTile] = useState(null);
  const [connectionTravel, setConnectionTravel] = useState(null);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(() => Date.now());
  const queue = useRef(Promise.resolve());
  const lastSequence = useRef(room.eventSequence);
  const announcementResolver = useRef(null);
  const board = getBoardPreset(room.boardPresetId);
  const current = room.players[room.currentPlayerIndex];
  const me = room.players.find(player => player.id === self.playerId);
  const winner = room.players.find(player => player.id === room.winnerId);
  const myTurn = !animating && room.status === 'playing' && room.phase === 'WAITING_FOR_ROLL' && current?.id === me?.id;
  const specialTiles = room.settings.wheelEnabled ? board.specialTiles : {};
  const secondsRemaining = room.actionDeadline ? Math.max(0, Math.ceil((room.actionDeadline - clock) / 1000)) : null;
  const showAnnouncement = message => new Promise(resolve => { announcementResolver.current = resolve; setAnnouncement(message); });
  const confirmAnnouncement = async () => { if (announcement?.playerId !== me?.id) return; const result = await request(socket, 'game:confirm-extra-turn'); if (!result.ok) setError(result.error); };

  useEffect(() => {
    if (!rolling) return;
    const timer = window.setInterval(() => setDicePreview(1 + Math.floor(Math.random() * 6)), 140);
    return () => window.clearInterval(timer);
  }, [rolling]);

  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 250); return () => window.clearInterval(timer); }, []);

  useEffect(() => {
    const receive = packet => {
      setAnimating(true);
      queue.current = queue.current.then(async () => {
        const first = packet.events[0]?.sequence;
        if (first && first > lastSequence.current + 1) {
          setPlayers(packet.snapshot.players);
          onSnapshot(packet.snapshot);
          lastSequence.current = packet.snapshot.eventSequence;
          setRolling(false);
          setAnimating(false);
          return;
        }
        for (const event of packet.events) {
          if (event.sequence <= lastSequence.current) continue;
          lastSequence.current = event.sequence;
          if (event.type === 'DICE_ROLLED') {
            setRolling(true);
            await delay(1250);
            setDice(event.payload.result);
            setRolling(false);
            await delay(250);
          } else if (event.type === 'PLAYER_MOVED') {
            for (const tile of event.payload.path) {
              setPlayers(list => list.map(player => player.id === event.payload.playerId ? { ...player, position: tile } : player));
              setActiveTile(tile);
              await delay(220);
            }
          } else if (event.type === 'SNAKE_TRIGGERED' || event.type === 'LADDER_TRIGGERED') {
            const player = packet.snapshot.players.find(item => item.id === event.payload.playerId);
            setConnectionTravel({ type: event.type === 'SNAKE_TRIGGERED' ? 'snake' : 'ladder', start: event.payload.from, end: event.payload.to, playerId: event.payload.playerId, icon: player.icon, color: player.color, duration: 950 });
            await delay(950);
            setPlayers(list => list.map(item => item.id === event.payload.playerId ? { ...item, position: event.payload.to } : item));
            setConnectionTravel(null);
            setActiveTile(event.payload.to);
            await delay(250);
          } else if (event.type === 'MOVE_BLOCKED') {
            setActiveTile(event.payload.from);
            await delay(450);
          } else if (event.type === 'TURN_CHANGED' && event.payload.extraTurn) {
            const player = packet.snapshot.players.find(item => item.id === event.payload.playerId);
            await showAnnouncement({ icon: '🎲', title: 'Extra Turn!', text: `${player.name} rolled a 6 and goes again.`, playerId: player.id });
          }
        }
        setPlayers(packet.snapshot.players);
        setActiveTile(null);
        setRolling(false);
        setAnimating(false);
        if (packet.snapshot.eventSequence >= lastSequence.current) onSnapshot(packet.snapshot);
      });
    };
    const confirmed = packet => { lastSequence.current = packet.snapshot.eventSequence; onSnapshot(packet.snapshot); setAnnouncement(null); const resolve = announcementResolver.current; announcementResolver.current = null; resolve?.(); };
    socket.on('game:events', receive);
    socket.on('game:extra-turn-confirmed', confirmed);
    return () => { socket.off('game:events', receive); socket.off('game:extra-turn-confirmed', confirmed); announcementResolver.current?.(); announcementResolver.current = null; };
  }, [socket, onSnapshot]);

  const roll = async () => {
    if (!myTurn || rolling || animating) return;
    setError(''); setRolling(true); setAnimating(true);
    const result = await request(socket, 'game:roll');
    if (!result.ok) { setRolling(false); setAnimating(false); setError(result.error); }
  };

  return <main className="online-game" style={{ '--current': current?.color || '#174b3c' }}>
    <header className="game-header"><div className="brand"><span className="brand-mark">S&L</span><div><strong>Online Match</strong><small>Room {room.code} · {board.name}</small></div></div><div className="header-actions"><span className="rule-chip">Sequence {room.eventSequence}</span><button className="icon-button" type="button" title="Leave room" onClick={onLeave}>×</button></div></header>
    <p className="mobile-game-tip">For a larger board, rotate your phone to landscape. Roll controls stay at the bottom.</p>
    <div className="game-layout">
      <Board players={players} activeTile={activeTile} specialTiles={specialTiles} snakes={board.snakes} ladders={board.ladders} currentPlayerId={current?.id} movingPlayerId={animating ? current?.id : null} connectionTravel={connectionTravel}/>
      <aside className="sidebar"><section className="turn-card"><div className="turn-label"><i className="pulse-dot"/> {winner ? 'Match complete' : animating ? 'Resolving turn' : myTurn ? 'Your turn' : `Waiting for ${current?.name}`}{secondsRemaining!==null&&<b className={secondsRemaining<=10?'urgent':''}>00:{String(secondsRemaining).padStart(2,'0')}</b>}</div><div className="current-player"><span className="current-token" style={{ '--player': current?.color }}>{current?.icon}</span><div><strong>{current?.name}</strong><span>{current?.id === me?.id ? 'You · ' : ''}Round {room.round}</span></div></div><div className={`dice ${rolling ? 'rolling' : ''}`}><DiceFace value={rolling ? dicePreview : dice}/></div><button className="roll-button" disabled={!myTurn || animating || Boolean(winner)} onClick={roll}>{animating ? 'Resolving turn…' : myTurn ? 'Roll dice' : `Waiting for ${current?.name}`}</button>{secondsRemaining!==null&&<div className="roll-timer-track"><i style={{width:`${secondsRemaining/30*100}%`}}/></div>}{error && <p className="online-error">{error}</p>}</section>
        <section className="panel"><div className="panel-title"><h2>Online players</h2><span>{room.players.length}/8</span></div><div className="rankings">{[...room.players].sort((a,b) => b.position-a.position).map((player,index) => <div className={`ranking ${player.id === current?.id ? 'active' : ''}`} key={player.id}><span className="rank">{index+1}</span><span className="mini-token" style={{ '--player': player.color }}>{player.icon}</span><span className="rank-name">{player.name}{player.id === me?.id ? ' (You)' : ''}</span><strong>{player.position || '—'}</strong></div>)}</div></section>
        <section className="panel log-panel"><div className="panel-title"><h2>Game log</h2><span>Authoritative</span></div><div className="event-log">{room.log.map(entry => <div className="log-entry" key={`${entry.sequence}-${entry.text}`}><i/><span>{entry.text}</span><small>#{entry.sequence}</small></div>)}</div></section>
      </aside>
    </div>
    {rolling && <div className="center-dice-stage" aria-live="polite"><div className="center-dice-copy">{current?.name} rolls…</div><div className="dice-cube-scene"><div className="dice-cube">{[1,2,3,4,5,6].map((value,index)=><div className={`dice-cube-face face-${index+1}`} key={value}><DiceFace value={value}/></div>)}</div></div></div>}
    {announcement && <div className="turn-announcement-backdrop"><div className="turn-announcement" role="dialog" aria-modal="true" aria-labelledby="extra-turn-title"><span>{announcement.icon}</span><div><strong id="extra-turn-title">{announcement.title}</strong><small>{announcement.text}</small>{announcement.playerId === me?.id ? <button type="button" onClick={confirmAnnouncement}>Continue</button> : <em>Waiting for {room.players.find(player => player.id === announcement.playerId)?.name} to continue…</em>}</div></div></div>}
    {winner && <div className="modal"><div className="victory-card"><div className="trophy">🏆</div><h2>{winner.name} wins!</h2><p>Authoritative online match completed successfully.</p><button className="primary-button" onClick={onLeave}>Leave room</button></div></div>}
  </main>;
}
