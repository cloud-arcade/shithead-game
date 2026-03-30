/**
 * Input Hook
 * Handles keyboard, mouse, and touch input
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface Position {
  x: number;
  y: number;
}

interface InputState {
  keysDown: Set<string>;
  keysPressed: Set<string>;
  mousePosition: Position;
  mouseDown: boolean;
  isTouching: boolean;
  touchPositions: Position[];
}

export function useInput(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const inputRef = useRef<InputState>({
    keysDown: new Set(),
    keysPressed: new Set(),
    mousePosition: { x: 0, y: 0 },
    mouseDown: false,
    isTouching: false,
    touchPositions: [],
  });

  const [, forceUpdate] = useState({});

  // Clear pressed keys at end of frame
  const clearPressed = useCallback(() => {
    inputRef.current.keysPressed.clear();
  }, []);

  // Key helpers
  const isKeyDown = useCallback((key: string) => {
    return inputRef.current.keysDown.has(key);
  }, []);

  const isKeyPressed = useCallback((key: string) => {
    return inputRef.current.keysPressed.has(key);
  }, []);

  const getMousePosition = useCallback(() => {
    return { ...inputRef.current.mousePosition };
  }, []);

  const isMouseDown = useCallback(() => {
    return inputRef.current.mouseDown;
  }, []);

  const isTouching = useCallback(() => {
    return inputRef.current.isTouching;
  }, []);

  const getTouchPositions = useCallback(() => {
    return [...inputRef.current.touchPositions];
  }, []);

  // Setup event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!inputRef.current.keysDown.has(e.code)) {
        inputRef.current.keysPressed.add(e.code);
      }
      inputRef.current.keysDown.add(e.code);
      
      // Prevent default for game keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      forceUpdate({});
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      inputRef.current.keysDown.delete(e.code);
      forceUpdate({});
    };

    const updateMousePosition = (e: MouseEvent | Touch) => {
      const rect = canvas.getBoundingClientRect();
      inputRef.current.mousePosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseDown = (e: MouseEvent) => {
      inputRef.current.mouseDown = true;
      updateMousePosition(e);
      forceUpdate({});
    };

    const handleMouseUp = () => {
      inputRef.current.mouseDown = false;
      forceUpdate({});
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateMousePosition(e);
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      inputRef.current.isTouching = true;
      inputRef.current.mouseDown = true;
      const rect = canvas.getBoundingClientRect();
      inputRef.current.touchPositions = Array.from(e.touches).map(t => ({
        x: t.clientX - rect.left,
        y: t.clientY - rect.top,
      }));
      if (e.touches[0]) {
        inputRef.current.mousePosition = inputRef.current.touchPositions[0];
      }
      forceUpdate({});
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      inputRef.current.touchPositions = Array.from(e.touches).map(t => ({
        x: t.clientX - rect.left,
        y: t.clientY - rect.top,
      }));
      if (e.touches.length === 0) {
        inputRef.current.isTouching = false;
        inputRef.current.mouseDown = false;
      }
      forceUpdate({});
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      inputRef.current.touchPositions = Array.from(e.touches).map(t => ({
        x: t.clientX - rect.left,
        y: t.clientY - rect.top,
      }));
      if (e.touches[0]) {
        inputRef.current.mousePosition = inputRef.current.touchPositions[0];
      }
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    // Add listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [canvasRef]);

  return {
    isKeyDown,
    isKeyPressed,
    getMousePosition,
    isMouseDown,
    isTouching,
    getTouchPositions,
    clearPressed,
  };
}
