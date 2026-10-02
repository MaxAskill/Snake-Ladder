import { useEffect, useMemo, useState } from 'react';
import { BOARD_PRESETS } from '../boardPresets.js';
import { MODE_PRESETS, TOKEN_ICONS } from '../gameConfig.js';
import { createMultiplayerClient, MULTIPLAYER_SERVER_URL } from '../multiplayerClient.js';
import OnlineGame from './OnlineGame.jsx';

const COLORS = ['#ea5b3d','#3c73df','#23a476','#9a62d5','#eba928','#e35f96','#168ea1','#73564a'];
const SESSION_KEY = 'snake-ladder-online-session-v1';
const loadSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } };
const saveSession = session => localStorage.setItem(SESSION_KEY, JSON.stringify(session));
const clearSession = () => localStorage.removeItem(SESSION_KEY);
const call = (socket, event, payload = {}) => new Promise(resolve => {
  if (!socket.connected) return resolve({ ok: false, error: 'Not connected to the multiplayer server.' });
  socket.timeout(8000).emit(event, payload, (error, response) => resolve(error ? { ok: false, error: 'The multiplayer server did not respond. Please try again.' } : response));
});

export default function OnlineLobby({ onBack }) {
  const socket = useMemo(() => createMultiplayerClient(), []);
  const [view, setView] = useState(() => loadSession()?.roomCode ? 'recovering' : 'menu');
  const [room, setRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [identity, setIdentity] = useState({ name: '', icon: TOKEN_ICONS[0], color: COLORS[0] });
  const [code, setCode] = useState('');
  const [self, setSelf] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [connection, setConnection] = useState(socket.connected ? 'connected' : 'connecting');

  useEffect(() => {
    const connected = async () => {
      setConnection('connected'); setError('');
      const directory = await call(socket, 'rooms:list');
      if (directory?.ok) setRooms(directory.rooms);
      const saved = loadSession();
      if (!saved?.roomCode) return;
      const result = saved.spectator
        ? await call(socket, 'room:watch', { code: saved.roomCode })
        : await call(socket, 'room:reconnect', { ...saved, code: saved.roomCode });
      if (!result?.ok) { clearSession(); setSelf(null); setRoom(null); setView('menu'); return; }
      setSelf(saved); setRoom(result.room); setView(result.room.status === 'lobby' ? 'lobby' : 'game');
    };
    const disconnected = () => setConnection('reconnecting');
    const failed = connectionError => { setConnection('unavailable'); setError(`Cannot reach ${MULTIPLAYER_SERVER_URL}: ${connectionError.message}`); };
    const update = next => setRoom(next);
    const started = next => { setRoom(next); setView('game'); };
    socket.on('connect', connected); socket.on('disconnect', disconnected); socket.on('connect_error', failed);
    socket.on('room:update', update); socket.on('rooms:update', setRooms); socket.on('game:started', started); socket.connect();
    return () => { socket.off('connect', connected); socket.off('disconnect', disconnected); socket.off('connect_error', failed); socket.off('room:update', update); socket.off('rooms:update', setRooms); socket.off('game:started', started); socket.disconnect(); };
  }, [socket]);

  const submit = async type => {
    if (pending) return; setPending(true); setError('');
    const result = await call(socket, type === 'create' ? 'room:create' : 'room:join', { ...identity, code });
    setPending(false); if (!result?.ok) return setError(result?.error || 'Unable to connect.');
    const session = { playerId: result.playerId, sessionToken: result.sessionToken, roomCode: result.room.code };
    saveSession(session); setSelf(session); setRoom(result.room);
    setNotice(result.colorChanged ? 'That color was taken, so another available color was assigned.' : '');
    setView(result.room.status === 'lobby' ? 'lobby' : 'game');
  };
  const watch = async roomCode => {
    if (pending) return; setPending(true); setError(''); const result = await call(socket, 'room:watch', { code: roomCode }); setPending(false);
    if (!result?.ok) return setError(result?.error || 'Unable to watch that room.');
    const session = { spectator: true, roomCode }; saveSession(session); setSelf(session); setRoom(result.room); setView(result.room.status === 'lobby' ? 'lobby' : 'game');
  };
  const leave = async () => { await call(socket, 'room:leave'); clearSession(); setRoom(null); setSelf(null); setView('menu'); };
  const me = room?.players?.find(player => player.id === self?.playerId);
  const isSpectator = Boolean(self?.spectator);
  const isHost = Boolean(me && room && me.id === room.hostId);
  const canStart = Boolean(isHost && room?.players?.length >= 2 && room.players.every(player => player.id === room.hostId || player.ready));
  const updateSettings = patch => call(socket, 'room:settings', { ...room.settings, boardPresetId: room.boardPresetId, ...patch }).then(result => !result.ok && setError(result.error));

  if (view === 'menu') return <section className="online-screen"><div className="online-card public-online-card">
    <button className="text-back" onClick={onBack}>← Back</button><div className="eyebrow">Public matches</div><h1>Online multiplayer</h1><p className={`connection-state ${connection}`}>● {connection}</p>
    <div className="online-menu-actions"><button className="primary-button" onClick={() => setView('create')}>Create room</button><button className="secondary-button" onClick={() => { setCode(''); setView('join'); }}>Join by code</button></div>
    <div className="public-room-heading"><div><h2>Live matches</h2><small>Join open matches or watch without taking a player slot.</small></div><button type="button" onClick={async () => { const result = await call(socket, 'rooms:list'); if (result?.ok) setRooms(result.rooms); }}>Refresh</button></div>
    <div className="public-room-list">{rooms.length === 0 ? <p className="empty-rooms">No public matches yet. Create the first room.</p> : rooms.map(item => { const canJoin = item.status !== 'finished' && item.playerCount < 8; return <article className="public-room" key={item.code}><div><strong>{item.hostName}'s match</strong><span>{item.code} · {item.mode} · {item.boardPresetId}</span></div><div className="public-room-stats"><b>{item.playerCount}/8 players</b><span>{item.spectatorCount} watching</span><em className={`match-status ${item.status}`}>{item.status}</em></div><div className="public-room-actions">{canJoin && <button type="button" className="primary-button" onClick={() => { setCode(item.code); setView('join'); }}>Join</button>}<button type="button" className="secondary-button" disabled={pending} onClick={() => watch(item.code)}>Watch</button></div></article>; })}</div>{error && <p className="online-error">{error}</p>}
  </div></section>;

  if (view === 'create' || view === 'join') return <section className="online-screen"><form className="online-card" onSubmit={event => { event.preventDefault(); submit(view); }}>
    <button type="button" className="text-back" onClick={() => setView('menu')}>← Back</button><div className="eyebrow">{view === 'create' ? 'Host a match' : 'Enter a room'}</div><h1>{view === 'create' ? 'Create room' : 'Join room'}</h1><p className={`connection-state ${connection}`}>● {connection}</p>
    {view === 'join' && <label>Room code<input value={code} onChange={event => setCode(event.target.value.toUpperCase())} maxLength="6" required/></label>}<label>Player name<input value={identity.name} onChange={event => setIdentity({ ...identity, name: event.target.value })} maxLength="18" required/></label>
    <label>Avatar<div className="avatar-chooser"><select value={TOKEN_ICONS.includes(identity.icon) ? identity.icon : ''} onChange={event => event.target.value && setIdentity({ ...identity, icon: event.target.value })}><option value="">Custom</option>{TOKEN_ICONS.map(icon => <option key={icon}>{icon}</option>)}</select><input aria-label="Custom emoji avatar" value={TOKEN_ICONS.includes(identity.icon) ? '' : identity.icon} onChange={event => setIdentity({ ...identity, icon: Array.from(event.target.value).slice(0, 2).join('') })} placeholder="Paste emoji" maxLength="4"/></div></label>
    <label>Player color<div className="online-colors">{COLORS.map(color => <button type="button" aria-label={color} className={identity.color === color ? 'selected' : ''} style={{ background: color }} onClick={() => setIdentity({ ...identity, color })} key={color}/>)}</div></label>{error && <p className="online-error">{error}</p>}<button className="primary-button" type="submit" disabled={pending || connection !== 'connected'}>{pending ? 'Connecting…' : connection !== 'connected' ? 'Waiting for server…' : view === 'create' ? 'Create room' : 'Join game'}</button>
  </form></section>;

  if (view === 'recovering' || ((view === 'lobby' || view === 'game') && !room)) return <section className="online-screen"><div className="online-card"><div className="eyebrow">Reconnecting</div><h1>Restoring your game…</h1><p>Checking your saved player session with the authoritative server.</p></div></section>;
  if (view === 'game') return <OnlineGame socket={socket} room={room} self={self} onSnapshot={setRoom} onLeave={leave} onHome={async () => { await leave(); onBack(); }}/>;

  return <section className="online-screen"><div className="online-lobby"><header><div><span className="eyebrow">{isSpectator ? 'Watching lobby' : 'Online room'}</span><h1>{room.code}</h1></div><button type="button" onClick={() => navigator.clipboard?.writeText(room.code)}>Copy code</button><span className={`connection-state ${connection}`}>● {connection}</span></header>
    {isSpectator && <p className="spectator-banner">👁 Spectator mode · You are watching and do not occupy a player slot.</p>}{notice && <p className="online-notice">{notice}</p>}
    <div className="lobby-grid"><div className="lobby-players"><h2>Players {room.players.length} / 8</h2>{room.players.map((player, index) => <div className="lobby-player" key={player.id}><span className="lobby-avatar" style={{ background: player.color }}>{player.icon}</span><div><b>{player.name}</b><small>P{index + 1}{player.id === me?.id ? ' · YOU' : ''}</small></div><span>{player.id === room.hostId ? '👑 HOST' : player.ready ? '✅ READY' : '⏳ NOT READY'}</span><i>{player.connected ? '🟢' : '🟡'}</i></div>)}{!isSpectator && !isHost && me && <button className="primary-button" onClick={() => call(socket, 'room:ready', { ready: !me.ready })}>{me.ready ? 'Not ready' : 'Ready'}</button>}</div>
      <div className="lobby-settings"><h2>Match settings</h2><label>Game mode<select disabled={!isHost} value={room.settings.mode} onChange={event => updateSettings({ mode: event.target.value })}>{Object.values(MODE_PRESETS).map(mode => <option value={mode.id} key={mode.id}>{mode.name}</option>)}</select></label><label>Board<select disabled={!isHost} value={room.boardPresetId} onChange={event => updateSettings({ boardPresetId: event.target.value })}>{Object.values(BOARD_PRESETS).map(board => <option value={board.id} key={board.id}>{board.icon} {board.name}</option>)}</select></label><label>Animation<select disabled={!isHost} value={room.settings.animationSpeed} onChange={event => updateSettings({ animationSpeed: event.target.value })}><option>fast</option><option>normal</option><option>cinematic</option></select></label><button className={`setting-toggle ${room.settings.exactRoll ? 'on' : ''}`} disabled={!isHost} onClick={() => updateSettings({ exactRoll: !room.settings.exactRoll })}><span>Exact roll</span><b>{room.settings.exactRoll ? 'ON' : 'OFF'}</b></button><button className={`setting-toggle ${room.settings.extraTurnOnSix ? 'on' : ''}`} disabled={!isHost} onClick={() => updateSettings({ extraTurnOnSix: !room.settings.extraTurnOnSix })}><span>Six = extra turn</span><b>{room.settings.extraTurnOnSix ? 'ON' : 'OFF'}</b></button>{error && <p className="online-error">{error}</p>}{isHost && <button className="primary-button" disabled={!canStart} onClick={async () => { const result = await call(socket, 'room:start'); if (!result.ok) setError(result.error); }}>Start game</button>}<button className="secondary-button lobby-leave" onClick={leave}>{isSpectator ? 'Stop watching' : 'Leave room'}</button></div></div>
    {isSpectator && <p className="spectator-count">👁 {room.spectatorCount} spectator{room.spectatorCount === 1 ? '' : 's'} currently watching</p>}
  </div></section>;
}
