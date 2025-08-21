/**
 * Cloudflare Turnstile CAPTCHA Wrapper Component
 * Privacy-focused alternative to reCAPTCHA
 */

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    turnstile: any;
  }
}

interface TurnstileWrapperProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  appearance?: 'always' | 'execute' | 'interaction-only';
  enabled?: boolean;
}

export const TurnstileWrapper: React.FC<TurnstileWrapperProps> = ({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = 'dark',
  size = 'normal',
  appearance = 'interaction-only',
  enabled = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      // If CAPTCHA is disabled, immediately call onVerify with a bypass token
      onVerify('bypass-token-captcha-disabled');
      return;
    }

    // Load Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setIsLoading(false);
      if (containerRef.current && window.turnstile) {
        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: theme,
            size: size,
            appearance: appearance,
            callback: (token: string) => {
              console.log('[Turnstile] Verification successful');
              onVerify(token);
            },
            'error-callback': () => {
              console.error('[Turnstile] Error occurred');
              setError('CAPTCHA verification failed. Please try again.');
              onError?.('CAPTCHA verification failed');
            },
            'expired-callback': () => {
              console.log('[Turnstile] Token expired');
              onExpire?.();
            }
          });
        } catch (err) {
          console.error('[Turnstile] Render error:', err);
          setError('Failed to load CAPTCHA. Please refresh the page.');
          onError?.('Failed to load CAPTCHA');
        }
      }
    };

    script.onerror = () => {
      console.error('[Turnstile] Failed to load script');
      setIsLoading(false);
      setError('Failed to load CAPTCHA. Please check your connection.');
      onError?.('Failed to load Turnstile script');
    };

    document.body.appendChild(script);

    // Cleanup
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (err) {
          console.error('[Turnstile] Cleanup error:', err);
        }
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [siteKey, theme, size, appearance, enabled, onVerify, onError, onExpire]);

  // Reset the widget
  const reset = () => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  };

  // If disabled, don't render anything
  if (!enabled) {
    return null;
  }

  return (
    <div className="turnstile-wrapper">
      {isLoading && (
        <div className="flex items-center justify-center p-4 bg-white/5 rounded-lg border border-white/10">
          <Loader2 className="w-5 h-5 animate-spin text-white/60 mr-2" />
          <span className="text-white/60 text-sm">Loading security check...</span>
        </div>
      )}
      
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-2">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      
      <div 
        ref={containerRef} 
        className={`turnstile-container ${isLoading ? 'hidden' : ''}`}
      />
    </div>
  );
};

/**
 * Hook to check if CAPTCHA should be enabled based on feature flags
 */
export function useTurnstileEnabled(): { enabled: boolean; siteKey: string | null } {
  const [enabled, setEnabled] = useState(false);
  const [siteKey, setSiteKey] = useState<string | null>(null);

  useEffect(() => {
    // Check environment variables
    const envSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || 
                      process.env.VITE_TURNSTILE_SITE_KEY;
    
    if (envSiteKey) {
      setSiteKey(envSiteKey);
      
      // TODO: Check feature flags from Supabase
      // For now, use environment variable
      const captchaEnabled = process.env.NEXT_PUBLIC_CAPTCHA_ENABLED === 'true' ||
                            process.env.VITE_CAPTCHA_ENABLED === 'true';
      setEnabled(captchaEnabled);
    }
  }, []);

  return { enabled, siteKey };
}

/**
 * Server-side verification function (to be called from API endpoint)
 */
export async function verifyTurnstileToken(
  token: string,
  secretKey: string,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  // Bypass token for when CAPTCHA is disabled
  if (token === 'bypass-token-captcha-disabled') {
    return { success: true };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    } else {
      console.error('[Turnstile] Verification failed:', data['error-codes']);
      return { 
        success: false, 
        error: data['error-codes']?.join(', ') || 'Verification failed' 
      };
    }
  } catch (error) {
    console.error('[Turnstile] Verification error:', error);
    return { 
      success: false, 
      error: 'Failed to verify CAPTCHA token' 
    };
  }
}