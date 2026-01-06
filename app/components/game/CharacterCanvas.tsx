"use client";

import { useEffect, useRef, useState } from "react";
import { getGameIconUrl } from "../../utils/supabaseStorage";

interface CharacterProps {
    isMoving: boolean;
    direction: 'left' | 'right';
}

export const CharacterCanvas = ({ isMoving, direction }: CharacterProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [sprite, setSprite] = useState<HTMLCanvasElement | null>(null);
    const frameRef = useRef(0);
    const lastUpdateRef = useRef(0);

    // Constants based on normalized sprite sheet
    // We stretch the 79x39 SVG to 80x40 to have clean 20x40 frames
    const FRAME_WIDTH = 20;
    const FRAME_HEIGHT = 40;
    const ANIMATION_SPEED = 150; // ms per frame

    // Prepare Sprite Sheet (Buffer)
    useEffect(() => {
        const img = new Image();
        img.src = '/Assets/avatar.svg';
        img.onload = () => {
            // Create an offscreen canvas to normalize the sprite size
            const offscreen = document.createElement('canvas');
            offscreen.width = 80;  // 4 frames * 20px = 80px
            offscreen.height = 40; // 1 row * 40px
            const ctx = offscreen.getContext('2d');
            if (ctx) {
                ctx.imageSmoothingEnabled = false;
                // Draw the SVG stretched slightly to fill 80x40 exactly
                // This fixes the 79px vs 80px issue and ensures clean integer slicing
                ctx.drawImage(img, 0, 0, 80, 40);
                setSprite(offscreen);
            }
        };
    }, []);

    // Animation Loop
    useEffect(() => {
        if (!sprite || !canvasRef.current) return;

        let animationFrameId: number;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Ensure pixel art rendering on the display canvas
        ctx.imageSmoothingEnabled = false;

        // Render Function
        const render = (timestamp: number) => {
            // Update Frame Logic
            if (isMoving) {
                if (timestamp - lastUpdateRef.current > ANIMATION_SPEED) {
                    // Cycle frames 1, 2, 3 (walking)
                    // Sequence: 1 -> 2 -> 3 -> 1
                    frameRef.current = frameRef.current < 1 ? 1 : frameRef.current + 1;
                    if (frameRef.current > 3) frameRef.current = 1;
                    lastUpdateRef.current = timestamp;
                }
            } else {
                // Idle: Frame 0
                frameRef.current = 0;
            }

            // Clear Canvas
            ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);

            // Draw
            ctx.save();

            // Handle Direction Flip
            if (direction === 'left') {
                // Flip horizontally: move origin to right edge, scale x by -1
                ctx.translate(FRAME_WIDTH, 0);
                ctx.scale(-1, 1);
            }

            // Draw specific frame from the normalized sprite buffer
            // Since we normalized to 80 width, frames are exactly 0, 20, 40, 60
            const srcX = frameRef.current * FRAME_WIDTH;

            ctx.drawImage(
                sprite,
                srcX, 0, FRAME_WIDTH, FRAME_HEIGHT, // Source from buffer
                0, 0, FRAME_WIDTH, FRAME_HEIGHT     // Draw to canvas
            );

            ctx.restore();

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);

        return () => cancelAnimationFrame(animationFrameId);
    }, [sprite, isMoving, direction]);

    return (
        <canvas
            ref={canvasRef}
            width={FRAME_WIDTH}
            height={FRAME_HEIGHT}
            style={{
                imageRendering: 'pixelated', // Important for crisp pixel art
                width: '40px', // Display size (2x scale)
                height: '80px', // Display size (2x scale)
            }}
        />
    );
};
