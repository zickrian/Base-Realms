import { render, screen } from '@testing-library/react';
import { LandingContent } from '../LandingContent';

// Mock OnchainKit wallet components
jest.mock('@coinbase/onchainkit/wallet', () => ({
  Wallet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ConnectWallet: ({ disconnectedLabel, className }: { disconnectedLabel: string; className: string }) => (
    <button className={className}>{disconnectedLabel}</button>
  ),
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} className={props.className} />
  ),
}));

describe('LandingContent', () => {
  it('renders logo image', () => {
    render(<LandingContent />);
    const logo = screen.getByAltText('Logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/logos_demo.png');
  });

  it('renders welcome message', () => {
    render(<LandingContent />);
    expect(screen.getByText('Welcome to the Game!')).toBeInTheDocument();
    expect(screen.getByText('Connect your wallet to start playing')).toBeInTheDocument();
  });

  it('renders Connect & Play button', () => {
    render(<LandingContent />);
    expect(screen.getByText('Connect & Play')).toBeInTheDocument();
  });

  it('renders alternative wallet link', () => {
    render(<LandingContent />);
    expect(screen.getByText('use another wallet')).toBeInTheDocument();
  });

  it('renders wallet recommendation section', () => {
    render(<LandingContent />);
    expect(screen.getByText("...or don't have a wallet yet?")).toBeInTheDocument();
    expect(screen.getByText('Coinbase Smart Wallet')).toBeInTheDocument();
    expect(screen.getByText('Lower transaction costs, convenience, and stronger security')).toBeInTheDocument();
  });

  it('has correct link to Coinbase Wallet', () => {
    render(<LandingContent />);
    const coinbaseLink = screen.getByText('Coinbase Smart Wallet');
    expect(coinbaseLink).toHaveAttribute('href', 'https://www.coinbase.com/wallet');
    expect(coinbaseLink).toHaveAttribute('target', '_blank');
    expect(coinbaseLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
