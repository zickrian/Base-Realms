"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Game2D.module.css";

export function Game2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMovingLeft, setIsMovingLeft] = useState(false);
  const [isMovingRight, setIsMovingRight] = useState(false);
  
  const WORLD_WIDTH = 600;
  const VIEWPORT_WIDTH = 100; // Camera hanya 0-100px
  const CANVAS_WIDTH = 430;
  
  const playerRef = useRef({
    x: 0,
    y: 0,
    width: 30,
    height: 39,
    velocityX: 0,
    facingRight: true,
  });

  const [animationFrame, setAnimationFrame] = useState(0);
  const animationTimerRef = useRef<number>(0);
  const cameraRef = useRef({ x: 0 });
  const canvasHeightRef = useRef(600);

  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const grassImageRef = useRef<HTMLImageElement | null>(null);
  const avatarIdleRef = useRef<HTMLImageElement | null>(null);
  const avatarRun1Ref = useRef<HTMLImageElement | null>(null);
  const avatarRun2Ref = useRef<HTMLImageElement | null>(null);
  const avatarRun3Ref = useRef<HTMLImageElement | null>(null);

  // Load images
  useEffect(() => {
    const bgImg = new Image();
    bgImg.src = "/ingame/bg.svg";
    bgImg.onload = () => bgImageRef.current = bgImg;

    const grassImg = new Image();
    grassImg.src = "/ingame/grass.svg";
    grassImg.onload = () => grassImageRef.current = grassImg;

    const avatarIdle = new Image();
    avatarIdle.src = "/char/avatar1.svg";
    avatarIdle.onload = () => avatarIdleRef.current = avatarIdle;

    const avatarRun1 = new Image();
    avatarRun1.src = "/char/avatar2.svg";
    avatarRun1.onload = () => avatarRun1Ref.current = avatarRun1;

    const avatarRun2 = new Image();
    avatarRun2.src = "/char/avatar3.svg";
    avatarRun2.onload = () => avatarRun2Ref.current = avatarRun2;

    const avatarRun3 = new Image();
    avatarRun3.src = "/char/avatar4.svg";
    avatarRun3.onload = () => avatarRun3Ref.current = avatarRun3;
  }, []);

  // Handle click/touch
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clickX = clientX - rect.left;
      const halfWidth = rect.width / 2;

      if (clickX < halfWidth) {
        setIsMovingLeft(true);
        setIsMovingRight(false);
      } else {
        setIsMovingRight(true);
        setIsMovingLeft(false);
      }
    };

    const handlePointerUp = () => {
      setIsMovingLeft(false);
      setIsMovingRight(false);
    };

    const handleMouseDown = (e: MouseEvent) => handlePointerDown(e);
    const handleTouchStart = (e: TouchEvent) => handlePointerDown(e);

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handlePointerUp);
    canvas.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handlePointerUp);
    window.addEventListener("touchcancel", handlePointerUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handlePointerUp);
      canvas.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handlePointerUp);
      window.removeEventListener("touchcancel", handlePointerUp);
    };
  }, []);

  // Animation loop
  useEffect(() => {
    const isMoving = isMovingLeft || isMovingRight;

    const animate = () => {
      if (isMoving) {
        setAnimationFrame((prev) => {
          const next = prev + 1;
          return next > 3 ? 1 : next;
        });
      } else {
        setAnimationFrame(0);
      }
    };

    if (isMoving) {
      animationTimerRef.current = window.setInterval(animate, 150);
    } else {
      clearInterval(animationTimerRef.current);
      setAnimationFrame(0);
    }

    return () => {
      clearInterval(animationTimerRef.current);
    };
  }, [isMovingLeft, isMovingRight]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const updateCanvasHeight = () => {
      const container = canvas.parentElement;
      if (container) {
        const containerHeight = container.clientHeight;
        canvas.height = containerHeight;
        canvasHeightRef.current = containerHeight;
      }
    };

    updateCanvasHeight();
    
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasHeight();
    });
    
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    
    window.addEventListener('resize', updateCanvasHeight);

    const gameLoop = () => {
      const player = playerRef.current;
      const canvasHeight = canvasHeightRef.current;

      // Movement
      player.velocityX = 0;
      if (isMovingLeft) {
        player.velocityX = -3;
        player.facingRight = false;
      } else if (isMovingRight) {
        player.velocityX = 3;
        player.facingRight = true;
      }

      player.x += player.velocityX;

      // Boundary checks
      if (player.x < 0) {
        player.x = 0;
        player.velocityX = 0;
      }
      if (player.x > WORLD_WIDTH) {
        player.x = WORLD_WIDTH;
        player.velocityX = 0;
      }

      // Camera follow player (0-100px range)
      const targetCameraX = Math.max(0, Math.min(player.x, VIEWPORT_WIDTH));
      cameraRef.current.x += (targetCameraX - cameraRef.current.x) * 0.1;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cameraX = cameraRef.current.x;
      const scale = CANVAS_WIDTH / VIEWPORT_WIDTH; // 430 / 100 = 4.3

      // Calculate grass position (stick to bottom)
      const grassDisplayHeight = (100 / WORLD_WIDTH) * CANVAS_WIDTH;
      const grassY = canvasHeight - grassDisplayHeight;

      // Draw background - hanya 0-100px dari world
      if (bgImageRef.current) {
        const bgDisplayHeight = CANVAS_WIDTH; // 1:1 ratio
        ctx.drawImage(
          bgImageRef.current,
          cameraX, // Source X: mulai dari cameraX di world
          0, // Source Y
          VIEWPORT_WIDTH, // Source width: 100px
          600, // Source height: full height
          0, // Destination X
          0, // Destination Y
          CANVAS_WIDTH, // Display width: 430px
          bgDisplayHeight // Display height
        );
      } else {
        ctx.fillStyle = "#49b0f2";
        ctx.fillRect(0, 0, canvas.width, canvasHeight - grassDisplayHeight);
      }

      // Draw grass - hanya 0-100px dari world, stick to bottom
      if (grassImageRef.current) {
        ctx.drawImage(
          grassImageRef.current,
          cameraX, // Source X: mulai dari cameraX di world
          0, // Source Y
          VIEWPORT_WIDTH, // Source width: 100px
          100, // Source height: full height
          0, // Destination X
          grassY, // Destination Y: stick to bottom
          CANVAS_WIDTH, // Display width: 430px
          grassDisplayHeight // Display height
        );
      } else {
        ctx.fillStyle = "#2eb534";
        ctx.fillRect(0, grassY, canvas.width, grassDisplayHeight);
      }

      // Draw player - stick to grass
      const playerScreenX = (player.x - cameraX) * scale;
      const playerDisplayWidth = player.width * scale;
      const playerDisplayHeight = player.height * scale;
      const playerY = grassY - playerDisplayHeight; // Stick to grass (on top)

      let currentAvatar: HTMLImageElement | null = null;
      if (animationFrame === 0) {
        currentAvatar = avatarIdleRef.current;
      } else if (animationFrame === 1) {
        currentAvatar = avatarRun1Ref.current;
      } else if (animationFrame === 2) {
        currentAvatar = avatarRun2Ref.current;
      } else if (animationFrame === 3) {
        currentAvatar = avatarRun3Ref.current;
      }

      if (currentAvatar) {
        ctx.save();
        if (!player.facingRight) {
          ctx.translate(playerScreenX + playerDisplayWidth, playerY);
          ctx.scale(-1, 1);
          ctx.drawImage(
            currentAvatar,
            0,
            0,
            currentAvatar.width || 30,
            currentAvatar.height || 39,
            0,
            0,
            playerDisplayWidth,
            playerDisplayHeight
          );
        } else {
          ctx.drawImage(
            currentAvatar,
            0,
            0,
            currentAvatar.width || 30,
            currentAvatar.height || 39,
            playerScreenX,
            playerY,
            playerDisplayWidth,
            playerDisplayHeight
          );
        }
        ctx.restore();
      } else {
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(playerScreenX, playerY, playerDisplayWidth, playerDisplayHeight);
      }

      requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      window.removeEventListener('resize', updateCanvasHeight);
      resizeObserver.disconnect();
    };
  }, [isMovingLeft, isMovingRight, animationFrame]);

  return (
    <div className={styles.gameContainer}>
      <canvas
        ref={canvasRef}
        className={styles.gameCanvas}
        width={CANVAS_WIDTH}
        height={600}
      />
    </div>
  );
}
