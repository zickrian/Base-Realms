"use client";

import { create } from 'zustand';
import { getStorageUrl } from '../utils/supabaseStorage';
import { supabase } from '../lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Types
export interface Quest {
  id: string;
  title: string;
  description: string;
  currentProgress: number;
  maxProgress: number;
  reward: string;
  status: 'active' | 'completed' | 'claimed';
  questType: string;
}

export interface PlayerProfile {
  userId?: string; // For realtime subscription
  level: number;
  currentXp: number;
  maxXp: number;
  xpPercentage: number;
  totalBattles: number;
  wins: number;
  losses: number;
  stage?: {
    id: string;
    name: string;
    stageNumber: number;
  };
  selectedCardId?: string | null;
  selectedCard?: {
    id: string;
    name: string;
    rarity: string;
    image_url: string | null;
    atk: number;
    health: number;
    token_id: number | null; // NFT token ID for CharForBattle image mapping
    used?: boolean; // Battle usage status (one-time use)
  } | null;
}

export interface UserSettings {
  soundVolume: number;
  notificationsEnabled: boolean;
}

export interface CardPack {
  id: string;
  name: string;
  rarity: string;
  priceIdrx: number;
  priceEth: number;
  imageUrl: string;
  description: string;
  isActive: boolean;
}

export interface InventoryCard {
  id: string;
  cardTemplate: {
    id: string;
    name: string;
    rarity: string;
    imageUrl: string;
    description: string | null;
    atk?: number;
    health?: number;
    token_id?: number | null;
  };
  quantity: number;
  used?: boolean; // Battle usage status
  token_id?: number | null; // NFT token ID
}

interface GameState {
  // Data
  profile: PlayerProfile | null;
  quests: Quest[];
  settings: UserSettings | null;
  cardPacks: CardPack[];
  inventory: InventoryCard[];
  dailyPackCount: number;
  currentStage: {
    id: string;
    name: string;
    stageNumber: number;
  } | null;
  
  // Loading states
  isInitialized: boolean;
  isLoading: boolean;
  profileLoading: boolean;
  questsLoading: boolean;
  settingsLoading: boolean;
  packsLoading: boolean;
  inventoryLoading: boolean;
  isSyncing: boolean;
  
  // Error states
  error: string | null;
  
  // Internal - AbortController for cleanup
  _abortController: AbortController | null;
  
  // Internal - Realtime subscription
  _realtimeChannel: RealtimeChannel | null;
  _userId: string | null;
  _walletAddress: string | null;
  _realtimeRetryCount: number;
  
  // Actions
  initializeGameData: (walletAddress: string) => Promise<void>;
  refreshProfile: (walletAddress: string) => Promise<void>;
  refreshQuests: (walletAddress: string) => Promise<void>;
  refreshInventory: (walletAddress: string, skipSync?: boolean) => Promise<void>;
  refreshInventoryFromDb: (walletAddress: string) => Promise<void>;
  updateSettings: (walletAddress: string, updates: Partial<UserSettings>) => Promise<void>;
  claimQuest: (walletAddress: string, questId: string) => Promise<{ xpAwarded: number }>;
  updateProfileXp: (newXp: number, newLevel: number, newMaxXp: number) => void;
  updateQuestStatus: (questId: string, status: 'active' | 'completed' | 'claimed') => void;
  selectCard: (walletAddress: string, cardTemplateId: string | null) => Promise<void>;
  subscribeToInventory: (userId: string, walletAddress: string) => void;
  unsubscribeFromInventory: () => void;
  reset: () => void;
}


// Helper to get storage URL - now using the utility function from utils/supabaseStorage
// This ensures consistent URL formatting across the app

// Types for API responses
interface CardPackApiResponse {
  id: string;
  name: string | null;
  rarity: string;
  price_idrx: string | number;
  price_eth: string | number;
  image_url: string | null;
  description: string | null;
  is_active: boolean;
}

interface CardTemplateApiResponse {
  id: string;
  name: string;
  rarity: string;
  image_url: string | null;
  description: string | null;
  atk?: number;
  health?: number;
  token_id?: number | null;
}

interface InventoryItemApiResponse {
  id: string;
  quantity: number;
  used?: boolean;
  token_id?: number | null;
  card_templates: CardTemplateApiResponse | null;
}

