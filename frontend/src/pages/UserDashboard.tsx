import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { ArrowLeft, Clock, Trash2, Star } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useOrderStore } from '../store/useOrderStore';

interface OrderItem {
  id: number;
  quantity_kg: number;
  price_at_buy: number;
  fish_id: number;
  fish: any; // Flexible for array or object from Supabase
}

interface Order {
  id: number;
  total_amount: number;
  status: string;
  created_at: string;
  order_items: OrderItem[];
}

export default function UserDashboard() {
  const { user } = useAuthStore();
  const { decrementCount } = useOrderStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);



  // Rating Modal State
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [ratingData, setRatingData] = useState({
    order_id: 0,
    fish_name: '',
    rating: 5,
    comment: '',
    merchant_id: null as number | null,
    imageFile: null as File | null
  });
  const [merchants, setMerchants] = useState<any[]>([]);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  useEffect(() => {
    const fetchMerchants = async () => {
      const { data } = await supabase.from('merchants').select('id, name');
      if (data) setMerchants(data);
    };
    fetchMerchants();
  }, []);

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, 
          total_amount, 
          status, 
          created_at,
          order_items(id, quantity_kg, price_at_buy, fish_id, fish(name, image_url))
        `)
        .eq('user_id', user.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data as Order[] || []);
    } catch (error) {
      console.error('Gagal mengambil histori:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    
    const channel = supabase.channel('user_orders_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user?.id}` }, () => {
        fetchHistory();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);



  const handleCancelOrder = async (order: Order) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus pesanan ini secara permanen?")) return;
    const orderId = order.id;
    setLoading(true);
    try {
      for (const item of order.order_items) {
        if (item.fish_id) {
          const { data: fish } = await supabase.from('fish').select('stock_kg').eq('id', item.fish_id).single();
          if (fish) {
            await supabase.from('fish').update({ stock_kg: fish.stock_kg + item.quantity_kg }).eq('id', item.fish_id);
          }
        }
      }
      await supabase.from('order_items').delete().eq('order_id', orderId);
      await supabase.from('orders').delete().eq('id', orderId);
      alert('✅ Pesanan Anda telah dihapus permanen.');
      fetchHistory();
      if (decrementCount) decrementCount();
    } catch (err: any) {
      alert('Gagal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!ratingData.merchant_id) {
      alert('⚠️ Mohon pilih pedagang terlebih dahulu.');
      return;
    }
    
    setIsSubmittingRating(true);
    try {
      let finalImageUrl = null; // Use null for empty image

      // Only upload if file exists
      if (ratingData.imageFile) {
        const file = ratingData.imageFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `review-proofs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('fish-images')
          .upload(filePath, file);

        if (uploadError) throw new Error('Gagal upload foto: ' + uploadError.message);

        const { data: urlData } = supabase.storage
          .from('fish-images')
          .getPublicUrl(filePath);
        
        finalImageUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase.from('reviews').insert({
        user_id: user.id,
        order_id: ratingData.order_id,
        merchant_id: ratingData.merchant_id,
        fish_name: ratingData.fish_name,
        rating: ratingData.rating,
        comment: ratingData.comment,
        image_url: finalImageUrl
      });

      if (insertError) throw new Error('Gagal simpan ulasan: ' + insertError.message);

      alert('✅ Ulasan Anda berhasil terkirim!');
      setIsRatingModalOpen(false);
      setRatingData({ order_id: 0, fish_name: '', rating: 5, comment: '', merchant_id: null, imageFile: null });
    } catch (err: any) {
      console.error(err);
      alert('❌ Terjadi kesalahan: ' + err.message);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleSelection = (orderId: number) => {
    setSelectedIds(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Hapus permanen ${selectedIds.length} pesanan terpilih?`)) return;
    setLoading(true);
    try {
      const ordersToCancel = orders.filter(o => selectedIds.includes(o.id));
      for (const order of ordersToCancel) {
        for (const item of order.order_items) {
          if (item.fish_id) {
            const { data: fish } = await supabase.from('fish').select('stock_kg').eq('id', item.fish_id).single();
            if (fish) await supabase.from('fish').update({ stock_kg: fish.stock_kg + item.quantity_kg }).eq('id', item.fish_id);
          }
        }
      }
      await supabase.from('order_items').delete().in('order_id', selectedIds);
      await supabase.from('orders').delete().in('id', selectedIds);
      alert(`✅ ${selectedIds.length} pesanan berhasil dihapus.`);
      setIsSelectionMode(false);
      setSelectedIds([]);
      fetchHistory();
    } catch (err: any) {
      alert('Gagal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <button onClick={() => navigate('/')} className="btn-outline" style={{ marginBottom: '12px', padding: '8px 16px' }}>
            <ArrowLeft size={16} /> Kembali ke Bursa
          </button>
          <h1 style={{ background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '2rem', fontWeight: 800 }}>Riwayat Pesanan Saya</h1>

        </div>
        <div>
          {!isSelectionMode ? (
            <button onClick={() => setIsSelectionMode(true)} className="btn-primary">Pilih untuk Dihapus</button>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }} className="btn-outline">Batal</button>
              {selectedIds.length > 0 && <button onClick={handleBulkDelete} className="btn-danger">Hapus ({selectedIds.length})</button>}
            </div>
          )}
        </div>
      </header>

      {loading && orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px' }}><div className="spinner"></div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {orders.length === 0 ? (
            <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada pesanan.</p>
          ) : (
            orders.map(order => (
              <div key={order.id} className="glass-panel" onClick={() => isSelectionMode && toggleSelection(order.id)} style={{ padding: '24px', position: 'relative', border: selectedIds.includes(order.id) ? '2px solid #FB923C' : '1px solid rgba(255,255,255,0.1)', cursor: isSelectionMode ? 'pointer' : 'default' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>#ORDER {order.id}</span>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}><Clock size={12} /> {new Date(order.created_at).toLocaleDateString('id-ID')}</p>
                  </div>
                </div>

                {order.order_items.map(item => {
                  const fishData = Array.isArray(item.fish) ? item.fish[0] : item.fish;
                  return (
                    <div key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <p style={{ margin: 0, fontWeight: 700 }}>{fishData?.name || 'Ikan'}</p>
                        <p style={{ margin: 0, color: 'var(--accent-color)', fontWeight: 700 }}>Rp {(item.quantity_kg * item.price_at_buy).toLocaleString('id-ID')}</p>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.quantity_kg}kg x Rp {item.price_at_buy.toLocaleString('id-ID')}</p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setRatingData({ ...ratingData, order_id: order.id, fish_name: fishData?.name || 'Ikan' }); setIsRatingModalOpen(true); }}
                        style={{ width: '100%', marginTop: '8px', padding: '6px', fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', border: '1px dashed #38BDF8', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        <Star size={12} fill="#38BDF8" style={{ marginRight: '4px' }} /> Beri Rating
                      </button>
                    </div>
                  );
                })}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total</p>
                    <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>Rp {Number(order.total_amount).toLocaleString('id-ID')}</h3>
                  </div>
                  {!isSelectionMode && (
                    <button onClick={(e) => { e.stopPropagation(); handleCancelOrder(order); }} style={{ background: 'transparent', border: 'none', color: '#F43F5E', cursor: 'pointer' }}><Trash2 size={18} /></button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {isRatingModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '32px', borderRadius: '24px' }}>
            <h2 style={{ marginBottom: '8px' }}>Beri Rating</h2>
            <p style={{ color: '#64748B', marginBottom: '20px' }}>{ratingData.fish_name}</p>
            <form onSubmit={submitRating} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {[1,2,3,4,5].map(s => <Star key={s} size={28} onClick={() => setRatingData({...ratingData, rating: s})} fill={s <= ratingData.rating ? "#FBBF24" : "transparent"} color="#FBBF24" style={{ cursor: 'pointer' }} />)}
              </div>
              <select 
                required 
                value={ratingData.merchant_id || ''}
                onChange={e => {
                  const val = e.target.value;
                  setRatingData({...ratingData, merchant_id: val ? parseInt(val) : null});
                }} 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '10px', 
                  background: 'rgba(56, 189, 248, 0.1)', 
                  color: '#38BDF8', 
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  fontWeight: 600
                }}
              >
                <option value="" style={{ background: '#0f172a' }}>Pilih Pedagang...</option>
                {merchants.map(m => <option key={m.id} value={m.id} style={{ background: '#0f172a' }}>{m.name}</option>)}
              </select>
              <textarea 
                required 
                placeholder="Tulis ulasan Anda di sini..." 
                value={ratingData.comment}
                onChange={e => setRatingData({...ratingData, comment: e.target.value})} 
                style={{ 
                  width: '100%',
                  padding: '12px', 
                  borderRadius: '10px', 
                  background: 'rgba(255,255,255,0.05)', 
                  color: 'white', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  minHeight: '100px',
                  resize: 'none',
                  fontSize: '0.95rem'
                }} 
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', color: '#64748B' }}>Unggah Foto Bukti (Opsional)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => setRatingData({...ratingData, imageFile: e.target.files?.[0] || null})} 
                  style={{ fontSize: '0.8rem', color: '#64748B' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsRatingModalOpen(false)} className="btn-outline" style={{ flex: 1 }}>Batal</button>
                <button type="submit" disabled={isSubmittingRating} className="btn-primary" style={{ flex: 1 }}>
                  {isSubmittingRating ? 'Mengirim...' : 'Kirim Ulasan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
