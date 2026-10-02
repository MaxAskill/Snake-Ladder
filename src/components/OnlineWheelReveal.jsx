import { ROULETTE_EFFECTS } from '../rouletteConfig.js';

const COLORS = { power: '#32a879', attack: '#d95645', defense: '#3979c6', penalty: '#e79a39', chaos: '#8d5bc1' };

export default function OnlineWheelReveal({ result }) {
  if (!result) return null;
  const effects = ROULETTE_EFFECTS;
  const segment = 360 / effects.length;
  const index = Math.max(0, effects.findIndex(effect => effect.id === result.id));
  const stop = 360 * 7 - (index * segment + segment / 2);
  const gradient = `conic-gradient(${effects.map((effect, position) => `${COLORS[effect.category]} ${position * segment}deg ${(position + 1) * segment}deg`).join(',')})`;
  return <div className="online-wheel-backdrop" aria-live="assertive"><div className="online-wheel-card"><div className="eyebrow">Wheel of Fate</div><h2>{result.playerName} spins…</h2><div className="online-wheel-stage"><div className="wheel-pointer">▼</div><div className="online-fate-wheel" style={{ background: gradient, '--wheel-stop': `${stop}deg` }}>{effects.map((effect, position) => <span key={effect.id} style={{ transform: `rotate(${position * segment + segment / 2}deg)` }}><b>{effect.icon}</b></span>)}</div><div className="wheel-hub">FATE</div></div><div className={`online-wheel-result ${result.category}`}><span>{result.icon}</span><div><small>{result.rarity} · {result.category}</small><strong>{result.name}</strong><p>{result.description}</p></div></div></div></div>;
}
