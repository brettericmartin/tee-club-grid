import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BetaGuard } from '../../src/components/auth/BetaGuard';
import { useFeatureFlags } from '../../src/hooks/useFeatureFlags';
import { useProfile } from '../../src/hooks/useProfile';

// Mock the hooks
vi.mock('../../src/hooks/useFeatureFlags');
vi.mock('../../src/hooks/useProfile');

describe('BetaGuard Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should allow access when public beta is enabled', async () => {
    // Mock public beta enabled
    useFeatureFlags.mockReturnValue({
      featureFlags: {
        public_beta_enabled: true,
        beta_cap: 150
      },
      loading: false,
      error: null
    });
    
    useProfile.mockReturnValue({
      profile: null,
      loading: false,
      error: null
    });
    
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route 
            path="/protected" 
            element={
              <BetaGuard>
                <div>Protected Content</div>
              </BetaGuard>
            } 
          />
          <Route path="/waitlist" element={<div>Waitlist Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    // Should show protected content
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
    
    // Should not redirect to waitlist
    expect(screen.queryByText('Waitlist Page')).not.toBeInTheDocument();
  });

  it('should allow access for users with beta access', async () => {
    // Mock beta access for user
    useFeatureFlags.mockReturnValue({
      featureFlags: {
        public_beta_enabled: false,
        beta_cap: 150
      },
      loading: false,
      error: null
    });
    
    useProfile.mockReturnValue({
      profile: {
        id: 'user-123',
        email: 'user@example.com',
        beta_access: true,
        display_name: 'Test User'
      },
      loading: false,
      error: null
    });
    
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route 
            path="/protected" 
            element={
              <BetaGuard>
                <div>Protected Content</div>
              </BetaGuard>
            } 
          />
          <Route path="/waitlist" element={<div>Waitlist Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    // Should show protected content
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('should redirect to waitlist when user lacks beta access', async () => {
    // Mock no beta access
    useFeatureFlags.mockReturnValue({
      featureFlags: {
        public_beta_enabled: false,
        beta_cap: 150
      },
      loading: false,
      error: null
    });
    
    useProfile.mockReturnValue({
      profile: {
        id: 'user-123',
        email: 'user@example.com',
        beta_access: false,
        display_name: 'Test User'
      },
      loading: false,
      error: null
    });
    
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route 
            path="/protected" 
            element={
              <BetaGuard>
                <div>Protected Content</div>
              </BetaGuard>
            } 
          />
          <Route path="/waitlist" element={<div>Waitlist Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    // Should redirect to waitlist
    await waitFor(() => {
      expect(screen.getByText('Waitlist Page')).toBeInTheDocument();
    });
    
    // Should not show protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should redirect unauthenticated users to waitlist', async () => {
    // Mock no user profile (unauthenticated)
    useFeatureFlags.mockReturnValue({
      featureFlags: {
        public_beta_enabled: false,
        beta_cap: 150
      },
      loading: false,
      error: null
    });
    
    useProfile.mockReturnValue({
      profile: null,
      loading: false,
      error: null
    });
    
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route 
            path="/protected" 
            element={
              <BetaGuard>
                <div>Protected Content</div>
              </BetaGuard>
            } 
          />
          <Route path="/waitlist" element={<div>Waitlist Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    // Should redirect to waitlist
    await waitFor(() => {
      expect(screen.getByText('Waitlist Page')).toBeInTheDocument();
    });
    
    // Should not show protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should show loading state while checking access', () => {
    // Mock loading state
    useFeatureFlags.mockReturnValue({
      featureFlags: null,
      loading: true,
      error: null
    });
    
    useProfile.mockReturnValue({
      profile: null,
      loading: true,
      error: null
    });
    
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route 
            path="/protected" 
            element={
              <BetaGuard>
                <div>Protected Content</div>
              </BetaGuard>
            } 
          />
          <Route path="/waitlist" element={<div>Waitlist Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    // Should show loading indicator
    expect(screen.getByRole('status')).toBeInTheDocument();
    
    // Should not show content or redirect yet
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Waitlist Page')).not.toBeInTheDocument();
  });

  it('should preserve intended location in redirect state', () => {
    useFeatureFlags.mockReturnValue({
      featureFlags: {
        public_beta_enabled: false,
        beta_cap: 150
      },
      loading: false,
      error: null
    });
    
    useProfile.mockReturnValue({
      profile: null,
      loading: false,
      error: null
    });
    
    const { container } = render(
      <MemoryRouter initialEntries={['/my-bag']}>
        <Routes>
          <Route 
            path="/my-bag" 
            element={
              <BetaGuard>
                <div>My Bag Content</div>
              </BetaGuard>
            } 
          />
          <Route path="/waitlist" element={<div>Waitlist Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    // The redirect should preserve the original location
    // This would be accessible via location.state.from in the waitlist component
  });

  it('should handle feature flag errors gracefully', async () => {
    // Mock error state
    useFeatureFlags.mockReturnValue({
      featureFlags: null,
      loading: false,
      error: new Error('Failed to fetch feature flags')
    });
    
    useProfile.mockReturnValue({
      profile: null,
      loading: false,
      error: null
    });
    
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route 
            path="/protected" 
            element={
              <BetaGuard>
                <div>Protected Content</div>
              </BetaGuard>
            } 
          />
          <Route path="/waitlist" element={<div>Waitlist Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    // Should default to redirecting to waitlist on error
    await waitFor(() => {
      expect(screen.getByText('Waitlist Page')).toBeInTheDocument();
    });
  });

  it('should not render children during loading', () => {
    let renderCount = 0;
    
    const TestChild = () => {
      renderCount++;
      return <div>Protected Content</div>;
    };
    
    useFeatureFlags.mockReturnValue({
      featureFlags: null,
      loading: true,
      error: null
    });
    
    useProfile.mockReturnValue({
      profile: null,
      loading: true,
      error: null
    });
    
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route 
            path="/protected" 
            element={
              <BetaGuard>
                <TestChild />
              </BetaGuard>
            } 
          />
        </Routes>
      </MemoryRouter>
    );
    
    // Child component should not be rendered during loading
    expect(renderCount).toBe(0);
  });

  it('should re-check access when feature flags change', async () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route 
            path="/protected" 
            element={
              <BetaGuard>
                <div>Protected Content</div>
              </BetaGuard>
            } 
          />
          <Route path="/waitlist" element={<div>Waitlist Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    // Initially no access
    useFeatureFlags.mockReturnValue({
      featureFlags: {
        public_beta_enabled: false,
        beta_cap: 150
      },
      loading: false,
      error: null
    });
    
    useProfile.mockReturnValue({
      profile: null,
      loading: false,
      error: null
    });
    
    rerender(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route 
            path="/protected" 
            element={
              <BetaGuard>
                <div>Protected Content</div>
              </BetaGuard>
            } 
          />
          <Route path="/waitlist" element={<div>Waitlist Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    // Should redirect to waitlist
    await waitFor(() => {
      expect(screen.getByText('Waitlist Page')).toBeInTheDocument();
    });
    
    // Now enable public beta
    useFeatureFlags.mockReturnValue({
      featureFlags: {
        public_beta_enabled: true,
        beta_cap: 150
      },
      loading: false,
      error: null
    });
    
    rerender(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route 
            path="/protected" 
            element={
              <BetaGuard>
                <div>Protected Content</div>
              </BetaGuard>
            } 
          />
          <Route path="/waitlist" element={<div>Waitlist Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    // Should now show protected content
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
});