/**
 * Game Configuration
 * Advanced settings untuk fine-tuning performa di berbagai device
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

interface BatteryManagerLike {
  level: number;
  charging: boolean;
  addEventListener: (type: 'levelchange' | 'chargingchange', listener: () => void) => void;
}

type DeviceConfig = typeof DEVICE_CONFIGS[keyof typeof DEVICE_CONFIGS];
type CanvasPreset = typeof CANVAS_PRESETS[keyof typeof CANVAS_PRESETS];
type NetworkPreset = typeof NETWORK_PRESETS[keyof typeof NETWORK_PRESETS];

export type GameConfigState = {
  PLAYER_SPEED: number;
  ANIMATION_SPEED: number;
  TARGET_FPS: number;
  DPR_CAP: number;
  USE_ASYNC_RENDERING: boolean;
  ENABLE_PERFORMANCE_MONITORING: boolean;
  CANVAS_PRESET: CanvasPreset;
  DEVICE_INFO: {
    isMobile: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    deviceMemory: number;
    hardwareConcurrency: number;
    effectiveType: EffectiveConnectionType;
  };
  batteryOptimizationMode?: 'aggressive' | 'balanced' | 'performance';
};

declare global {
  interface Window {
    __GAME_CONFIG__?: GameConfigState;
  }
}

/**
 * Device-specific configurations
 */
export const DEVICE_CONFIGS = {
  // Desktop - High performa
  desktop: {
    PLAYER_SPEED: 150,
    ANIMATION_SPEED: 150,
    TARGET_FPS: 60,
    DPR_CAP: 2,
    USE_ASYNC_RENDERING: true,
    ENABLE_PERFORMANCE_MONITORING: false,
  },

  // Mobile High-end (iPhone 14 Pro, Pixel 7+, etc)
  mobileHighEnd: {
    PLAYER_SPEED: 150,
    ANIMATION_SPEED: 150,
    TARGET_FPS: 60,
    DPR_CAP: 2,
    USE_ASYNC_RENDERING: true,
    ENABLE_PERFORMANCE_MONITORING: false,
  },

  // Mobile Mid-range (iPhone 12, Pixel 5, Samsung A50, etc)
  mobileMidRange: {
    PLAYER_SPEED: 150,
    ANIMATION_SPEED: 175, // Sedikit lebih lambat
    TARGET_FPS: 60,
    DPR_CAP: 1.5,
    USE_ASYNC_RENDERING: true,
    ENABLE_PERFORMANCE_MONITORING: true,
  },

  // Mobile Low-end (iPhone 8, Pixel 4a, Samsung A10, etc)
  mobileLowEnd: {
    PLAYER_SPEED: 120, // Lebih lambat untuk hemat CPU
    ANIMATION_SPEED: 200, // Lebih lambat animasi
    TARGET_FPS: 30, // Target 30 FPS
    DPR_CAP: 1,
    USE_ASYNC_RENDERING: false, // Disable async untuk consistency
    ENABLE_PERFORMANCE_MONITORING: true,
  },

  // Tablet
  tablet: {
    PLAYER_SPEED: 150,
    ANIMATION_SPEED: 150,
    TARGET_FPS: 60,
    DPR_CAP: 1.5,
    USE_ASYNC_RENDERING: true,
    ENABLE_PERFORMANCE_MONITORING: false,
  },
};

/**
 * Canvas optimization presets
 */
export const CANVAS_PRESETS = {
  // Maximum quality
  ultra: {
    imageSmoothingEnabled: true,
    imageSmoothing: true,
    globalCompositeOperation: 'source-over' as const,
    lineCap: 'round' as const,
  },

  // Balanced (default)
  balanced: {
    imageSmoothingEnabled: false,
    imageSmoothing: false,
    globalCompositeOperation: 'source-over' as const,
    lineCap: 'butt' as const,
  },

  // Performance (for low-end)
  performance: {
    imageSmoothingEnabled: false,
    imageSmoothing: false,
    globalCompositeOperation: 'copy' as const,
    lineCap: 'butt' as const,
  },
};

/**
 * Network optimization
 */
