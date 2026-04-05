/**
 * PlayerArea — Blackjack-style player seat with avatar underneath cards.
 * Uses game asset avatars: active_1 for current turn, player_2 for others.
 */

import { memo } from 'react';
import type { Player } from '../../game/types';
import { CardComponent } from './CardComponent';
import { getTotalCards, getAssetPath } from '../../game/engine';

const AVATAR_ACTIVE = getAssetPath('assets/game-assets/interface_game/avatar_player_active_1.png');
const AVATAR_DEFAULT = getAssetPath('assets/game-assets/interface_game/avatar_player_2.png');

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
  const avatarSrc = isCurrentTurn ? AVATAR_ACTIVE : AVATAR_DEFAULT;

  return (
    <div
      className={`
        relative flex flex-col items-center transition-all duration-300
        ${player.isFinished ? 'opacity-40' : ''}
      `}
    >
      {/* Cards section */}
      <div className="flex flex-col items-center gap-0.5">
        {/* Table cards (face-down + face-up stacked) */}
        {(player.cards.faceDown.length > 0 || player.cards.faceUp.length > 0) && (
          <div className="flex gap-0.5 items-end">
            {Array.from({ length: Math.max(player.cards.faceDown.length, player.cards.faceUp.length) }).map((_, i) => {
              const faceDownCard = player.cards.faceDown[i];
              const faceUpCard = player.cards.faceUp[i];
              const isPlayableFaceDown = isMe && isCurrentTurn && playableZone === 'faceDown' && faceDownCard;
              const isPlayableFaceUp = isMe && isCurrentTurn && playableZone === 'faceUp' && faceUpCard;

              return (
                <div key={i} className="relative">
                  {faceDownCard && (
                    <CardComponent
                      card={faceDownCard}
                      faceDown
                      small={compact || !isMe}
                      disabled={!isPlayableFaceDown}
                      onClick={isPlayableFaceDown ? () => onCardClick?.(faceDownCard.id) : undefined}
                    />
                  )}
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

        {/* Hand cards — visible only to me */}
        {isMe && player.cards.hand.length > 0 && (
          <div className="flex justify-center overflow-x-auto scrollbar-hide mt-0.5 pb-0.5 max-w-full">
            <div className="flex" style={{ gap: player.cards.hand.length > 7 ? '-0.4rem' : '0.15rem' }}>
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
          </div>
        )}

        {/* Opponent hand cards (face-down) */}
        {!isMe && player.cards.hand.length > 0 && (
          <div className="flex mt-0.5" style={{ gap: player.cards.hand.length > 5 ? '-0.5rem' : '-0.25rem' }}>
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

      {/* Avatar + name underneath cards */}
      <div className="flex flex-col items-center mt-1">
        <div className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 ${
          isCurrentTurn ? 'border-gold-light shadow-[0_0_8px_rgba(240,208,96,0.5)]' : 'border-white/20'
        }`}>
          <img
            src={avatarSrc}
            alt={player.displayName}
            className="w-full h-full object-cover"
            draggable={false}
            onError={(e) => {
              (e.target as HTMLImageElement).src = AVATAR_DEFAULT;
            }}
          />
          {/* Turn indicator glow */}
          {isCurrentTurn && (
            <div className="absolute inset-0 rounded-full ring-2 ring-gold-light/50 animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`text-[0.5rem] font-bold uppercase tracking-wide drop-shadow truncate max-w-[5rem] ${
            isCurrentTurn ? 'text-gold-light' : 'text-white/70'
          }`}>
            {player.displayName}
          </span>
          {player.isHost && <span className="text-gold text-[0.45rem]">★</span>}
        </div>
        {!player.isFinished && (
          <span className="text-[0.4rem] text-white/30 font-medium">{totalCards} cards</span>
        )}
        {player.isFinished && (
          <span className="text-[0.4rem] text-green-400 font-bold">#{player.finishPosition}</span>
        )}
      </div>
    </div>
  );
});
