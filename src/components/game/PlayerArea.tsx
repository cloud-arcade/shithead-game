/**
 * PlayerArea — Shows a player's face-down, face-up, and hand cards
 */

import { memo } from 'react';
import type { Player } from '../../game/types';
import { CardComponent } from './CardComponent';
import { getTotalCards } from '../../game/engine';

interface PlayerAreaProps {
  player: Player;
  isMe: boolean;
  isCurrentTurn: boolean;
  selectedCardIds: Set<string>;
  playableZone: 'hand' | 'faceUp' | 'faceDown' | null;
  onCardClick?: (cardId: string) => void;
  compact?: boolean;
}

export const PlayerArea = memo(function PlayerArea({
  player,
  isMe,
  isCurrentTurn,
  selectedCardIds,
  playableZone,
  onCardClick,
  compact = false,
}: PlayerAreaProps) {
  const totalCards = getTotalCards(player);

  return (
    <div
      className={`
        relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300
        ${isCurrentTurn ? 'ring-2 ring-yellow-400/60 bg-yellow-400/5' : ''}
        ${player.isFinished ? 'opacity-50' : ''}
      `}
    >
      {/* Player name badge */}
      <div className={`
        flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium
        ${isCurrentTurn ? 'bg-yellow-400/20 text-yellow-300' : 'bg-white/5 text-zinc-400'}
        ${isMe ? 'ring-1 ring-emerald-400/40' : ''}
      `}>
        {isMe && <span className="text-emerald-400">●</span>}
        <span>{player.displayName}</span>
        {player.isHost && <span className="text-amber-400">★</span>}
        {player.isFinished && (
          <span className="text-emerald-400">#{player.finishPosition}</span>
        )}
        {!player.isFinished && (
          <span className="text-zinc-600 text-[0.6rem]">({totalCards})</span>
        )}
        {isCurrentTurn && <span className="animate-pulse text-yellow-300">◀</span>}
      </div>

      {/* Table cards (face-down + face-up stacked) */}
      {(player.cards.faceDown.length > 0 || player.cards.faceUp.length > 0) && (
        <div className="flex gap-1 items-end">
          {Array.from({ length: Math.max(player.cards.faceDown.length, player.cards.faceUp.length) }).map((_, i) => {
            const faceDownCard = player.cards.faceDown[i];
            const faceUpCard = player.cards.faceUp[i];
            const isPlayableFaceDown = isMe && isCurrentTurn && playableZone === 'faceDown' && faceDownCard;
            const isPlayableFaceUp = isMe && isCurrentTurn && playableZone === 'faceUp' && faceUpCard;

            return (
              <div key={i} className="relative">
                {/* Face-down card (bottom) */}
                {faceDownCard && (
                  <CardComponent
                    card={faceDownCard}
                    faceDown
                    small={compact || !isMe}
                    disabled={!isPlayableFaceDown}
                    onClick={isPlayableFaceDown ? () => onCardClick?.(faceDownCard.id) : undefined}
                    className={!faceUpCard ? '' : ''}
                  />
                )}
                {/* Face-up card (on top) */}
                {faceUpCard && (
                  <div className={faceDownCard ? 'absolute inset-0' : ''}>
                    <CardComponent
                      card={faceUpCard}
                      small={compact || !isMe}
                      selected={selectedCardIds.has(faceUpCard.id)}
                      disabled={!isPlayableFaceUp}
                      onClick={isPlayableFaceUp ? () => onCardClick?.(faceUpCard.id) : undefined}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Hand cards (only visible to the player themselves) */}
      {isMe && player.cards.hand.length > 0 && (
        <div className="flex flex-wrap justify-center gap-0.5 mt-1">
          {player.cards.hand.map((card) => {
            const isPlayable = isCurrentTurn && playableZone === 'hand';
            return (
              <CardComponent
                key={card.id}
                card={card}
                selected={selectedCardIds.has(card.id)}
                disabled={!isPlayable}
                onClick={isPlayable ? () => onCardClick?.(card.id) : undefined}
              />
            );
          })}
        </div>
      )}

      {/* For opponents: show hand count */}
      {!isMe && player.cards.hand.length > 0 && (
        <div className="flex gap-0.5 mt-1">
          {player.cards.hand.map((card) => (
            <CardComponent
              key={card.id}
              card={card}
              faceDown
              small
              disabled
            />
          ))}
        </div>
      )}
    </div>
  );
});
