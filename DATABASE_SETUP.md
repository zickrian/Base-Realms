# Database Setup Documentation

## Overview
Sistem game sekarang fully database-driven menggunakan Supabase. Semua data disimpan di database, tidak ada mock data atau hardcoded values di frontend.

## Environment Variables Required

Buat file `.env.local` di root project dengan content berikut:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://htdiytcpgyawxzpitlll.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OnchainKit (existing)
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_key_here
```

### Cara Mendapatkan Keys:

1. **NEXT_PUBLIC_SUPABASE_URL**: Sudah ada di project (https://htdiytcpgyawxzpitlll.supabase.co)

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**: 
   - Buka Supabase Dashboard
   - Settings > API
   - Copy "anon public" key

3. **SUPABASE_SERVICE_ROLE_KEY**:
   - Buka Supabase Dashboard
   - Settings > API
   - Copy "service_role" key (JANGAN expose di frontend!)

## Database Schema

Database sudah dibuat dengan migration berikut:
- `001_initial_schema` - Semua tables
- `002_seed_initial_data` - Initial data (stages, quests, cards, level config)
- `003_rls_policies` - Row Level Security policies
- `004_fix_rls_policies` - Fixed RLS policies

### Tables Created:

1. **users** - User accounts (wallet-based)
2. **player_profiles** - Player stats (level, XP, battles)
3. **user_settings** - User preferences (sound, notifications)
4. **card_templates** - Card definitions
5. **card_packs** - Available card packs for purchase
6. **user_inventory** - User's card collection
7. **user_purchases** - Purchase history
8. **card_reveals** - Card reveal records
9. **quest_templates** - Quest definitions
10. **user_quests** - User quest progress
11. **stages** - Game stages
12. **battles** - Battle records
13. **daily_packs** - Daily pack tracking
14. **level_config** - Level XP requirements

## API Routes

### Authentication
- `POST /api/auth/login` - Create/update user session
- `GET /api/auth/session` - Get current session
- `POST /api/auth/logout` - Logout (client-side)

### Player
- `GET /api/player/profile` - Get player profile
- `GET /api/player/xp` - Get XP info
- `POST /api/player/xp` - Add XP

### Settings
- `GET /api/settings` - Get user settings
- `PATCH /api/settings` - Update settings

### Cards
- `GET /api/cards/packs` - Get available packs
- `GET /api/cards/inventory` - Get user inventory
- `POST /api/cards/purchase` - Purchase card pack

### Quests
- `GET /api/quests` - Get user quests
- `POST /api/quests/claim` - Claim quest reward

### Battles & Stages
- `GET /api/stages` - Get stages
- `POST /api/battles/start` - Start battle
- `POST /api/battles/complete` - Complete battle

### Daily Packs
- `GET /api/daily-packs` - Get daily pack status
- `POST /api/daily-packs` - Claim daily pack

## Features Implemented

### ✅ Login Flow
- Wallet connection triggers login API
- User created in database if doesn't exist
- Player profile, settings, and daily quests initialized

### ✅ Level & XP System
- XP stored in database
- Level calculated from total XP
- Progress bar shows current XP / max XP for level
- Level up handled automatically

### ✅ Inventory System
- Cards stored in database
- Inventory fetched from API
- Purchase adds cards to inventory

### ✅ Quest System
- Daily quests from database
- Progress tracked in database
- Rewards (XP) awarded on claim

### ✅ Settings
- Sound volume stored in database
- Notifications preference in database
- No localStorage usage

### ✅ Stages
- Stages from database
- Current stage tracked per user

### ✅ Battles
- Battle records in database
- XP awarded on completion
- Quest progress updated automatically

## Testing

1. Connect wallet → User created in database
2. Check profile → Level/XP from database
3. Open quests → Quests from database
4. View inventory → Cards from database
5. Change settings → Saved to database
6. Complete battle → XP added, quests updated

## Notes

- All API routes require `x-wallet-address` header
- Service role key used in API routes (bypasses RLS)
- RLS policies in place but permissive (security in API layer)
- Level config: Level 1 = 0-100 XP, Level 2 = 100-200 XP, etc.

