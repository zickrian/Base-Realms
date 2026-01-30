/**
 * Game Optimization Utilities
 * Cross-device performance optimization and monitoring
 */

type EffectiveConnectionType = 'slow-2g' | '2g' | '3g' | '4g';

interface NetworkInformationLike {
  effectiveType?: EffectiveConnectionType;
}

interface NavigatorConnectionLike {
  deviceMemory?: number;
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
}

/**
 * Deteksi kemampuan device dan dapatkan recommended settings
 */
export const getDeviceProfile = () => {
  const ua = navigator.userAgent;
  const isMobile = /android|iphone|ipad|ipod|windows phone/i.test(ua);
  const isTablet = /ipad|android(?!.*mobile)/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  
  // Deteksi GPU capabilities
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
  const hasWebGL = !!gl;
  const hasWebGL2 = !!canvas.getContext('webgl2');
  
  // Deteksi RAM dan CPU cores (approximate)
  const navigatorWithMemory = navigator as Navigator & NavigatorConnectionLike;
  const deviceMemory = navigatorWithMemory.deviceMemory || 4;
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  
  // Deteksi network speed
  const connection = navigatorWithMemory.connection || 
                    navigatorWithMemory.mozConnection || 
                    navigatorWithMemory.webkitConnection;
  const effectiveType = connection?.effectiveType || '4g';
  
  return {
    isMobile,
    isTablet,
    isIOS,
    isAndroid,
    deviceMemory,
    hardwareConcurrency,
    hasWebGL,
    hasWebGL2,
    effectiveType,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
  };
};

/**
 * Get recommended render settings based on device profile
 */
export const getOptimalSettings = () => {
  const profile = getDeviceProfile();
  
  // Base settings
  const maxFrameSkip = 0;
  let targetFPS = 60;
  let enableAsyncRendering = true;
  let scaleDPRCap = 2;
  
  // Adjust for low-end devices
  if (profile.deviceMemory <= 2 || profile.hardwareConcurrency <= 2) {
    targetFPS = 30;
    enableAsyncRendering = false;
    scaleDPRCap = 1;
  } else if (profile.deviceMemory <= 4) {
    targetFPS = 60;
    scaleDPRCap = 1.5;
  }
  
  // Network-based throttling
  if (profile.effectiveType === 'slow-2g' || profile.effectiveType === '2g') {
    enableAsyncRendering = false;
  }
  
  return {
    targetFPS,
    maxFrameSkip,
    enableAsyncRendering,
    scaleDPRCap,
    useWebGL2: profile.hasWebGL2,
  };
};

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private frameCount = 0;
  private fps = 60;
  private lastTime = performance.now();
  private frameTimeBuffer: number[] = [];
  private maxBufferSize = 60; // 1 second at 60fps

  updateFrame(currentTime: number) {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.frameCount++;

    this.frameTimeBuffer.push(deltaTime);
    if (this.frameTimeBuffer.length > this.maxBufferSize) {
      this.frameTimeBuffer.shift();
    }

    // Calculate FPS every 10 frames
    if (this.frameCount % 10 === 0) {
      const avgFrameTime = this.frameTimeBuffer.reduce((a, b) => a + b, 0) / this.frameTimeBuffer.length;
      this.fps = Math.round(1000 / avgFrameTime);
    }
  }

  getFPS() {
    return this.fps;
  }

  getAverageFrameTime() {
    if (this.frameTimeBuffer.length === 0) return 0;
    return this.frameTimeBuffer.reduce((a, b) => a + b, 0) / this.frameTimeBuffer.length;
  }

  isPerformanceDropping() {
    return this.fps < 50; // Alert jika FPS di bawah 50
  }

  getStats() {
    return {
      fps: this.fps,
      averageFrameTime: this.getAverageFrameTime(),
      frameCount: this.frameCount,
      isDropping: this.isPerformanceDropping(),
    };
  }

  reset() {
    this.frameCount = 0;
    this.frameTimeBuffer = [];
    this.lastTime = performance.now();
  }
}

/**
 * Optimize image loading untuk berbagai network speeds
 */
export const getOptimalImageFormat = () => {
  const navigatorWithMemory = navigator as Navigator & NavigatorConnectionLike;
  const connection = navigatorWithMemory.connection || 
                    navigatorWithMemory.mozConnection || 
                    navigatorWithMemory.webkitConnection;
  
  if (!connection) return 'png'; // Default
  
  const effectiveType = connection.effectiveType;
  
  // Return format based on network speed
  switch (effectiveType) {
    case 'slow-2g':
    case '2g':
    case '3g':
      return 'webp'; // Smaller file size
    default:
      return 'png'; // Better quality
  }
};

/**
 * Request animation frame with fallback
 */
export const requestFrame = (callback: (time: number) => void): number => {
  if (typeof requestAnimationFrame !== 'undefined') {
    return requestAnimationFrame(callback);
  }
  
  // Fallback untuk browser lama
  return window.setTimeout(() => {
    callback(performance.now());
  }, 1000 / 60);
};

/**
 * Cancel animation frame with fallback
 */
export const cancelFrame = (id: number): void => {
  if (typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(id);
  } else {
    window.clearTimeout(id);
  }
};

/**
 * Throttle function untuk prevent excessive updates
 */
export const throttle = <T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Detect if device supports hover (mouse-based devices)
 */
export const supportsHover = (): boolean => {
  const mediaQuery = window.matchMedia('(hover: hover)');
  return mediaQuery.matches;
};

/**
 * Get safe canvas dimensions untuk avoid memory issues
 */
export const getSafeCanvasDimensions = (maxWidth: number, maxHeight: number) => {
  const profile = getDeviceProfile();
  
  // Cap berdasarkan device memory
  let width = maxWidth;
  let height = maxHeight;
  
  if (profile.deviceMemory <= 2) {
    width = Math.min(width, 256);
    height = Math.min(height, 256);
  } else if (profile.deviceMemory <= 4) {
    width = Math.min(width, 512);
    height = Math.min(height, 512);
  }
  
  return { width, height };
};
