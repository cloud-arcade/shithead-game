/**
 * GameBoard — Main game view during the playing phase
 */

import { useState, useCallback, useMemo, memo } from 'react';
import type { ShitheadGameState, Card } from '../../game/types';
import { canPlayOnPile, areAllSameRank, getPlayerPlayableZone, hasPlayableCard } from '../../game/engine';
import { PlayerArea } from './PlayerArea';
import { PileArea } from './PileArea';

interface GameBoardProps {
  gameState: ShitheadGameState;
  mySocketId: string | null;
  isMyTurn: boolean;
  onPlayCards: (cardIds: string[]) => void;
  onPickUpPile: () => void;
}

export const GameBoard = memo(function GameBoard({
  gameState,
  mySocketId,
  isMyTurn,
  onPlayCards,
  onPickUpPile,
}: GameBoardProps) {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  const myPlayer = gameState.players.find((p) => p.socketId === mySocketId) ?? null;
  const opponents = gameState.players.filter((p) => p.socketId !== mySocketId);
  const myZone = myPlayer ? getPlayerPlayableZone(myPlayer) : null;
  const canIPlay = mySocketId ? hasPlayableCard(gameState, mySocketId) : false;

  // Get the first selected card's rank for multi-select validation
  const selectedRank = useMemo(() => {
    if (selectedCards.size === 0 || !myPlayer) return null;
    const zone = myZone === 'hand' ? myPlayer.cards.hand :
                 myZone === 'faceUp' ? myPlayer.cards.faceUp : [];
    const firstId = Array.from(selectedCards)[0];
    const card = zone.find((c) => c.id === firstId);
    return card?.rank ?? null;
  }, [selectedCards, myPlayer, myZone]);

  const handleCardClick = useCallback((cardId: string) => {
    if (!isMyTurn || !myPlayer || !myZone) return;

    // Face-down cards: play immediately (single card)
    if (myZone === 'faceDown') {
      onPlayCards([cardId]);
      return;
    }

    const zone = myZone === 'hand' ? myPlayer.cards.hand : myPlayer.cards.faceUp;
    const card = zone.find((c) => c.id === cardId);
    if (!card) return;

    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        // Only allow selecting cards of the same rank
        if (next.size > 0 && card.rank !== selectedRank) {
          // Different rank — start new selection
          return new Set([cardId]);
        }
        next.add(cardId);
      }
      return next;
    });
  }, [isMyTurn, myPlayer, myZone, selectedRank, onPlayCards]);

  const handlePlay = useCallback(() => {
    if (selectedCards.size === 0) return;
    const ids = Array.from(selectedCards);
    onPlayCards(ids);
    setSelectedCards(new Set());
  }, [selectedCards, onPlayCards]);

  const handlePickUp = useCallback(() => {
    onPickUpPile();
    setSelectedCards(new Set());
  }, [onPickUpPile]);

  // Validate selection for play button
  const canPlaySelection = useMemo(() => {
    if (selectedCards.size === 0 || !myPlayer || !myZone || !isMyTurn) return false;
    const zone = myZone === 'hand' ? myPlayer.cards.hand : myPlayer.cards.faceUp;
    const cards = Array.from(selectedCards)
      .map((id) => zone.find((c) => c.id === id))
      .filter(Boolean) as Card[];
    if (cards.length === 0) return false;
    if (!areAllSameRank(cards)) return false;
    return canPlayOnPile(cards[0], gameState.pile);
  }, [selectedCards, myPlayer, myZone, isMyTurn, gameState.pile]);

  return (
    <div className="flex flex-col h-full">
      {/* Opponents area (top) */}
      <div className="flex justify-center gap-2 sm:gap-4 p-2 flex-wrap">
        {opponents.map((p) => (
          <PlayerArea
            key={p.socketId}
            player={p}
            isMe={false}
            isCurrentTurn={gameState.currentTurn === p.socketId}
            selectedCardIds={new Set()}
            playableZone={null}
            compact
          />
        ))}
      </div>

      {/* Center: Pile area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-0">
        <PileArea
          pile={gameState.pile}
          drawPileCount={gameState.drawPile.length}
          burnedCount={gameState.burned.length}
        />

        {/* Game message */}
        {gameState.lastMessage && (
          <div className="text-center px-4 py-1.5 bg-black/40 rounded-lg max-w-md">
            <p className="text-xs sm:text-sm text-zinc-300">{gameState.lastMessage}</p>
          </div>
        )}

        {/* Action buttons */}
        {isMyTurn && !myPlayer?.isFinished && (
          <div className="flex gap-2">
            <button
              onClick={handlePlay}
              disabled={!canPlaySelection}
              className="btn btn-primary btn-sm"
            >
              Play {selectedCards.size > 0 ? `(${selectedCards.size})` : ''}
            </button>
            <button
              onClick={handlePickUp}
              disabled={gameState.pile.length === 0}
              className="btn btn-danger btn-sm"
            >
              Pick Up Pile
            </button>
          </div>
        )}

        {isMyTurn && !canIPlay && myZone !== 'faceDown' && myZone !== null && (
          <p className="text-xs text-red-400">No playable cards — pick up the pile!</p>
        )}
      </div>

      {/* My area (bottom) */}
      {myPlayer && (
        <div className="p-2 border-t border-white/5 bg-black/20">
          <PlayerArea
            player={myPlayer}
            isMe
            isCurrentTurn={isMyTurn}
            selectedCardIds={selectedCards}
            playableZone={isMyTurn ? myZone : null}
            onCardClick={handleCardClick}
          />
        </div>
      )}
    </div>
  );
});
