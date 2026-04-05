/**
 * SwapPhase — Casino-style pre-game swap phase
 * Players swap hand ↔ face-up cards, or redraw their entire hand.
 */

import { memo, useState } from 'react';
import type { Player } from '../../game/types';
import { CardComponent } from './CardComponent';

interface SwapPhaseProps {
  myPlayer: Player;
  isHost: boolean;
  onSwap: (handIndex: number, faceUpIndex: number) => void;
  onRedraw: () => void;
  onReady: () => void;
}

export const SwapPhase = memo(function SwapPhase({
  myPlayer,
  isHost,
  onSwap,
  onRedraw,
  onReady,
}: SwapPhaseProps) {
  const [selectedHand, setSelectedHand] = useState<number | null>(null);
  const [selectedFaceUp, setSelectedFaceUp] = useState<number | null>(null);

  const handleHandClick = (index: number) => {
    if (selectedFaceUp !== null) {
      onSwap(index, selectedFaceUp);
      setSelectedHand(null);
      setSelectedFaceUp(null);
    } else {
      setSelectedHand(selectedHand === index ? null : index);
    }
  };

  const handleFaceUpClick = (index: number) => {
    if (selectedHand !== null) {
      onSwap(selectedHand, index);
      setSelectedHand(null);
      setSelectedFaceUp(null);
    } else {
      setSelectedFaceUp(selectedFaceUp === index ? null : index);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="text-center py-1 shrink-0">
        <h2 className="text-sm font-bold text-gold-light uppercase tracking-wider text-glow-gold drop-shadow">
          Swap Phase
        </h2>
        <p className="text-[0.5rem] text-white/50 mt-0.5 drop-shadow">
          Tap a hand card then a face-up card to swap, or redraw your entire hand
        </p>
      </div>

      {/* Cards laid out on the table */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden gap-2 px-4">
        {/* Face-down cards */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[0.45rem] text-white/30 uppercase tracking-wider font-semibold drop-shadow">
            Face Down (Hidden)
          </span>
          <div className="flex gap-1">
            {myPlayer.cards.faceDown.map((card) => (
              <CardComponent key={card.id} card={card} faceDown disabled />
            ))}
          </div>
        </div>

        {/* Face-up cards */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[0.45rem] text-white/30 uppercase tracking-wider font-semibold drop-shadow">
            Face Up
          </span>
          <div className="flex gap-1">
            {myPlayer.cards.faceUp.map((card, i) => (
              <CardComponent
                key={card.id}
                card={card}
                selected={selectedFaceUp === i}
                onClick={() => handleFaceUpClick(i)}
              />
            ))}
          </div>
        </div>

        {/* Hand cards */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[0.45rem] text-white/30 uppercase tracking-wider font-semibold drop-shadow">
            Your Hand
          </span>
          <div className="flex gap-1">
            {myPlayer.cards.hand.map((card, i) => (
              <CardComponent
                key={card.id}
                card={card}
                selected={selectedHand === i}
                onClick={() => handleHandClick(i)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="shrink-0 flex items-center justify-center gap-3 py-2 px-4">
        <button onClick={onRedraw} className="btn btn-secondary btn-sm">
          Redraw Hand
        </button>
        {isHost ? (
          <button onClick={onReady} className="btn btn-primary btn-md">
            Start Game
          </button>
        ) : (
          <span className="text-[0.55rem] text-white/40 font-medium drop-shadow">Waiting for host...</span>
        )}
      </div>
    </div>
  );
});
