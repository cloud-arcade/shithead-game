/**
 * Game Canvas Hook
 * Manages canvas setup, game loop, and rendering
 */

import { useRef, useEffect, useCallback, useState } from 'react';

interface UseGameCanvasOptions {
  targetFps?: number;
  onUpdate?: (deltaTime: number) => void;
  onRender?: (ctx: CanvasRenderingContext2D) => void;
  onResize?: (width: number, height: number) => void;
  isRunning?: boolean;
}

interface CanvasSize {
  width: number;
  height: number;
}

export function useGameCanvas(options: UseGameCanvasOptions = {}) {
  const {
    targetFps: _targetFps = 60,
    onUpdate,
    onRender,
    onResize,
    isRunning = true,
  } = options;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 });

  // Resize handler
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set display size
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    // Set actual size scaled for retina
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Scale context
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctxRef.current = ctx;
    }

    const newSize = { width: rect.width, height: rect.height };
    setSize(newSize);
    onResize?.(newSize.width, newSize.height);
  }, [onResize]);

  // Game loop
  const gameLoop = useCallback((currentTime: number) => {
    const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = currentTime;

    if (isRunning) {
      onUpdate?.(deltaTime);
    }

    const ctx = ctxRef.current;
    if (ctx) {
      // Clear canvas
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, size.width, size.height);
      
      onRender?.(ctx);
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isRunning, onUpdate, onRender, size]);

  // Setup and cleanup
  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  // Start/stop game loop
  useEffect(() => {
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameLoop]);

  return {
    canvasRef,
    ctx: ctxRef.current,
    width: size.width,
    height: size.height,
  };
}
