import { render, screen } from '@testing-library/react';
import Home from '../page';

// Mock wagmi
const mockUseAccount = jest.fn();
jest.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
}));

// Mock MiniKit
jest.mock('@coinbase/onchainkit/minikit', () => ({
  useMiniKit: () => ({
    setMiniAppReady: jest.fn(),
    isMiniAppReady: true,
  }),
}));

// Mock components
jest.mock('../components/LandingContent', () => ({
  LandingContent: () => <div data-testid="landing-content">Landing Content</div>,
}));

jest.mock('../components/HomeRedirect', () => ({
  HomeRedirect: () => <div data-testid="home-redirect">Home Redirect</div>,
}));

jest.mock('../components/LoadingState', () => ({
  LoadingState: () => <div data-testid="loading-state">Loading State</div>,
}));

describe('Home Page', () => {
  beforeEach(() => {
    mockUseAccount.mockClear();
  });

  /**
   * Property 2: Landing Page Element Presence
   * For any initial page load when wallet is disconnected, the landing page 
   * SHALL contain all required elements.
   * 
   * Validates: Requirements 1.1, 1.2, 2.1, 2.4, 3.1, 3.2, 3.3
   */
  it('renders LandingContent when wallet is disconnected', () => {
    mockUseAccount.mockReturnValue({
      isConnected: false,
      isConnecting: false,
    });

    render(<Home />);
    expect(screen.getByTestId('landing-content')).toBeInTheDocument();
  });

  /**
   * Property 3: Loading State Display
   * For any wallet connection attempt in progress, the landing page SHALL 
   * display a loading indicator.
   * 
   * Validates: Requirements 4.3
   */
  it('renders LoadingState when wallet is connecting', () => {
    mockUseAccount.mockReturnValue({
      isConnected: false,
      isConnecting: true,
    });

    render(<Home />);
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
  });

  /**
   * Property 1: Wallet Connection Redirect
   * For any successful wallet connection event, the system SHALL redirect 
   * the user to the Home page.
   * 
   * Validates: Requirements 4.1
   */
  it('renders HomeRedirect when wallet is connected', () => {
    mockUseAccount.mockReturnValue({
      isConnected: true,
      isConnecting: false,
    });

    render(<Home />);
    expect(screen.getByTestId('home-redirect')).toBeInTheDocument();
  });
});
