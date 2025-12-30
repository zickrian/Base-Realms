# Quest System Documentation

## Daily Quest Rules

### Quest Lifecycle
1. **Active** - Quest baru dibuat, user bisa menyelesaikannya
2. **Completed** - Quest sudah selesai, menunggu user claim reward
3. **Claimed** - Reward sudah di-claim, quest hilang dari list sampai besok

### Important Rules
- Setiap quest hanya muncul **1x per hari**
- Quest yang sudah **claimed** tidak akan muncul lagi sampai hari berikutnya
- Quest yang sudah **completed** tidak bisa di-complete lagi (harus claim dulu)
- Quest expired di-delete otomatis saat login hari berikutnya
- Daily login quest otomatis completed saat first login of the day

### Quest Types
- `daily_login` - Auto-completed on first login each day
- `open_packs` - Complete by opening card packs
- `play_games` - Complete by playing battles
- `win_games` - Complete by winning battles

## API Endpoints

### GET /api/quests
Get user's active and completed quests (NOT claimed quests)

**Headers:**
```
x-wallet-address: <user_wallet_address>
```

**Response:**
```json
{
  "quests": [
    {
      "id": "quest_id",
      "title": "Daily Login",
      "description": "Login to the game",
      "currentProgress": 1,
      "maxProgress": 1,
      "reward": "50 XP",
      "status": "completed",
      "questType": "daily_login"
    }
  ]
}
```

### POST /api/quests/claim
Claim reward for completed quest

**Headers:**
```
x-wallet-address: <user_wallet_address>
```

**Body:**
```json
{
  "questId": "quest_id"
}
```

**Response:**
```json
{
  "success": true,
  "xpAwarded": 50,
  "cardPackId": null,
  "profile": {
    "level": 1,
    "currentXp": 50,
    "maxXp": 100,
    "xpPercentage": 50
  }
}
```

### POST /api/quests/update-progress
Update quest progress (for play_games, win_games, open_packs)

**Headers:**
```
x-wallet-address: <user_wallet_address>
```

**Body:**
```json
{
  "questType": "open_packs",
  "autoClaim": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Quest progress updated",
  "questCompleted": true,
  "xpAwarded": 0,
  "completedQuestIds": ["quest_id"]
}
```

### POST /api/quests/cleanup-duplicates
Remove duplicate quests (if any exist in database)

**Headers:**
```
x-wallet-address: <user_wallet_address>
```

**Response:**
```json
{
  "success": true,
  "message": "Cleanup completed. Removed 2 duplicate quests.",
  "duplicatesRemoved": 2
}
```

## Troubleshooting

### Problem: Duplicate quests showing up
**Solution:** Call cleanup endpoint
```bash
curl -X POST http://localhost:3000/api/quests/cleanup-duplicates \
  -H "x-wallet-address: YOUR_WALLET_ADDRESS"
```

### Problem: Quest already claimed but still showing
**Solution:** Check if quest status is 'claimed' in database. API should filter out claimed quests automatically.

### Problem: Quest not resetting next day
**Solution:** Quest reset happens on login. Make sure `expires_at` is set correctly (tomorrow midnight UTC).

## Database Schema

### user_quests table
- `id` - UUID primary key
- `user_id` - Foreign key to users
- `quest_template_id` - Foreign key to quest_templates
- `current_progress` - Current progress (0 to max_progress)
- `max_progress` - Target value to complete
- `status` - 'active' | 'completed' | 'claimed'
- `started_at` - When quest was created
- `completed_at` - When quest was completed (null if not completed)
- `claimed_at` - When reward was claimed (null if not claimed)
- `expires_at` - When quest expires (tomorrow midnight UTC for daily quests)

### quest_templates table
- `id` - UUID primary key
- `title` - Quest title
- `description` - Quest description
- `quest_type` - 'daily_login' | 'open_packs' | 'play_games' | 'win_games'
- `target_value` - How many times to complete
- `reward_xp` - XP reward
- `reward_card_pack_id` - Card pack reward (optional)
- `is_daily` - Boolean, true for daily quests
- `is_active` - Boolean, true if quest is active
