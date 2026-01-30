export class GameAssets {
  private static cache = new Map<string, HTMLImageElement>();

  static async loadImage(src: string): Promise<HTMLImageElement> {
    if (this.cache.has(src)) {
      return this.cache.get(src)!;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(src, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  static async loadImages(sources: string[]): Promise<Map<string, HTMLImageElement>> {
    const images = await Promise.all(
      sources.map(src => this.loadImage(src).then(img => [src, img] as const))
    );
    return new Map(images);
  }

  static getCachedImage(src: string): HTMLImageElement | null {
    return this.cache.get(src) || null;
  }

  static clearCache(): void {
    this.cache.clear();
  }
}

