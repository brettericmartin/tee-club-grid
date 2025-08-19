import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface PersistenceOptions {
  key: string;
  expirationMinutes?: number;
  clearOnSuccess?: boolean;
}

interface PersistedData<T> {
  data: T;
  timestamp: number;
  userId?: string;
}

export function useFormPersistence<T>(
  initialState: T,
  options: PersistenceOptions
) {
  const { key, expirationMinutes = 30, clearOnSuccess = true } = options;
  const [state, setState] = useState<T>(initialState);
  const [hasPersistedData, setHasPersistedData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Generate a unique storage key per user
  const getStorageKey = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user ? `${key}_${user.id}` : key;
  }, [key]);

  // Load persisted data on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const storageKey = await getStorageKey();
        const stored = sessionStorage.getItem(storageKey);
        
        if (stored) {
          const parsed: PersistedData<T> = JSON.parse(stored);
          const now = Date.now();
          const expirationTime = expirationMinutes * 60 * 1000;
          
          // Check if data has expired
          if (now - parsed.timestamp < expirationTime) {
            // Verify it's for the current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!parsed.userId || parsed.userId === user?.id) {
              setState(parsed.data);
              setHasPersistedData(true);
            }
          } else {
            // Clear expired data
            sessionStorage.removeItem(storageKey);
          }
        }
      } catch (error) {
        console.error('Error loading persisted form data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPersistedData();
  }, [getStorageKey, expirationMinutes]);

  // Save state to sessionStorage
  const persistState = useCallback(async (newState?: T) => {
    try {
      const storageKey = await getStorageKey();
      const { data: { user } } = await supabase.auth.getUser();
      const dataToSave = newState || state;
      
      const persistedData: PersistedData<T> = {
        data: dataToSave,
        timestamp: Date.now(),
        userId: user?.id
      };
      
      sessionStorage.setItem(storageKey, JSON.stringify(persistedData));
      setHasPersistedData(true);
    } catch (error) {
      console.error('Error persisting form data:', error);
    }
  }, [state, getStorageKey]);

  // Update state and persist
  const updateState = useCallback((newState: T | ((prev: T) => T)) => {
    setState(prev => {
      const updated = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(prev) 
        : newState;
      // Persist after state update
      setTimeout(() => persistState(updated), 0);
      return updated;
    });
  }, [persistState]);

  // Clear persisted data
  const clearPersistedData = useCallback(async () => {
    try {
      const storageKey = await getStorageKey();
      sessionStorage.removeItem(storageKey);
      setState(initialState);
      setHasPersistedData(false);
    } catch (error) {
      console.error('Error clearing persisted data:', error);
    }
  }, [getStorageKey, initialState]);

  // Clear on success if configured
  const handleSuccess = useCallback(async () => {
    if (clearOnSuccess) {
      await clearPersistedData();
    }
  }, [clearOnSuccess, clearPersistedData]);

  return {
    state,
    setState: updateState,
    persistState,
    clearPersistedData,
    handleSuccess,
    hasPersistedData,
    isLoading
  };
}