import { ROULETTE_EFFECTS } from '../rouletteConfig.js';

const CATEGORY_LABELS = { power: 'Power', defense: 'Defense', attack: 'Attack', penalty: 'Penalty', chaos: 'Chaos' };

export default function PowerUpGuide({ open, onClose }) {
  if (!open) return null;
  return <div className="power-guide-backdrop" role="dialog" aria-modal="true" aria-labelledby="power-guide-title">
    <section className="power-guide-card">
      <button className="power-guide-close" type="button" onClick={onClose} aria-label="Close power-up guide">×</button>
      <div className="eyebrow">Game reference</div><h2 id="power-guide-title">Power-up legends</h2>
      <p>Land on a special tile to spin its wheel. Stored powers stay in your inventory until activated.</p>
      <div className="power-guide-grid">{Object.entries(CATEGORY_LABELS).map(([category, label]) => <div className={`power-guide-group ${category}`} key={category}><h3>{label}</h3>{ROULETTE_EFFECTS.filter(effect => effect.category === category).map(effect => <article key={effect.id}><span>{effect.icon}</span><div><strong>{effect.name}{effect.stored ? ' · Stored' : ''}</strong><small>{effect.description}</small></div></article>)}</div>)}</div>
    </section>
  </div>;
}
