import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
}

interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
  setUser: (user: User | null, session: any | null) => void;
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
      
      set({ 
        session, 
        user: profile ? { id: profile.id, name: profile.name, email: session.user.email!, role: profile.role, phone: session.user.user_metadata?.phone || '' } : null,
        loading: false 
      });
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
        set({ 
          session, 
          user: profile ? { id: profile.id, name: profile.name, email: session.user.email!, role: profile.role, phone: session.user.user_metadata?.phone || '' } : null,
          loading: false 
        });
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

