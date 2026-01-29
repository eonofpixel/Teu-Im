import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';

/**
 * Initialize auth state from Supabase on app startup
 * and listen for auth state changes
 */
export function useAuthInit() {
  const setUser = useAppStore((state) => state.setUser);
  const reset = useAppStore((state) => state.reset);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Prevent double initialization in strict mode
    if (isInitialized.current) return;
    isInitialized.current = true;

    // 1. Check for existing session on startup
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
          return;
        }

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email ?? '',
            createdAt: session.user.created_at ?? new Date().toISOString(),
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
      }
    };

    // Initialize on mount
    initializeAuth();

    // 2. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);

        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            if (session?.user) {
              setUser({
                id: session.user.id,
                email: session.user.email ?? '',
                createdAt: session.user.created_at ?? new Date().toISOString(),
              });
            }
            break;

          case 'SIGNED_OUT':
            reset(); // Clear all app state on sign out
            break;

          case 'USER_UPDATED':
            if (session?.user) {
              setUser({
                id: session.user.id,
                email: session.user.email ?? '',
                createdAt: session.user.created_at ?? new Date().toISOString(),
              });
            }
            break;
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, reset]);
}