export const NETWORK_PRESETS = {
  offline: {
    useLocalCache: true,
    enableResourceHints: false,
  },
  
  slow2g: {
    imageQuality: 'low',
    useWebP: true,
    enableCompression: true,
  },
  
  '2g': {
    imageQuality: 'low',
    useWebP: true,
    enableCompression: true,
  },
  
  '3g': {
    imageQuality: 'medium',
    useWebP: true,
    enableCompression: true,
  },
  
  '4g': {
    imageQuality: 'high',
    useWebP: false,
    enableCompression: false,
  },
};

/**
 * Detect best configuration untuk device
 */
export const detectOptimalConfig = () => {
  // Deteksi device type
  const ua = navigator.userAgent;
  const isMobile = /android|iphone|ipad|ipod|windows phone/i.test(ua);
  const isIOS = /iphone|ipad|ipot/i.test(ua);
  const isAndroid = /android/i.test(ua);

  // Deteksi device capabilities
  const navigatorWithMemory = navigator as Navigator & NavigatorConnectionLike;
  const deviceMemory = navigatorWithMemory.deviceMemory || 4;
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  
  // Deteksi network
  const connection = navigatorWithMemory.connection ||
                    navigatorWithMemory.mozConnection ||
                    navigatorWithMemory.webkitConnection;
  const effectiveType = connection?.effectiveType || '4g';

  // Select config based on specs
  let deviceConfig: DeviceConfig = DEVICE_CONFIGS.desktop;
  let canvasPreset: CanvasPreset = CANVAS_PRESETS.balanced;
  const networkPreset: NetworkPreset = NETWORK_PRESETS[effectiveType as keyof typeof NETWORK_PRESETS] || NETWORK_PRESETS['4g'];

  if (isMobile) {
    if (deviceMemory >= 8 && hardwareConcurrency >= 6) {
      deviceConfig = DEVICE_CONFIGS.mobileHighEnd;
      canvasPreset = CANVAS_PRESETS.ultra;
    } else if (deviceMemory >= 4 && hardwareConcurrency >= 4) {
      deviceConfig = DEVICE_CONFIGS.mobileMidRange;
      canvasPreset = CANVAS_PRESETS.balanced;
    } else {
      deviceConfig = DEVICE_CONFIGS.mobileLowEnd;
      canvasPreset = CANVAS_PRESETS.performance;
    }
  }

  return {
    deviceConfig,
    canvasPreset,
    networkPreset,
    deviceInfo: {
      isMobile,
      isIOS,
      isAndroid,
      deviceMemory,
      hardwareConcurrency,
      effectiveType,
    },
  };
};

/**
 * Apply configuration ke game
 */
export const applyGameConfig = (config: ReturnType<typeof detectOptimalConfig>) => {
  const { deviceConfig, canvasPreset, deviceInfo } = config;

  // Store dalam window object untuk access di game component
  window.__GAME_CONFIG__ = {
    PLAYER_SPEED: deviceConfig.PLAYER_SPEED,
    ANIMATION_SPEED: deviceConfig.ANIMATION_SPEED,
    TARGET_FPS: deviceConfig.TARGET_FPS,
    DPR_CAP: deviceConfig.DPR_CAP,
    USE_ASYNC_RENDERING: deviceConfig.USE_ASYNC_RENDERING,
    ENABLE_PERFORMANCE_MONITORING: deviceConfig.ENABLE_PERFORMANCE_MONITORING,
    CANVAS_PRESET: canvasPreset,
    DEVICE_INFO: deviceInfo,
  };

  // Log di development
  if (process.env.NODE_ENV === 'development') {
    console.group('🎮 Game Configuration Applied');
    console.log('Device Config:', deviceConfig);
    console.log('Canvas Preset:', canvasPreset);
    console.log('Device Info:', deviceInfo);
    console.groupEnd();
  }
};

/**
 * Get current game config
 */
export const getGameConfig = () => {
  return window.__GAME_CONFIG__ || detectOptimalConfig();
};

/**
 * Update specific config parameter
 */
export const updateGameConfig = <K extends keyof GameConfigState>(key: K, value: GameConfigState[K]) => {
  if (!window.__GAME_CONFIG__) {
    const config = detectOptimalConfig();
    applyGameConfig(config);
  }
  
  if (window.__GAME_CONFIG__) {
    window.__GAME_CONFIG__[key] = value;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`Updated config: ${key} = ${value}`);
  }
};

