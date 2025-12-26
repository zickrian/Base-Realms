export interface Sprite {
  image: HTMLImageElement;
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  alpha?: number;
}

export function drawSprite(ctx: CanvasRenderingContext2D, sprite: Sprite): void {
  ctx.save();
  
  ctx.globalAlpha = sprite.alpha ?? 1;
  ctx.translate(sprite.x, sprite.y);
  
  if (sprite.rotation) {
    ctx.rotate(sprite.rotation);
  }
  
  const scale = sprite.scale ?? 1;
  const img = sprite.image;
  ctx.drawImage(
    img,
    -img.width / 2 * scale,
    -img.height / 2 * scale,
    img.width * scale,
    img.height * scale
  );
  
  ctx.restore();
}

