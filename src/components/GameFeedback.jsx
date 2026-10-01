import GameIcon from './GameIcon.jsx';
export default function GameFeedback({ feedback }) { return feedback ? <div className={`game-feedback ${feedback.type || ''}`} aria-live="assertive"><GameIcon icon={feedback.icon} label={feedback.text} size="xl" category={feedback.type}/><strong>{feedback.text}</strong></div> : null; }