const initialState = {
  profile: null,
  quests: [],
  settings: null,
  cardPacks: [],
  inventory: [],
  dailyPackCount: 0,
  currentStage: null,
  isInitialized: false,
  isLoading: false,
  profileLoading: false,
  questsLoading: false,
  settingsLoading: false,
  packsLoading: false,
  inventoryLoading: false,
  isSyncing: false,
  error: null,
  _abortController: null,
  _realtimeChannel: null,
  _userId: null,
  _walletAddress: null,
  _realtimeRetryCount: 0,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  // Initialize all game data in parallel (called once on login)
  // This caches all data - components should read from store, not fetch independently
  initializeGameData: async (walletAddress: string) => {
    // Validate wallet address
    if (!walletAddress || typeof walletAddress !== 'string' || walletAddress.length < 10) {
      console.error('[GameStore] Invalid wallet address:', walletAddress);
      set({ error: 'Invalid wallet address', isLoading: false });
      return;
    }

    // Check if already initialized for this wallet (prevent duplicate fetches)
    const currentState = get();
    if (currentState.isInitialized && currentState.profile) {
      // Already initialized, skip
      return;
    }

    // Abort any previous initialization
    if (currentState._abortController) {
      console.log('[GameStore] Aborting previous initialization...');
      currentState._abortController.abort();
    }

    // Create new AbortController for this initialization
    const abortController = new AbortController();
    const signal = abortController.signal;

    set({ 
      isLoading: true, 
      error: null, 
      profileLoading: true, 
      questsLoading: true, 
      settingsLoading: true, 
      packsLoading: true, 
      inventoryLoading: true,
      isInitialized: false, // Explicitly set to false during loading
      _abortController: abortController,
    });

    try {
      // CRITICAL FIX: Sync NFT from blockchain FIRST before fetching inventory
      // This ensures inventory matches blockchain state on login
      console.log('[GameStore] Starting login initialization...');
      console.log('[GameStore] Step 1: Syncing NFTs from blockchain...');
      
      // FIX: Add timeout to NFT sync (max 10 seconds)
      const syncTimeout = new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('NFT sync timeout after 10s')), 10000)
      );
      
      try {
        const syncPromise = fetch('/api/cards/sync-nft', {
          method: 'POST',
          headers: { 'x-wallet-address': walletAddress },
          signal, // Add abort signal
        });
        
        await Promise.race([syncPromise, syncTimeout]);
        console.log('[GameStore] ✓ NFT sync completed');
      } catch (syncError) {
        // FIX: For first-time users, NFT sync failure is CRITICAL
        // Show error instead of silently continuing
        const errorMsg = syncError instanceof Error ? syncError.message : 'Unknown error';
        console.error('[GameStore] ❌ NFT sync failed:', errorMsg);
        
        // Check if aborted
        if (signal.aborted) {
          console.log('[GameStore] Initialization aborted');
          return;
        }
        
        // Continue but set error state so UI can show warning
        set({ error: `NFT sync failed: ${errorMsg}. Your inventory may be incomplete.` });
      }
      
      console.log('[GameStore] Step 2: Fetching all game data...');
      
      // FIX: Add timeout wrapper for all fetches (max 30 seconds total)
      const fetchWithTimeout = (url: string, options: RequestInit, timeoutMs = 30000) => {
        const timeout = new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
        );
        return Promise.race([fetch(url, options), timeout]);
      };

      // Fetch all data in parallel for fastest load
      // FIX: Each fetch now has abort signal and timeout
      const fetchPromises = [
        fetchWithTimeout('/api/player/profile', {
          headers: { 'x-wallet-address': walletAddress },
          cache: 'no-store',
          signal,
        }),
        fetchWithTimeout('/api/quests', {
          headers: { 'x-wallet-address': walletAddress },
          cache: 'no-store',
          signal,
        }),
        fetchWithTimeout('/api/settings', {
          headers: { 'x-wallet-address': walletAddress },
          cache: 'no-store',
          signal,
        }),
        fetchWithTimeout('/api/cards/packs', {
          cache: 'no-store',
          signal,
        }),
        fetchWithTimeout('/api/cards/inventory', {
          headers: { 'x-wallet-address': walletAddress },
          cache: 'no-store',
          signal,
        }),
        fetchWithTimeout('/api/daily-packs', {
          headers: { 'x-wallet-address': walletAddress },
          cache: 'no-store',
          signal,
        }),
        fetchWithTimeout('/api/stages?current=true', {
          headers: { 'x-wallet-address': walletAddress },
          cache: 'no-store',
          signal,
        }),
      ];

      // FIX: Use Promise.allSettled instead of Promise.all
      // This prevents one failed API from killing the entire initialization
      const results = await Promise.allSettled(fetchPromises);
      
      // Check if aborted during fetch
      if (signal.aborted) {
        console.log('[GameStore] Initialization aborted during fetch');
        return;
      }

      // Process responses with individual error handling
      const [profileRes, questsRes, settingsRes, packsRes, inventoryRes, dailyPacksRes, stagesRes] = 
        results.map(result => result.status === 'fulfilled' ? result.value : null);

      // Parse JSON responses with error handling
      const parseJSON = async (response: Response | null, name: string) => {
        if (!response) {
          console.warn(`[GameStore] ${name} fetch failed`);
          return null;
        }
        if (!response.ok) {
          console.warn(`[GameStore] ${name} returned status ${response.status}`);
          return null;
        }
        try {
          return await response.json();
        } catch (error) {
          console.error(`[GameStore] ${name} JSON parse error:`, error);
          return null;
        }
      };

      const [profileData, questsData, settingsData, packsData, inventoryData, dailyPacksData, stagesData] = await Promise.all([
        parseJSON(profileRes, 'Profile'),
        parseJSON(questsRes, 'Quests'),
        parseJSON(settingsRes, 'Settings'),
        parseJSON(packsRes, 'Packs'),
        parseJSON(inventoryRes, 'Inventory'),
        parseJSON(dailyPacksRes, 'DailyPacks'),
        parseJSON(stagesRes, 'Stages'),
      ]);

      // Format card packs
      const formattedPacks: CardPack[] = (packsData?.packs || []).map((pack: CardPackApiResponse) => {
        // Handle image URL - check if it's already a full URL or needs formatting
        let imageUrl = '';
        if (pack.image_url) {
          if (pack.image_url.startsWith('http://') || pack.image_url.startsWith('https://')) {
            // Already a full URL
            imageUrl = pack.image_url;
          } else {
            // Use getStorageUrl to format the path correctly
            // getStorageUrl from utils adds '/assets' prefix automatically
            // So if database has 'game/icons/...', it becomes '/assets/game/icons/...'
            imageUrl = getStorageUrl(pack.image_url);
            // Debug log to help troubleshoot
            if (process.env.NODE_ENV === 'development') {
              console.log(`Card pack "${pack.name}": original path="${pack.image_url}", formatted URL="${imageUrl}"`);
            }
          }
        } else {
          // Log warning if image_url is missing
          console.warn(`Card pack "${pack.name}" (ID: ${pack.id}) has no image_url`);
        }
        
        return {
          id: pack.id,
          name: pack.name || '',
          rarity: pack.rarity || 'common',
          priceIdrx: parseFloat(String(pack.price_idrx || 0)),
          priceEth: parseFloat(String(pack.price_eth || 0)),
          imageUrl,
          description: pack.description || '',
          isActive: pack.is_active !== false,
        };
      });

      // Format inventory with battle tracking fields
      const formattedInventory: InventoryCard[] = (inventoryData?.inventory || []).map((item: InventoryItemApiResponse) => ({
        id: item.id,
        cardTemplate: {
          id: item.card_templates?.id || '',
          name: item.card_templates?.name || '',
          rarity: item.card_templates?.rarity || 'common',
          imageUrl: item.card_templates?.image_url ? getStorageUrl(item.card_templates.image_url) : '',
          description: item.card_templates?.description || null,
          atk: item.card_templates?.atk,
          health: item.card_templates?.health,
          token_id: item.card_templates?.token_id,
        },
        quantity: item.quantity || 1,
        used: item.used || false,
        token_id: item.token_id || item.card_templates?.token_id || null,
      }));

      // CRITICAL: Only set isInitialized to true AFTER all data is processed and set
      // This ensures components won't render until everything is ready
      set({
        profile: profileData?.profile || null,
        quests: questsData?.quests || [],
        settings: settingsData?.settings ? {
          soundVolume: settingsData.settings.sound_volume,
          notificationsEnabled: settingsData.settings.notifications_enabled,
        } : null,
        cardPacks: formattedPacks,
        inventory: formattedInventory,
        dailyPackCount: dailyPacksData?.packCount || 0,
        currentStage: stagesData?.currentStage ? {
          id: stagesData.currentStage.id,
          name: stagesData.currentStage.name,
          stageNumber: stagesData.currentStage.stage_number,
        } : null,
        profileLoading: false,
        questsLoading: false,
        settingsLoading: false,
        packsLoading: false,
        inventoryLoading: false,
        isLoading: false,
        isInitialized: true, // Set to true LAST, after all data is ready
      });

      console.log('[GameStore] ✅ Initialization complete!');
      console.log(`[GameStore] - Profile: Level ${profileData?.profile?.level || 1}`);
      console.log(`[GameStore] - Quests: ${questsData?.quests?.length || 0} active`);
      console.log(`[GameStore] - Inventory: ${formattedInventory.length} NFTs`);
      console.log(`[GameStore] - Daily Packs: ${dailyPacksData?.packCount || 0}`);
      console.log(`[GameStore] - Current Stage: ${stagesData?.currentStage?.name || 'None'}`);
      
      // Setup realtime subscription for inventory if we have userId
      const userId = profileData?.profile?.userId;
      if (userId) {
        console.log('[GameStore] Setting up realtime inventory subscription...');
        get().subscribeToInventory(userId, walletAddress);
      }
      
      // Clear abort controller after success
      set({ _abortController: null });

    } catch (error: unknown) {
      // Check if error was due to abort
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[GameStore] Initialization aborted');
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize game data';
      console.error('[GameStore] Initialization error:', errorMessage);
      set({ 
        error: errorMessage, 
        isLoading: false,
        profileLoading: false,
        questsLoading: false,
        settingsLoading: false,
        packsLoading: false,
        inventoryLoading: false,
        isInitialized: false,
        _abortController: null,
      });
    }
  },


  // Refresh profile only (used after XP changes, level ups, etc.)
  // This updates the cached profile data in store
  refreshProfile: async (walletAddress: string) => {
    // Only show loading if we don't have profile yet (first load)
    const currentProfile = get().profile;
    if (!currentProfile) {
      set({ profileLoading: true });
    }
    try {
      const response = await fetch('/api/player/profile', {
        headers: { 'x-wallet-address': walletAddress },
        cache: 'no-store', // Always get fresh data
      });
      if (response.ok) {
        const data = await response.json();
        
        // CRITICAL: Preserve character image URL during profile refresh
        // This prevents image reset when opening menus or during transitions
        const preservedImageUrl = currentProfile?.selectedCard?.image_url;
        const newProfile = data.profile;
        
        // If we have a valid cached image URL and new profile doesn't have one,
        // preserve the cached URL to prevent image loss
        if (preservedImageUrl && newProfile?.selectedCard && !newProfile.selectedCard.image_url) {
          newProfile.selectedCard.image_url = preservedImageUrl;
        }
        
        set({ profile: newProfile, profileLoading: false });
      } else {
        set({ profileLoading: false });
      }
    } catch {
      set({ profileLoading: false });
    }
  },

  // Refresh quests only (used after minting, battle completion, etc.)
  // This updates the cached quest data in store
  refreshQuests: async (walletAddress: string) => {
    // Only show loading if we don't have quests yet (first load)
    const currentQuests = get().quests;
    if (currentQuests.length === 0) {
      set({ questsLoading: true });
    }
    try {
      const response = await fetch('/api/quests', {
        headers: { 'x-wallet-address': walletAddress },
        cache: 'no-store', // Always get fresh data
      });
      if (response.ok) {
        const data = await response.json();
        set({ quests: data.quests || [], questsLoading: false });
      } else {
        set({ questsLoading: false });
      }
    } catch {
      set({ questsLoading: false });
    }
  },

  // Refresh inventory with optional NFT sync
  // skipSync: true = only fetch from database (use when sync already done)
  // skipSync: false/undefined = sync from blockchain first, then fetch
  refreshInventory: async (walletAddress: string, skipSync: boolean = false) => {
    set({ inventoryLoading: true, isSyncing: !skipSync });
    
    // Create AbortController for this operation
    const abortController = new AbortController();
    const signal = abortController.signal;
    
    try {
      // Only sync from blockchain if not skipped
      if (!skipSync) {
        console.log('[GameStore] Starting NFT sync from blockchain...');
        
        try {
          // CRITICAL: Wait longer for blockchain to fully settle after mint
          // Sometimes RPC nodes need time to index the latest Transfer events
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // FIX: Add timeout to sync (max 15 seconds for blockchain operations)
          const syncTimeout = new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error('NFT sync timeout - blockchain may still be settling')), 15000)
          );
          
          const syncPromise = fetch('/api/cards/sync-nft', {
            method: 'POST',
            headers: { 'x-wallet-address': walletAddress },
            signal,
          });
          
          const syncResponse = await Promise.race([syncPromise, syncTimeout]);
          
          if (!syncResponse.ok) {
            const syncData = await syncResponse.json().catch(() => ({}));
            console.warn(`[GameStore] NFT sync returned ${syncResponse.status}: ${syncData.error || 'Unknown error'}`);
            console.warn('[GameStore] Continuing with DB fetch - blockchain sync will retry on next refresh');
          } else {
            const syncData = await syncResponse.json();
            console.log('[GameStore] ✅ NFT sync completed successfully:', syncData.totalItems || 0, 'items');
            // Wait brief moment for DB writes to complete
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (syncError) {
          // Don't fail entire operation if sync fails - just log and continue
          const errorMsg = syncError instanceof Error ? syncError.message : 'Unknown error';
          console.warn('[GameStore] ⚠️ NFT sync failed:', errorMsg);
          console.warn('[GameStore] This is OK - continuing with DB fetch. Sync will auto-retry on next refresh.');
        }
      } else {
        console.log('[GameStore] ⚡ Fast refresh: Skipping blockchain sync, fetching from database only...');
      }
      
      // Fetch inventory with timeout
      const inventoryTimeout = new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Inventory fetch timeout')), 10000)
      );
      
      const inventoryPromise = fetch('/api/cards/inventory', {
        headers: { 'x-wallet-address': walletAddress },
        signal,
        cache: 'no-store', // Always get fresh data
      });
      
      const response = await Promise.race([inventoryPromise, inventoryTimeout]);
      
      if (!response.ok) {
        throw new Error(`Inventory API returned ${response.status}`);
      }

      const data = await response.json();
      const formatted: InventoryCard[] = (data.inventory || []).map((item: InventoryItemApiResponse) => ({
        id: item.id,
        cardTemplate: {
          id: item.card_templates?.id || '',
          name: item.card_templates?.name || '',
          rarity: item.card_templates?.rarity || 'common',
          imageUrl: item.card_templates?.image_url ? getStorageUrl(item.card_templates.image_url) : '',
          description: item.card_templates?.description || null,
          atk: item.card_templates?.atk,
          health: item.card_templates?.health,
          token_id: item.card_templates?.token_id,
        },
        quantity: item.quantity || 1,
        used: item.used || false,
        token_id: item.token_id || item.card_templates?.token_id || null,
      }));
      
      set({ inventory: formatted, inventoryLoading: false, isSyncing: false });
      console.log('[GameStore] Inventory refreshed successfully:', formatted.length, 'cards');
      
      // OPTIMIZATION: Dispatch event for other components to react
      window.dispatchEvent(new CustomEvent('refresh-quests-inventory', { 
        detail: { skipBlockchainSync: skipSync }
      }));
    } catch (error) {
      // Check if aborted
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[GameStore] Inventory refresh aborted');
        return;
      }

      console.error('[GameStore] Error refreshing inventory:', error);
      // Preserve old inventory data on error
      set({ inventoryLoading: false, isSyncing: false });
    }
  },

  // Update settings
  updateSettings: async (walletAddress: string, updates: Partial<UserSettings>) => {
    set({ settingsLoading: true });
    try {
      const updateData: { soundVolume?: number; notificationsEnabled?: boolean } = {};
      if (updates.soundVolume !== undefined) updateData.soundVolume = updates.soundVolume;
      if (updates.notificationsEnabled !== undefined) updateData.notificationsEnabled = updates.notificationsEnabled;

      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const data = await response.json();
        set({
          settings: {
            soundVolume: data.settings.sound_volume,
            notificationsEnabled: data.settings.notifications_enabled,
          },
          settingsLoading: false,
        });
      } else {
        set({ settingsLoading: false });
      }
    } catch {
      set({ settingsLoading: false });
    }
  },


  // Claim quest and update XP realtime (no restart needed)
  claimQuest: async (walletAddress: string, questId: string) => {
    try {
      const response = await fetch('/api/quests/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({ questId }),
      });

      if (!response.ok) {
        throw new Error('Failed to claim quest');
      }

      const result = await response.json();
      const xpAwarded = result.xpAwarded || 0;

      // Update quest status to claimed immediately (optimistic update)
      const currentQuests = get().quests;
      const updatedQuests = currentQuests.map(q => 
        q.id === questId ? { ...q, status: 'claimed' as const } : q
      );
      set({ quests: updatedQuests });

      // Update profile XP in realtime using response data (no need to fetch again)
      if (result.profile) {
        const currentProfile = get().profile;
        if (currentProfile) {
          set({
            profile: {
              ...currentProfile,
              level: result.profile.level,
              currentXp: result.profile.currentXp,
              maxXp: result.profile.maxXp,
              xpPercentage: result.profile.xpPercentage,
            },
          });
        } else {
          // If profile doesn't exist, fetch it
          const profileRes = await fetch('/api/player/profile', {
            headers: { 'x-wallet-address': walletAddress },
            cache: 'no-store',
          });
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            set({ profile: profileData.profile });
          }
        }
      } else {
        // Fallback: fetch fresh profile if response doesn't include it
        const profileRes = await fetch('/api/player/profile', {
          headers: { 'x-wallet-address': walletAddress },
          cache: 'no-store',
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          set({ profile: profileData.profile });
        }
      }

      return { xpAwarded };
    } catch (error: unknown) {
      throw error;
    }
  },

  // Update profile XP directly (for realtime updates)
  updateProfileXp: (newXp: number, newLevel: number, newMaxXp: number) => {
    const currentProfile = get().profile;
    if (currentProfile) {
      set({
        profile: {
          ...currentProfile,
          currentXp: newXp,
          level: newLevel,
          maxXp: newMaxXp,
          xpPercentage: newMaxXp > 0 ? (newXp / newMaxXp) * 100 : 0,
        },
      });
    }
  },

  // Update quest status directly
  updateQuestStatus: (questId: string, status: 'active' | 'completed' | 'claimed') => {
    const currentQuests = get().quests;
    const updatedQuests = currentQuests.map(q =>
      q.id === questId ? { ...q, status } : q
    );
    set({ quests: updatedQuests });
  },

  // Select card for battle (or deselect if cardTemplateId is null)
  selectCard: async (walletAddress: string, cardTemplateId: string | null) => {
    try {
      const response = await fetch('/api/cards/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({ cardTemplateId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to select card');
      }

      const result = await response.json();
      
      // Cache character image URL to sessionStorage for recovery
      if (result.card?.image_url) {
        try {
          sessionStorage.setItem('cached_character_image_url', result.card.image_url);
        } catch (e) {
          console.warn('[GameStore] Failed to cache character image URL:', e);
        }
      }
      
      // Update profile with selected card (or null if deselected)
      const currentProfile = get().profile;
      if (currentProfile) {
        set({
          profile: {
            ...currentProfile,
            selectedCardId: result.card?.id || null,
            selectedCard: result.card || null,
          },
        });
      } else {
        // Refresh profile if not available
        await get().refreshProfile(walletAddress);
      }
    } catch (error: unknown) {
      throw error;
    }
  },

  // Refresh inventory from database only (no blockchain sync)
  // Used by realtime subscription to quickly update inventory
  refreshInventoryFromDb: async (walletAddress: string) => {
    try {
      const response = await fetch('/api/cards/inventory', {
        headers: { 'x-wallet-address': walletAddress },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Inventory API returned ${response.status}`);
      }

      const data = await response.json();
      const formatted: InventoryCard[] = (data.inventory || []).map((item: InventoryItemApiResponse) => ({
        id: item.id,
        cardTemplate: {
          id: item.card_templates?.id || '',
          name: item.card_templates?.name || '',
          rarity: item.card_templates?.rarity || 'common',
          imageUrl: item.card_templates?.image_url ? getStorageUrl(item.card_templates.image_url) : '',
          description: item.card_templates?.description || null,
          atk: item.card_templates?.atk,
          health: item.card_templates?.health,
          token_id: item.card_templates?.token_id,
        },
        quantity: item.quantity || 1,
        used: item.used || false,
        token_id: item.token_id || item.card_templates?.token_id || null,
      }));

      set({ inventory: formatted });
      console.log('[GameStore] Inventory refreshed from DB:', formatted.length, 'cards');
    } catch (error) {
      console.error('[GameStore] Error refreshing inventory from DB:', error);
    }
  },

  // Subscribe to realtime inventory changes
  // Note: This is a non-critical feature - game works without it
  subscribeToInventory: (userId: string, walletAddress: string) => {
    const currentState = get();
    const MAX_RETRIES = 3;
    
    // Don't resubscribe if already subscribed for same user
    if (currentState._realtimeChannel && currentState._userId === userId) {
      console.log('[GameStore] Already subscribed to inventory for this user');
      return;
    }

    // Check retry limit
    if (currentState._realtimeRetryCount >= MAX_RETRIES) {
      console.warn(`[GameStore] Realtime subscription failed after ${MAX_RETRIES} retries. Feature disabled (non-critical).`);
      return;
    }

    // Unsubscribe from previous channel if exists
    if (currentState._realtimeChannel) {
      supabase.removeChannel(currentState._realtimeChannel);
    }

    const channelName = `inventory-${userId}`;
    console.log(`[GameStore] Subscribing to realtime inventory: ${channelName} (attempt ${currentState._realtimeRetryCount + 1}/${MAX_RETRIES})`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'user_inventory',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[GameStore] Realtime inventory change:', payload.eventType);
          // Refresh inventory from database (not blockchain) for fast update
          get().refreshInventoryFromDb(walletAddress);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[GameStore] ✅ Realtime subscription active: ${channelName}`);
          // Reset retry count on success
          set({ _realtimeRetryCount: 0 });
        } else if (status === 'CHANNEL_ERROR') {
          const retryCount = get()._realtimeRetryCount;
          if (retryCount < MAX_RETRIES) {
            console.warn(`[GameStore] ⚠️ Realtime subscription failed: ${channelName}, retry ${retryCount + 1}/${MAX_RETRIES}...`);
            // Cleanup current channel
            const state = get();
            if (state._realtimeChannel) {
              supabase.removeChannel(state._realtimeChannel);
            }
            // Increment retry count and retry with exponential backoff
            set({ 
              _realtimeChannel: null, 
              _userId: null, 
              _walletAddress: null,
              _realtimeRetryCount: retryCount + 1 
            });
            setTimeout(() => {
              get().subscribeToInventory(userId, walletAddress);
            }, Math.min(3000 * Math.pow(2, retryCount), 15000)); // 3s, 6s, 12s max 15s
          } else {
            console.warn(`[GameStore] ⚠️ Realtime disabled after ${MAX_RETRIES} failures (non-critical feature)`);
          }
        } else if (status === 'TIMED_OUT') {
          console.warn(`[GameStore] ⏱️ Realtime subscription timed out: ${channelName}`);
          // Don't retry on timeout - just log it
        }
      });

    set({ 
      _realtimeChannel: channel, 
      _userId: userId,
      _walletAddress: walletAddress,
    });
  },

  // Unsubscribe from realtime inventory changes
  unsubscribeFromInventory: () => {
    const currentState = get();
    if (currentState._realtimeChannel) {
      console.log('[GameStore] Unsubscribing from realtime inventory');
      supabase.removeChannel(currentState._realtimeChannel);
      set({ _realtimeChannel: null, _userId: null, _walletAddress: null, _realtimeRetryCount: 0 });
    }
  },

  // Reset store (on logout)
  reset: () => {
    // Abort any pending requests
    const currentState = get();
    if (currentState._abortController) {
      currentState._abortController.abort();
    }
    
    // Unsubscribe from realtime
    if (currentState._realtimeChannel) {
      supabase.removeChannel(currentState._realtimeChannel);
    }
    
    set(initialState);
  },
}));
