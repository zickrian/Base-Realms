# Implementation Plan: Wallet Login Landing Page

## Overview

Implementasi landing page mobile-first PWA dengan desain pixel art style menggunakan OnchainKit untuk wallet connection. Fokus pada landing page dan flow login, dengan home page kosong untuk sementara.

## Tasks

- [x] 1. Setup font dan global styles
  - [x] 1.1 Configure Pixelify Sans font di layout.tsx
    - Import font dari next/font/google
    - Set CSS variable --font-pixelify
    - Apply font ke body
    - _Requirements: 1.4, 6.1_

  - [x] 1.2 Update globals.css dengan dark theme dan color palette
    - Set background color #1a1a2e
    - Define CSS variables untuk colors
    - Add mobile-first base styles
    - _Requirements: 1.3, 5.1, 5.3_

- [x] 2. Create LandingContent component
  - [x] 2.1 Create app/components/LandingContent.tsx
    - Create component structure dengan logo, welcome message, button sections
    - Import dan display logos_demo.png
    - Add welcome message text
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Style LandingContent dengan CSS modules
    - Create LandingContent.module.css
    - Style container dengan border/frame effect
    - Center content vertically dan horizontally
    - Apply Pixelify Sans font
    - Style welcome message dengan cream color
    - _Requirements: 5.3, 5.4, 6.2_

  - [x] 2.3 Add Connect & Play button dengan OnchainKit
    - Import Wallet dan ConnectWallet dari OnchainKit
    - Style button dengan blue background, white text, rounded corners
    - Set disconnectedLabel="Connect & Play"
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.4 Add "use another wallet" link
    - Add link below connect button
    - Style dengan yellow/gold color
    - _Requirements: 2.4, 6.4_

  - [x] 2.5 Add wallet recommendation section
    - Add "...or don't have a wallet yet?" text
    - Add Coinbase Smart Wallet link dengan blue color
    - Add benefit description text
    - _Requirements: 3.1, 3.2, 3.3, 6.5_

  - [x] 2.6 Write unit tests for LandingContent
    - Test semua elemen render dengan benar
    - Test styling classes applied
    - _Requirements: 1.1, 1.2, 2.1, 2.4, 3.1, 3.2_

- [x] 3. Create HomeRedirect component
  - [x] 3.1 Create app/components/HomeRedirect.tsx
    - Create component yang redirect ke /home
    - Use Next.js useRouter untuk navigation
    - _Requirements: 4.1_

  - [x] 3.2 Write property test for redirect behavior
    - **Property 1: Wallet Connection Redirect**
    - **Validates: Requirements 4.1**

- [x] 4. Create Home page
  - [x] 4.1 Create app/home/page.tsx
    - Create empty home page component
    - Add basic container styling
    - _Requirements: 4.1_

- [x] 5. Update main page dengan Connected component
  - [x] 5.1 Update app/page.tsx
    - Import Connected dari OnchainKit
    - Import LandingContent dan HomeRedirect
    - Setup conditional rendering dengan Connected
    - Add loading state untuk connecting
    - _Requirements: 4.1, 4.3_

  - [x] 5.2 Create loading state component
    - Create simple loading indicator
    - Style sesuai dengan theme
    - _Requirements: 4.3_

  - [x] 5.3 Write integration test for full flow
    - Test landing page renders when disconnected
    - Test loading state during connection
    - Test redirect after connection
    - _Requirements: 4.1, 4.3_

- [x] 6. Update RootProvider configuration
  - [x] 6.1 Update app/rootProvider.tsx
    - Set appearance mode ke dark
    - Configure wallet display modal
    - _Requirements: 2.2_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Final styling dan polish
  - [x] 8.1 Verify mobile-first responsive design
    - Test pada berbagai viewport sizes
    - Ensure max-width constraint untuk larger screens
    - _Requirements: 1.5, 5.1_

  - [x] 8.2 Add PWA meta tags di layout
    - Add viewport meta tag
    - Add theme-color meta tag
    - _Requirements: 5.2_

- [ ] 9. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Home page sengaja dikosongkan sesuai request, fokus di landing/login flow