/**
 * Performance throttle settings
 */
export const THROTTLE_SETTINGS = {
  // Resize event throttle
  resizeThrottle: 100, // ms

  // Touch move throttle
  touchMoveThrottle: 16, // ms (60 FPS)

  // Stats update throttle
  statsUpdateThrottle: 1000, // ms

  // Network retry delay
  networkRetryDelay: 1000, // ms
};

/**
 * Animation frame budgets (dalam ms)
 */
export const FRAME_BUDGETS = {
  physics: 2,
  input: 1,
  rendering: 10,
  misc: 2.67,
};

/**
 * Memory limits (dalam MB)
 */
export const MEMORY_LIMITS = {
  desktop: 200,
  tablet: 100,
  mobileHighEnd: 80,
  mobileMidRange: 50,
  mobileLowEnd: 30,
};

/**
 * Battery optimization levels
 */
export const BATTERY_OPTIMIZATION = {
  // Aggressive - save battery, lower visual quality
  aggressive: {
    PLAYER_SPEED: 100,
    ANIMATION_SPEED: 250,
    TARGET_FPS: 24,
    DPR_CAP: 1,
    USE_ASYNC_RENDERING: false,
  },

  // Balanced - good balance between quality and battery
  balanced: {
    PLAYER_SPEED: 130,
    ANIMATION_SPEED: 200,
    TARGET_FPS: 30,
    DPR_CAP: 1.25,
    USE_ASYNC_RENDERING: false,
  },

  // Performance - prioritize visuals
  performance: {
    PLAYER_SPEED: 150,
    ANIMATION_SPEED: 150,
    TARGET_FPS: 60,
    DPR_CAP: 2,
    USE_ASYNC_RENDERING: true,
  },
};

type BatteryOptimizationMode = keyof typeof BATTERY_OPTIMIZATION;
type BatteryOptimizationConfig = typeof BATTERY_OPTIMIZATION[BatteryOptimizationMode];

/**
 * Enable/disable battery optimization mode
 */
export const setBatteryOptimizationMode = (mode: BatteryOptimizationMode) => {
  const config: BatteryOptimizationConfig = BATTERY_OPTIMIZATION[mode];
  updateGameConfig('batteryOptimizationMode', mode);
  
  // Apply settings
  (Object.entries(config) as Array<[keyof BatteryOptimizationConfig, BatteryOptimizationConfig[keyof BatteryOptimizationConfig]]>).forEach(([key, value]) => {
    updateGameConfig(key as keyof GameConfigState, value as GameConfigState[keyof GameConfigState]);
  });
};

/**
 * Check if device is in low power mode
 */
export const isDeviceInLowPowerMode = (): Promise<boolean> => {
  if ('getBattery' in navigator && typeof navigator.getBattery === 'function') {
    return navigator.getBattery().then((battery: BatteryManagerLike) => {
      return battery.level <= 0.2 && battery.charging === false;
    });
  }
  return Promise.resolve(false);
};

/**
 * Initialize game configuration on app start
 */
export const initializeGameConfig = () => {
  const config = detectOptimalConfig();
  applyGameConfig(config);
  
  // Monitor battery dan adjust jika perlu
  if ('getBattery' in navigator && typeof navigator.getBattery === 'function') {
    navigator.getBattery().then((battery: BatteryManagerLike) => {
      battery.addEventListener('levelchange', () => {
        if (battery.level <= 0.2 && !battery.charging) {
          setBatteryOptimizationMode('aggressive');
        } else if (battery.level >= 0.5 && battery.charging) {
          setBatteryOptimizationMode('performance');
        }
      });
    });
  }
};

const gameConfigApi = {
  DEVICE_CONFIGS,
  CANVAS_PRESETS,
  NETWORK_PRESETS,
  THROTTLE_SETTINGS,
  FRAME_BUDGETS,
  MEMORY_LIMITS,
  BATTERY_OPTIMIZATION,
  detectOptimalConfig,
  applyGameConfig,
  getGameConfig,
  updateGameConfig,
  setBatteryOptimizationMode,
  isDeviceInLowPowerMode,
  initializeGameConfig,
};

export default gameConfigApi;
