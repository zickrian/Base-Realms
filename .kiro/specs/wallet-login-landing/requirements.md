# Requirements Document

## Introduction

Fitur ini adalah landing page untuk aplikasi mobile-first PWA dengan desain pixel art style. Halaman ini akan menjadi entry point pertama ketika user mengakses website, menampilkan branding logo dan opsi untuk connect wallet. Setelah berhasil login dengan wallet, user akan diarahkan ke halaman home.

## Glossary

- **Landing_Page**: Halaman pertama yang ditampilkan ketika user mengakses website
- **Wallet_Connection**: Proses menghubungkan crypto wallet user ke aplikasi menggunakan OnchainKit
- **PWA**: Progressive Web App - aplikasi web yang dapat diinstall dan berjalan seperti native app
- **Coinbase_Smart_Wallet**: Wallet yang direkomendasikan untuk user yang belum memiliki wallet
- **Home_Page**: Halaman utama setelah user berhasil login dengan wallet

## Requirements

### Requirement 1: Landing Page Display

**User Story:** As a user, I want to see a visually appealing landing page when I first visit the website, so that I understand the branding and purpose of the application.

#### Acceptance Criteria

1. WHEN a user visits the website, THE Landing_Page SHALL display the logo image from `/public/logos_demo.png` at the top center of the screen
2. WHEN a user visits the website, THE Landing_Page SHALL display a welcome message below the logo
3. THE Landing_Page SHALL use a dark background color (#1a1a2e or similar dark theme)
4. THE Landing_Page SHALL use Pixelify Sans font for all text elements
5. THE Landing_Page SHALL be optimized for mobile-first display with responsive design

### Requirement 2: Wallet Connection Button

**User Story:** As a user, I want to connect my wallet easily, so that I can access the application features.

#### Acceptance Criteria

1. THE Landing_Page SHALL display a primary "Connect & Play" button prominently in the center
2. WHEN a user clicks the "Connect & Play" button, THE Wallet_Connection SHALL initiate the wallet connection modal
3. THE "Connect & Play" button SHALL have a blue background color with white text and rounded corners
4. THE Landing_Page SHALL display a "use another wallet" link below the primary button for alternative wallet options

### Requirement 3: Wallet Recommendation Section

**User Story:** As a new user without a wallet, I want to see wallet recommendations, so that I can easily get started with the application.

#### Acceptance Criteria

1. THE Landing_Page SHALL display a section with text "...or don't have a wallet yet?"
2. THE Landing_Page SHALL recommend Coinbase Smart Wallet with a clickable link
3. THE recommendation text SHALL explain the benefits: lower transaction costs, convenience, and stronger security

### Requirement 4: Successful Login Navigation

**User Story:** As a user who has connected my wallet, I want to be redirected to the home page, so that I can start using the application.

#### Acceptance Criteria

1. WHEN a user successfully connects their wallet, THE System SHALL redirect the user to the Home_Page
2. WHEN wallet connection fails, THE System SHALL display an error state and allow retry
3. WHILE wallet connection is in progress, THE Landing_Page SHALL display a loading indicator

### Requirement 5: Mobile-First PWA Design

**User Story:** As a mobile user, I want the application to work well on my device, so that I have a native-like experience.

#### Acceptance Criteria

1. THE Landing_Page SHALL be designed mobile-first with a maximum width constraint for larger screens
2. THE Landing_Page SHALL have proper viewport meta tags for PWA compatibility
3. THE Landing_Page SHALL center content vertically and horizontally on the screen
4. THE Landing_Page SHALL have a border/frame effect similar to the reference design (rounded corners with subtle border)

### Requirement 6: Typography and Styling

**User Story:** As a user, I want consistent pixel art styling, so that the application feels cohesive and unique.

#### Acceptance Criteria

1. THE Landing_Page SHALL import and use Pixelify Sans font from Google Fonts
2. THE welcome message SHALL use a warm/cream color (#f5f5dc or similar) for text
3. THE secondary text SHALL use appropriate contrast against the dark background
4. THE "use another wallet" link SHALL be styled in yellow/gold color (#ffd700 or similar)
5. THE Coinbase Smart Wallet link SHALL be styled in blue color to indicate it's clickable
