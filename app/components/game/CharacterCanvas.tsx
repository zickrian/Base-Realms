"use client";

import { useEffect, useRef, useState } from "react";

interface CharacterProps {
    isMoving: boolean;
    direction: 'left' | 'right';
}

export const CharacterCanvas = ({ isMoving, direction }: CharacterProps) => {
    const frameRef = useRef(0);
    const lastUpdateRef = useRef(0);
    const [currentFrame, setCurrentFrame] = useState(0);

    // Constants - Proportional to grass: 3.6px per unit
    // Avatar viewBox: 30 x 39 unit
    // Width: 30 * 3.6 = 108px, Height: 39 * 3.6 = 140.4px ≈ 140px
    const ANIMATION_SPEED = 150; // ms per frame

    // Frame files
    const frameFiles = [
        '/avatar/avatar1.svg', // Idle
        '/avatar/avatar2.svg', // Walk 1
        '/avatar/avatar3.svg', // Walk 2
        '/avatar/avatar4.svg', // Walk 3
    ];

    // Animation Loop - Update frame state
    useEffect(() => {
        if (!isMoving) {
            setCurrentFrame(0); // Idle
            return;
        }

        let animationFrameId: number;
        const animate = (timestamp: number) => {
            if (timestamp - lastUpdateRef.current > ANIMATION_SPEED) {
                // Cycle frames 1, 2, 3 (walking)
                frameRef.current = frameRef.current < 1 ? 1 : frameRef.current + 1;
                if (frameRef.current > 3) frameRef.current = 1;
                setCurrentFrame(frameRef.current);
                lastUpdateRef.current = timestamp;
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isMoving]);

    // Get current frame source
    const currentSrc = frameFiles[currentFrame];

    return (
        <img
            src={currentSrc}
            alt="Character"
            style={{
                imageRendering: '-moz-crisp-edges',
                imageRendering: 'crisp-edges',
                imageRendering: 'pixelated',
                width: '108px',
                height: '140px',
                display: 'block',
                margin: 0,
                padding: 0,
                verticalAlign: 'bottom',
                transform: direction === 'left' ? 'scaleX(-1)' : 'none',
                transformOrigin: 'center',
            } as React.CSSProperties}
        />
    );
};
