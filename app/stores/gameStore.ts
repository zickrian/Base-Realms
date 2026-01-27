"use client";

import { create } from 'zustand';
import { getStorageUrl } from '../utils/supabaseStorage';

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
  
  // Actions
  initializeGameData: (walletAddress: string) => Promise<void>;
  refreshProfile: (walletAddress: string) => Promise<void>;
  refreshQuests: (walletAddress: string) => Promise<void>;
  refreshInventory: (walletAddress: string) => Promise<void>;
  updateSettings: (walletAddress: string, updates: Partial<UserSettings>) => Promise<void>;
  claimQuest: (walletAddress: string, questId: string) => Promise<{ xpAwarded: number }>;
  updateProfileXp: (newXp: number, newLevel: number, newMaxXp: number) => void;
  updateQuestStatus: (questId: string, status: 'active' | 'completed' | 'claimed') => void;
  selectCard: (walletAddress: string, cardTemplateId: string | null) => Promise<void>;
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
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  // Initialize all game data in parallel (called once on login)
  // This caches all data - components should read from store, not fetch independently
  initializeGameData: async (walletAddress: string) => {
    // Check if already initialized for this wallet (prevent duplicate fetches)
    const currentState = get();
    if (currentState.isInitialized && currentState.profile) {
      // Already initialized, skip
      return;
    }

    set({ 
      isLoading: true, 
      error: null, 
      profileLoading: true, 
      questsLoading: true, 
      settingsLoading: true, 
      packsLoading: true, 
      inventoryLoading: true,
      isInitialized: false, // Explicitly set to false during loading
    });

    try {
      // CRITICAL FIX: Sync NFT from blockchain FIRST before fetching inventory
      // This ensures inventory matches blockchain state on login
      console.log('[GameStore] Starting login initialization...');
      console.log('[GameStore] Step 1: Syncing NFTs from blockchain...');
      
      try {
        await fetch('/api/cards/sync-nft', {
          method: 'POST',
          headers: { 'x-wallet-address': walletAddress },
        });
        console.log('[GameStore] ✓ NFT sync completed');
      } catch (syncError) {
        console.warn('[GameStore] ⚠️ NFT sync failed on login, will continue with existing data:', syncError);
      }
      
      console.log('[GameStore] Step 2: Fetching all game data...');
      
      // Fetch all data in parallel for fastest load
      const [profileRes, questsRes, settingsRes, packsRes, inventoryRes, dailyPacksRes, stagesRes] = await Promise.all([
        fetch('/api/player/profile', {
          headers: { 'x-wallet-address': walletAddress },
          cache: 'no-store', // Always get fresh data on login
        }),
        fetch('/api/quests', {
          headers: { 'x-wallet-address': walletAddress },
          cache: 'no-store',
        }),
        fetch('/api/settings', {
          headers: { 'x-wallet-address': walletAddress },
          cache: 'no-store',
        }),
        fetch('/api/cards/packs', {
          cache: 'no-store', // Card packs can change, but less frequently
        }),
        fetch('/api/cards/inventory', {
          headers: { 'x-wallet-address': walletAddress },
          cache: 'no-store',
        }),
        fetch('/api/daily-packs', {
          headers: { 'x-wallet-address': walletAddress },
          cache: 'no-store',
        }),
        fetch('/api/stages?current=true', {
          headers: { 'x-wallet-address': walletAddress },
          cache: 'no-store',
        }),
      ]);

      // Process responses - wait for ALL to complete
      const [profileData, questsData, settingsData, packsData, inventoryData, dailyPacksData, stagesData] = await Promise.all([
        profileRes.ok ? profileRes.json() : null,
        questsRes.ok ? questsRes.json() : null,
        settingsRes.ok ? settingsRes.json() : null,
        packsRes.ok ? packsRes.json() : null,
        inventoryRes.ok ? inventoryRes.json() : null,
        dailyPacksRes.ok ? dailyPacksRes.json() : null,
        stagesRes.ok ? stagesRes.json() : null,
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
      
      // REMOVED: Background sync NFT - already done at start of initialization

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize game data';
      set({ 
        error: errorMessage, 
        isLoading: false,
        profileLoading: false,
        questsLoading: false,
        settingsLoading: false,
        packsLoading: false,
        inventoryLoading: false,
        isInitialized: false, // Keep false on error
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
        set({ profile: data.profile, profileLoading: false });
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

  // Refresh inventory with NFT sync
  refreshInventory: async (walletAddress: string) => {
    set({ inventoryLoading: true, isSyncing: true });
    try {
      // CRITICAL FIX: Await sync completion before fetching inventory
      console.log('[GameStore] Starting NFT sync...');
      await fetch('/api/cards/sync-nft', {
        method: 'POST',
        headers: { 'x-wallet-address': walletAddress },
      });

      // Add delay to ensure blockchain state is settled and database is updated
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('[GameStore] NFT sync completed, fetching inventory...');
      // Then fetch inventory
      const response = await fetch('/api/cards/inventory', {
        headers: { 'x-wallet-address': walletAddress },
      });
      
      if (response.ok) {
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
      } else {
        console.error('[GameStore] Failed to fetch inventory, status:', response.status);
        // FIX #3: Preserve old inventory data on API failure
        // Don't clear inventory, just update loading states
        set({ inventoryLoading: false, isSyncing: false });
        // Old inventory is preserved (not overwritten)
      }
    } catch (error) {
      console.error('[GameStore] Error refreshing inventory:', error);
      // FIX #3: Preserve old inventory data on error
      // Don't clear inventory, just update loading states
      set({ inventoryLoading: false, isSyncing: false });
      // Old inventory is preserved (not overwritten)
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

  // Reset store (on logout)
  reset: () => {
    set(initialState);
  },
}));
