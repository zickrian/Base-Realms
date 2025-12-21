import { render } from '@testing-library/react';
import { HomeRedirect } from '../HomeRedirect';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('HomeRedirect', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  /**
   * Property 1: Wallet Connection Redirect
   * For any successful wallet connection event, the system SHALL redirect 
   * the user to the Home page within a reasonable time frame.
   * 
   * Validates: Requirements 4.1
   */
  it('redirects to /home when rendered', () => {
    render(<HomeRedirect />);
    expect(mockPush).toHaveBeenCalledWith('/home');
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('displays redirecting message while navigating', () => {
    const { getByText } = render(<HomeRedirect />);
    expect(getByText('Redirecting...')).toBeInTheDocument();
  });
});
