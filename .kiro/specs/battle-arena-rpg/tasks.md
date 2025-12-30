# Implementation Plan: Battle Arena RPG

## Overview

Implementasi sistem pertarungan turn-based RPG dengan pixel-style design. Menggunakan React components, CSS Modules, dan Zustand untuk state management. Assets diambil dari Supabase Storage.

## Tasks

- [-] 1. Setup Battle Store dan Types
  - [x] 1.1 Create battle types dan interfaces
    - Create `app/types/battle.ts` dengan CharacterStats, BattleState, BattleStatus types
    - Define initial player stats (ATK: 100, HP: 500) dan enemy stats (ATK: 50, HP: 500)
    - _Requirements: 3.4, 3.5, 8.1, 8.2, 8.3_
  - [x] 1.2 Create battle store dengan Zustand
    - Create `app/stores/battleStore.ts`
    - Implement initBattle, executeAttack, nextTurn, setStatus, resetBattle actions
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 8.1, 8.2, 8.3, 8.4_
  - [ ] 1.3 Write property test for attack damage calculation
    - **Property 1: Attack Damage Calculation**
    - **Validates: Requirements 4.3, 4.4**
  - [ ] 1.4 Write property test for turn alternation
    - **Property 2: Turn Alternation**
    - **Validates: Requirements 4.5**
  - [ ] 1.5 Write property test for battle result determination
    - **Property 4: Battle Result Determination**
    - **Validates: Requirements 6.1, 6.2**

- [ ] 2. Checkpoint - Verify battle store logic
  - Ensure all property tests pass
  - Ask the user if questions arise

- [-] 3. Create HealthBar Component
  - [x] 3.1 Create HealthBar component dengan pixel-style design
    - Create `app/components/game/HealthBar.tsx` dan `HealthBar.module.css`
    - Display character name, current HP, max HP, ATK value
    - Support left/right positioning
    - Implement HP bar dengan gradient (green → yellow → red)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 3.2 Add HP change animation
    - Implement smooth transition saat HP berubah
    - _Requirements: 3.6_
  - [ ] 3.3 Write property test for health bar stats completeness
    - **Property 6: Health Bar Stats Completeness**
    - **Validates: Requirements 3.3**

- [x] 4. Create CharacterSprite Component
  - [x] 4.1 Create CharacterSprite component
    - Create `app/components/game/CharacterSprite.tsx` dan `CharacterSprite.module.css`
    - Display dragon sprite dari Supabase storage
    - Support left (player) dan right (enemy, mirrored) positioning
    - _Requirements: 2.2, 2.3_
  - [x] 4.2 Add hit effect (red flash + shake)
    - Implement red tint overlay saat isHit = true
    - Add shake animation (2-3 pixels)
    - Effect duration: 300ms
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 4.3 Add damage number display
    - Show damage number near character saat terkena hit
    - Animate damage number (float up + fade out)
    - _Requirements: 5.4_

- [x] 5. Create LoadingScreen Component
  - [x] 5.1 Create LoadingScreen component
    - Create `app/components/game/LoadingScreen.tsx` dan `LoadingScreen.module.css`
    - Pixel-style loading indicator/bar
    - Preload background (gladiator.png) dan sprite (output-onlinegiftools.gif)
    - Minimum display time: 1.5 seconds
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 6. Create ResultModal Component
  - [x] 6.1 Create ResultModal component
    - Create `app/components/game/ResultModal.tsx` dan `ResultModal.module.css`
    - Display "VICTORY" atau "DEFEAT" dengan pixel font
    - Semi-transparent dark overlay
    - Centered modal dengan pixel border
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 6.2 Add Return to Home button dan auto-close
    - "Return to Home" button
    - Auto-close countdown (5 seconds)
    - Navigate to /home on close
    - _Requirements: 6.4, 6.5, 6.6_

- [-] 7. Create BattleArena Component
  - [x] 7.1 Create BattleArena component
    - Create `app/components/game/BattleArena.tsx` dan `BattleArena.module.css`
    - Background: gladiator.png dari Supabase
    - Layout: HealthBars di top, Characters di center, ResultModal di center
    - _Requirements: 2.1, 2.4_
  - [x] 7.2 Implement turn-based combat loop
    - Wait 1.5 seconds before each attack
    - Execute attack dan show hit effect
    - Switch turns
    - Check for battle end
    - _Requirements: 4.2, 4.5, 4.6_
  - [ ] 7.3 Write property test for battle continuation invariant
    - **Property 3: Battle Continuation Invariant**
    - **Validates: Requirements 4.6**
  - [ ] 7.4 Write property test for post-battle attack prevention
    - **Property 5: Post-Battle Attack Prevention**
    - **Validates: Requirements 8.4**

- [x] 8. Create BattlePage dan Integration
  - [x] 8.1 Create BattlePage component
    - Create `app/battle/page.tsx` dan `page.module.css`
    - Manage flow: loading → battle → result
    - Connect to battleStore
    - _Requirements: 1.1, 1.3_
  - [x] 8.2 Update BattleSection to navigate to battle page
    - Modify `app/components/game/BattleSection.tsx`
    - Add navigation to /battle on BATTLE button click
    - _Requirements: 1.1_
  - [x] 8.3 Handle battle cleanup on unmount
    - Reset battle state when navigating away
    - _Requirements: 8.5_

- [-] 9. Implement Responsive Design
  - [ ] 9.1 Add responsive styles for all battle components
    - Mobile (< 480px): smaller characters, compact UI
    - Tablet (481px - 768px): medium sizing
    - Desktop (> 768px): larger characters, spacious UI
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ] 9.2 Write unit tests for responsive breakpoints
    - Test CSS media queries are applied correctly
    - _Requirements: 7.1, 7.2_

- [ ] 10. Final Checkpoint - Full Integration Test
  - Ensure all tests pass
  - Test full battle flow: home → loading → battle → result → home
  - Test on mobile dan desktop viewports
  - Ask the user if questions arise

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Use `fast-check` library untuk property-based testing
- Assets URL: `getStorageUrl('battle/gladiator.png')` dan `getStorageUrl('battle/output-onlinegiftools.gif')`
