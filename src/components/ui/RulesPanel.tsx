import { memo } from 'react';

interface CardRule {
  rank: string;
  emoji: string;
  name: string;
  effect: string;
  description: string;
}

const SPECIAL_CARDS: CardRule[] = [
  {
    rank: '2',
    emoji: '🔄',
    name: 'Reset',
    effect: 'Resets the pile',
    description: 'Can be played on anything. Next player can play any card.',
  },
  {
    rank: '3',
    emoji: '👻',
    name: 'Invisible',
    effect: 'Transparent',
    description: 'Copies the card below. Next player plays on the previous card.',
  },
  {
    rank: '7',
    emoji: '⬇️',
    name: 'Lower',
    effect: 'Play lower or equal',
    description: 'Next player must play 7 or lower (or a special card).',
  },
  {
    rank: '10',
    emoji: '🔥',
    name: 'Burn',
    effect: 'Burns the pile',
    description: 'Removes entire pile from game. Same player goes again.',
  },
];

const GENERAL_RULES = [
  { icon: '📤', rule: 'Play equal or higher rank' },
  { icon: '🃏', rule: 'Four of a kind burns the pile' },
  { icon: '✋', rule: 'Hand → Face-up → Face-down' },
  { icon: '💀', rule: 'Last player is the Shithead!' },
];

export const RulesPanel = memo(function RulesPanel() {
  return (
    <div className="rules-panel">
      <div className="rules-panel__header">
        <span className="rules-panel__icon">📖</span>
        <h2 className="rules-panel__title">Card Rules</h2>
      </div>

      <div className="rules-panel__content">
        {/* Special Cards Section */}
        <div className="rules-panel__section">
          <h3 className="rules-panel__section-title">Special Cards</h3>
          <div className="rules-panel__cards">
            {SPECIAL_CARDS.map((card) => (
              <div key={card.rank} className="rule-card">
                <div className="rule-card__header">
                  <span className="rule-card__rank">{card.rank}</span>
                  <span className="rule-card__emoji">{card.emoji}</span>
                  <span className="rule-card__name">{card.name}</span>
                </div>
                <div className="rule-card__effect">{card.effect}</div>
                <p className="rule-card__desc">{card.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* General Rules Section */}
        <div className="rules-panel__section">
          <h3 className="rules-panel__section-title">How to Play</h3>
          <ul className="rules-panel__list">
            {GENERAL_RULES.map((item, idx) => (
              <li key={idx} className="rules-panel__list-item">
                <span className="rules-panel__list-icon">{item.icon}</span>
                <span>{item.rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
});
