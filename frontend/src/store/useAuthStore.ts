import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

import type { Session } from '@supabase/supabase-js';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  setUser: (user: User | null, session: Session | null) => void;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  setUser: (user, session) => set({ user, session, loading: false }),
  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      const userData = {
        id: session.user.id,
        name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email!,
        role: session.user.email === 'pengelolatpi@gmail.com' ? 'admin' : (profile?.role || session.user.user_metadata?.role || 'user'),
        phone: profile?.phone || session.user.user_metadata?.phone || ''
      };

      set({ session, user: userData, loading: false });
    } else {
      set({ session: null, user: null, loading: false });
    }
    
    // Listen for changes
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        const userData = {
          id: session.user.id,
          name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email!,
          role: session.user.email === 'pengelolatpi@gmail.com' ? 'admin' : (profile?.role || session.user.user_metadata?.role || 'user'),
          phone: profile?.phone || session.user.user_metadata?.phone || ''
        };

        set({ session, user: userData, loading: false });
      } else {
        set({ session: null, user: null, loading: false });
      }
    });
  },
  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));

