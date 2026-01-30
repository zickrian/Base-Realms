"use client";

import { useEffect, useRef, RefObject } from 'react';

export interface GameCanvasOptions {
  width: number;
  height: number;
  pixelArt?: boolean;
  onUpdate?: (ctx: CanvasRenderingContext2D, deltaTime: number) => void;
  onInit?: (ctx: CanvasRenderingContext2D) => void;
}

export function useGameCanvas(options: GameCanvasOptions): RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  const optionsRef = useRef(options);

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
    });
    if (!ctx) return;

    // Setup canvas
    canvas.width = options.width;
    canvas.height = options.height;
    ctx.imageSmoothingEnabled = !options.pixelArt;

    // Initialize
    if (options.onInit) {
      options.onInit(ctx);
    }

    // Game loop
    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      // Clear canvas
      ctx.clearRect(0, 0, options.width, options.height);

      // Update - use ref to get latest callback
      if (optionsRef.current.onUpdate) {
        optionsRef.current.onUpdate(ctx, deltaTime);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.width, options.height, options.pixelArt]);

  return canvasRef;
}

