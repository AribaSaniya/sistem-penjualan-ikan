import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

interface OrderStore {
  activeOrderCount: number;
  fetchCount: (userId: string) => Promise<void>;
  decrementCount: () => void;
  incrementCount: () => void;
}

export const useOrderStore = create<OrderStore>((set) => ({
  activeOrderCount: 0,
  fetchCount: async (userId: string) => {
    if (!userId) return;
    try {
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .neq('status', 'cancelled');
      
      if (!error) {
        set({ activeOrderCount: count || 0 });
      }
    } catch (err) {
      console.error('Error fetching order count:', err);
    }
  },
  decrementCount: () => set((state) => ({ activeOrderCount: Math.max(0, state.activeOrderCount - 1) })),
  incrementCount: () => set((state) => ({ activeOrderCount: state.activeOrderCount + 1 })),
}));
