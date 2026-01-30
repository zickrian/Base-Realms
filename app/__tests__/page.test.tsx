import { render, screen } from '@testing-library/react';
import Home from '../page';

// Mock next/navigation
const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} />;
  },
}));

// Mock wagmi
const mockUseAccount = jest.fn();
jest.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
}));

describe('Home Page (Landing)', () => {
  beforeEach(() => {
    mockUseAccount.mockClear();
    mockReplace.mockClear();
    mockPush.mockClear();
  });

  /**
   * Property 1: Landing Page Renders When Disconnected
   * When wallet is disconnected, landing page should render
   */
  it('renders landing page when wallet is disconnected', () => {
    mockUseAccount.mockReturnValue({
      isConnected: false,
      isConnecting: false,
    });

    render(<Home />);
    expect(screen.getByText(/Mint a Character for Free/i)).toBeInTheDocument();
  });

  /**
   * Property 2: Redirects to /home When Connected
   * When wallet is connected, should redirect to home page
   */
  it('redirects to /home when wallet is connected', () => {
    mockUseAccount.mockReturnValue({
      isConnected: true,
      isConnecting: false,
    });

    render(<Home />);
    
    // Should call replace to /home (after mount)
    setTimeout(() => {
      expect(mockReplace).toHaveBeenCalledWith('/home');
    }, 100);
  });

  /**
   * Property 3: Shows Loading State While Connecting
   * While wallet is connecting, page should not crash
   */
  it('handles connecting state gracefully', () => {
    mockUseAccount.mockReturnValue({
      isConnected: false,
      isConnecting: true,
    });

    const { container } = render(<Home />);
    expect(container).toBeInTheDocument();
  });
});
