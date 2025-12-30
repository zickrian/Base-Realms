# Requirements Document

## Introduction

Fitur Battle Arena RPG adalah sistem pertarungan turn-based bergaya pixel/8-bit yang memungkinkan pemain bertarung melawan musuh secara bergantian. Sistem ini menampilkan karakter naga (player dan enemy) dengan background arena gladiator, health bar pixel-style, efek visual saat terkena serangan, dan notifikasi hasil pertarungan.

## Glossary

- **Battle_System**: Sistem utama yang mengelola logika pertarungan turn-based
- **Player_Character**: Karakter yang dikendalikan pemain dengan ATK 100 dan HP 500
- **Enemy_Character**: Karakter musuh dengan ATK 50 dan HP 500
- **Health_Bar**: Komponen UI pixel-style yang menampilkan HP dan ATK karakter
- **Turn_Manager**: Komponen yang mengatur giliran serangan bergantian
- **Battle_Arena**: Halaman pertarungan dengan background gladiator
- **Loading_Screen**: Layar loading sebelum battle dimulai
- **Result_Modal**: Modal yang menampilkan hasil menang/kalah di tengah layar
- **Hit_Effect**: Efek visual warna merah saat karakter terkena serangan
- **Dragon_Sprite**: Gambar karakter naga (output-onlinegiftools.gif) dari Supabase storage

## Requirements

### Requirement 1: Battle Loading Screen

**User Story:** As a player, I want to see a loading screen when starting a battle, so that I know the battle arena is being prepared.

#### Acceptance Criteria

1. WHEN a player clicks the BATTLE button, THE Loading_Screen SHALL display with a pixel-style loading indicator
2. WHILE the Loading_Screen is active, THE Battle_System SHALL preload all battle assets (background, character sprites)
3. WHEN all assets are loaded, THE Loading_Screen SHALL transition to the Battle_Arena within 2 seconds

### Requirement 2: Battle Arena Display

**User Story:** As a player, I want to see a visually appealing battle arena, so that I can enjoy an immersive RPG experience.

#### Acceptance Criteria

1. THE Battle_Arena SHALL display gladiator.png from Supabase storage as the background image
2. THE Battle_Arena SHALL display Player_Character on the left side using Dragon_Sprite
3. THE Battle_Arena SHALL display Enemy_Character on the right side using Dragon_Sprite (mirrored/flipped)
4. THE Battle_Arena SHALL be responsive and display correctly on both mobile (320px-480px) and desktop (>768px) screens
5. THE Battle_Arena SHALL maintain pixel-art aesthetic consistent with 8-bit RPG games

### Requirement 3: Character Stats Display

**User Story:** As a player, I want to see health bars and attack stats for both characters, so that I can track the battle progress.

#### Acceptance Criteria

1. THE Health_Bar SHALL display in pixel-style design at the top-left corner for Player_Character
2. THE Health_Bar SHALL display in pixel-style design at the top-right corner for Enemy_Character
3. WHEN displaying stats, THE Health_Bar SHALL show current HP, max HP (500), and ATK value
4. THE Player_Character Health_Bar SHALL show ATK: 100 and HP: 500/500 initially
5. THE Enemy_Character Health_Bar SHALL show ATK: 50 and HP: 500/500 initially
6. WHEN HP changes, THE Health_Bar SHALL animate the HP bar decrease/increase smoothly

### Requirement 4: Turn-Based Combat System

**User Story:** As a player, I want a turn-based combat system, so that I can experience strategic RPG gameplay.

#### Acceptance Criteria

1. WHEN battle starts, THE Turn_Manager SHALL set Player_Character as the first attacker
2. WHEN a turn begins, THE Battle_System SHALL wait 1.5 seconds before executing the attack
3. WHEN Player_Character attacks, THE Battle_System SHALL reduce Enemy_Character HP by Player_Character ATK (100)
4. WHEN Enemy_Character attacks, THE Battle_System SHALL reduce Player_Character HP by Enemy_Character ATK (50)
5. WHEN an attack is executed, THE Turn_Manager SHALL switch to the other character's turn
6. THE Battle_System SHALL continue alternating turns until one character's HP reaches 0

### Requirement 5: Hit Effect Visual Feedback

**User Story:** As a player, I want to see visual feedback when characters are hit, so that the battle feels more realistic and engaging.

#### Acceptance Criteria

1. WHEN a character receives damage, THE Hit_Effect SHALL display a red tint/flash on the character sprite
2. THE Hit_Effect SHALL last for 300 milliseconds
3. WHEN the Hit_Effect is active, THE character sprite SHALL shake slightly (2-3 pixels)
4. WHEN damage is dealt, THE Battle_System SHALL display the damage number near the hit character

### Requirement 6: Battle Result Display

**User Story:** As a player, I want to see the battle result clearly, so that I know whether I won or lost.

#### Acceptance Criteria

1. WHEN Player_Character HP reaches 0, THE Result_Modal SHALL display "DEFEAT" message in pixel-style font
2. WHEN Enemy_Character HP reaches 0, THE Result_Modal SHALL display "VICTORY" message in pixel-style font
3. THE Result_Modal SHALL appear centered on the screen with a semi-transparent overlay
4. THE Result_Modal SHALL display a "Return to Home" button
5. WHEN the player clicks "Return to Home", THE Battle_System SHALL navigate back to the home page
6. IF no action is taken, THE Battle_System SHALL automatically return to home after 5 seconds

### Requirement 7: Responsive Design

**User Story:** As a player, I want the battle screen to work well on any device, so that I can play on mobile or desktop.

#### Acceptance Criteria

1. WHILE on mobile screens (width < 768px), THE Battle_Arena SHALL scale characters and UI proportionally
2. WHILE on desktop screens (width >= 768px), THE Battle_Arena SHALL display larger characters and UI elements
3. THE Health_Bar SHALL remain readable and properly positioned on all screen sizes
4. THE Dragon_Sprite SHALL maintain aspect ratio when scaling across different screen sizes

### Requirement 8: Battle State Management

**User Story:** As a developer, I want proper state management for battles, so that the game logic is predictable and maintainable.

#### Acceptance Criteria

1. THE Battle_System SHALL track current turn (player or enemy)
2. THE Battle_System SHALL track both characters' current HP
3. THE Battle_System SHALL track battle status (loading, in_progress, victory, defeat)
4. WHEN battle ends, THE Battle_System SHALL prevent further attacks
5. IF a player navigates away during battle, THE Battle_System SHALL reset the battle state
