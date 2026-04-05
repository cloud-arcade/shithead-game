/**
 * SwapPhase — Pre-game phase where players can swap hand ↔ face-up cards
 */

import { memo, useState } from 'react';
import type { Player } from '../../game/types';
import { CardComponent } from './CardComponent';

interface SwapPhaseProps {
  myPlayer: Player;
  isHost: boolean;
  onSwap: (handIndex: number, faceUpIndex: number) => void;
  onReady: () => void;
}

export const SwapPhase = memo(function SwapPhase({
  myPlayer,
  isHost,
  onSwap,
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
    <div className="flex flex-col items-center gap-2 sm:gap-3 max-h-full overflow-hidden">
      <div className="text-center">
        <h2 className="text-base sm:text-lg font-semibold text-yellow-300">Swap Phase</h2>
        <p className="text-[0.6rem] sm:text-xs text-zinc-400 mt-0.5">
          Tap a hand card, then a face-up card to swap them.
        </p>
      </div>

      {/* Face-down cards (can't see these) */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[0.5rem] sm:text-[0.6rem] text-zinc-500 uppercase tracking-wider">Face Down (hidden)</span>
        <div className="flex gap-1 sm:gap-2">
          {myPlayer.cards.faceDown.map((card) => (
            <CardComponent key={card.id} card={card} faceDown disabled />
          ))}
        </div>
      </div>

      {/* Face-up cards */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[0.5rem] sm:text-[0.6rem] text-zinc-500 uppercase tracking-wider">Face Up</span>
        <div className="flex gap-1 sm:gap-2">
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
        <span className="text-[0.5rem] sm:text-[0.6rem] text-zinc-500 uppercase tracking-wider">Your Hand</span>
        <div className="flex gap-1 sm:gap-2">
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

      {/* Ready button */}
      {isHost && (
        <button
          onClick={onReady}
          className="btn btn-primary btn-md sm:btn-lg mt-1"
        >
          Start Game 🎮
        </button>
      )}
      {!isHost && (
        <p className="text-[0.6rem] sm:text-xs text-zinc-500 mt-1">Waiting for host to start...</p>
      )}
    </div>
  );
});
