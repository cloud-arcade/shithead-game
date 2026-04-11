/**
 * SwapPhase — Pre-game card swap screen.
 *
 * Each player can:
 * 1. Swap a hand card with a face-up card (tap one from each row)
 * 2. Redraw their entire hand (shuffle back into deck, draw 3 new)
 * 3. Host can start the game when everyone is ready
 */

import { useState, useCallback } from 'react';
import type { Player } from '../../game/types';
import { CardComponent } from './CardComponent';

interface SwapPhaseProps {
  myPlayer: Player;
  isHost: boolean;
  onSwap: (handIndex: number, faceUpIndex: number) => void;
  onRedraw: () => void;
  onReady: () => void;
}

export function SwapPhase({
  myPlayer,
  isHost,
  onSwap,
  onRedraw,
  onReady,
}: SwapPhaseProps) {
  const [selectedHand, setSelectedHand] = useState<number | null>(null);
  const [selectedFaceUp, setSelectedFaceUp] = useState<number | null>(null);

  const handleSwap = useCallback(() => {
    if (selectedHand !== null && selectedFaceUp !== null) {
      onSwap(selectedHand, selectedFaceUp);
      setSelectedHand(null);
      setSelectedFaceUp(null);
    }
  }, [selectedHand, selectedFaceUp, onSwap]);

  const handleRedraw = useCallback(() => {
    onRedraw();
    setSelectedHand(null);
    setSelectedFaceUp(null);
  }, [onRedraw]);

  const canSwap = selectedHand !== null && selectedFaceUp !== null;

  return (
    <div className="swap-phase">
      <div className="swap-phase__title">Swap Phase</div>
      <div className="swap-phase__subtitle">
        Swap hand cards with face-up cards, or redraw your entire hand
      </div>

      {/* Face-down cards (locked, can't see them) */}
      <div className="swap-phase__section">
        <span className="swap-phase__label">Face Down (hidden)</span>
        <div className="swap-phase__cards">
          {myPlayer.cards.faceDown.map((card) => (
            <CardComponent
              key={card.id}
              card={card}
              faceDown
              size="table"
              disabled
            />
          ))}
        </div>
      </div>

      {/* Face-up cards (selectable for swap) */}
      <div className="swap-phase__section">
        <span className="swap-phase__label">Face Up (tap to swap)</span>
        <div className="swap-phase__cards">
          {myPlayer.cards.faceUp.map((card, i) => (
            <CardComponent
              key={card.id}
              card={card}
              size="table"
              selected={selectedFaceUp === i}
              onClick={() =>
                setSelectedFaceUp((prev) => (prev === i ? null : i))
              }
            />
          ))}
        </div>
      </div>

      {/* Hand cards (selectable for swap) */}
      <div className="swap-phase__section">
        <span className="swap-phase__label">Your Hand (tap to swap)</span>
        <div className="swap-phase__cards">
          {myPlayer.cards.hand.map((card, i) => (
            <CardComponent
              key={card.id}
              card={card}
              size="table"
              selected={selectedHand === i}
              onClick={() =>
                setSelectedHand((prev) => (prev === i ? null : i))
              }
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="swap-phase__actions">
        <button
          className="action-btn action-btn--play"
          onClick={handleSwap}
          disabled={!canSwap}
        >
          Swap
        </button>
        <button className="action-btn action-btn--pickup" onClick={handleRedraw}>
          Redraw Hand
        </button>
        {isHost && (
          <button className="action-btn action-btn--play" onClick={onReady}>
            Start Game
          </button>
        )}
      </div>
    </div>
  );
}
