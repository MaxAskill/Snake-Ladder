export default function GameIcon({ icon, label, size = 'md', category = '', active = false, className = '' }) {
  return <span className={`game-icon game-icon-${size} game-icon-${category} ${active ? 'active' : ''} ${className}`.trim()} role={label ? 'img' : undefined} aria-label={label || undefined} title={label || undefined}><span aria-hidden="true">{icon}</span></span>;
}
