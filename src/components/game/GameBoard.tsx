/**
 * GameBoard — Blackjack-style casino table with 4 player slots.
 * Players spread evenly across the table with avatars underneath.
 * Draw/discard piles at center top, player area at bottom.
 */

import { useState, useCallback, useMemo, useEffect, memo } from 'react';
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

const MAX_SEATS = 4;

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

  // Build 4-slot layout: center opponents in the available seats
  const seats = useMemo(() => {
    const emptySeats = MAX_SEATS - 1; // minus 1 for "me"
    const seatArr: (typeof opponents[number] | null)[] = Array(emptySeats).fill(null);
    // Center opponents: if 1 opponent put in middle, if 2 put 0 & 2, if 3 fill all
    if (opponents.length === 1) {
      seatArr[1] = opponents[0]; // center
    } else if (opponents.length === 2) {
      seatArr[0] = opponents[0];
      seatArr[2] = opponents[1];
    } else {
      opponents.forEach((opp, i) => {
        if (i < emptySeats) seatArr[i] = opp;
      });
    }
    return seatArr;
  }, [opponents]);

  // Clear selection when the turn changes
  useEffect(() => {
    setSelectedCards(new Set());
  }, [gameState.currentTurn]);

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
        if (next.size > 0 && card.rank !== selectedRank) {
          return new Set([cardId]);
        }
        next.add(cardId);
      }
      return next;
    });
  }, [isMyTurn, myPlayer, myZone, selectedRank, onPlayCards]);

  const handlePlay = useCallback(() => {
    if (selectedCards.size === 0) return;
    onPlayCards(Array.from(selectedCards));
    setSelectedCards(new Set());
  }, [selectedCards, onPlayCards]);

  const handlePickUp = useCallback(() => {
    onPickUpPile();
    setSelectedCards(new Set());
  }, [onPickUpPile]);

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
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Upper table area: piles + opponent seats ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Center pile row */}
        <div className="shrink-0 flex items-center justify-center py-1">
          <PileArea
            pile={gameState.pile}
            drawPileCount={gameState.drawPile.length}
            burnedCount={gameState.burned.length}
          />
        </div>

        {/* Game message */}
        {gameState.lastMessage && (
          <div className="text-center px-3 shrink-0">
            <span className="inline-block px-3 py-0.5 bg-black/50 rounded-full text-[0.55rem] text-white/80 font-medium backdrop-blur-sm">
              {gameState.lastMessage}
            </span>
          </div>
        )}

        {/* Opponent seats row — evenly spaced across table */}
        <div className="flex-1 flex items-start justify-evenly px-2 pt-1 min-h-0 overflow-hidden">
          {seats.map((player, i) => (
            <div key={i} className="flex flex-col items-center" style={{ minWidth: '22%', maxWidth: '25%' }}>
              {player ? (
                <PlayerArea
                  player={player}
                  isMe={false}
                  isCurrentTurn={gameState.currentTurn === player.socketId}
                  selectedCardIds={new Set()}
                  playableZone={null}
                  compact
                />
              ) : (
                /* Empty seat placeholder */
                <div className="flex flex-col items-center gap-1 opacity-20">
                  <div className="w-8 h-8 rounded-full border border-dashed border-white/30 flex items-center justify-center">
                    <span className="text-[0.5rem] text-white/30">?</span>
                  </div>
                  <span className="text-[0.45rem] text-white/20 uppercase tracking-wider">Empty</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom area: my cards + action buttons ── */}
      {myPlayer && (
        <div className="shrink-0 max-h-[42%] overflow-hidden">
          {/* Action buttons */}
          <div className="flex items-center justify-center gap-2 py-1">
            {isMyTurn && !myPlayer.isFinished && (
              <>
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
                  Pick Up
                </button>
              </>
            )}
            {isMyTurn && !canIPlay && myZone !== 'faceDown' && myZone !== null && (
              <span className="text-[0.55rem] text-red-300 font-medium drop-shadow">No playable cards — pick up!</span>
            )}
          </div>
          {/* My player area */}
          <div className="px-2 pb-1">
            <PlayerArea
              player={myPlayer}
              isMe
              isCurrentTurn={isMyTurn}
              selectedCardIds={selectedCards}
              playableZone={isMyTurn ? myZone : null}
              onCardClick={handleCardClick}
            />
          </div>
        </div>
      )}
    </div>
  );
});
