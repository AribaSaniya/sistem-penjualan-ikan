import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { X, MessageCircle, Smile, Leaf } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useOrderStore } from '../store/useOrderStore';


interface Fish {
  id: number;
  name: string;
  price_per_kg: number;
  stock_kg: number;
  image_url: string;
  is_sold_out: boolean;
}

export default function Home() {
  const { user } = useAuthStore();
  const { incrementCount } = useOrderStore();
  const navigate = useNavigate();
  const [fishes, setFishes] = useState<Fish[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [buyingFish, setBuyingFish] = useState<Fish | null>(null);
  const [qty, setQty] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // WA Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasReadChat, setHasReadChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [adminWaNumber, setAdminWaNumber] = useState('6281234567890');

  useEffect(() => {
    const fetchAdminPhone = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'admin')
          .limit(1);
          
        if (!error && data && data.length > 0) {
          // If phone exists in profiles, use it. Otherwise, check if we can get it from somewhere else.
          if (data[0].phone) {
            setAdminWaNumber(data[0].phone);
          }
        }
      } catch (err) {
        console.error('Error fetching admin phone:', err);
      }
    };
    fetchAdminPhone();
  }, []);

  const handleSendWa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    const url = `https://wa.me/${adminWaNumber}?text=${encodeURIComponent(chatMessage)}`;
    window.open(url, '_blank');
    setChatMessage('');
    setIsChatOpen(false);
  };

  
  // Removed unused orders and stats

  const fetchFishes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fish')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFishes(data || []);
    } catch (error) {
      console.error('Gagal mengambil data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFishes();
    
    // Realtime Sync
    const channel = supabase.channel('global_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fish' }, () => fetchFishes())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);


  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyingFish || !user) return;
    setIsProcessing(true);
    
    try {
      if (user.id.startsWith('dummy-')) {
        alert('Fitur Checkout tidak tersedia di Mode Dummy');
        setBuyingFish(null);
        setIsProcessing(false);
        return;
      }

      const { data, error } = await supabase.rpc('checkout_fish', {
        p_fish_id: buyingFish.id,
        p_qty: qty,
        p_user_id: user.id
      });

      if (error) throw error;
      if (data.status === 'error') throw new Error(data.message);
      if (qty <= 0) {
        alert('Jumlah pembelian tidak valid.');
        return;
      }

      incrementCount(); // Update badge instantly
      setBuyingFish(null);
      setQty(1);
      alert('Pesanan berhasil diproses!');
      // Navigasi ke Dashboard ditiadakan sesuai permintaan hapus bagian pesanan saya


    } catch (error: any) {
      alert(error.message || 'Gagal memproses pesanan.');
    } finally {
      setIsProcessing(false);
    }
  };



  return (
    <>
      {/* Main Content */}
      <div style={{ padding: '24px' }}>
        
        <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: '800' }}>Katalog Tangkapan Segar</h2>
            <p style={{ color: 'var(--text-muted)' }}>Halo, <strong>{user?.name}</strong>! Hasil laut terbaik hari ini, langsung dari jaring nelayan.</p>
          </div>
          <div style={{ minWidth: '300px' }}>
             <input 
              type="text" 
              placeholder="Cari ikan (misal: Kerapu)..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}
             />
          </div>
        </header>


        {loading ? (
          <p>Memuat bursa...</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', marginBottom: '48px' }}>
              {fishes.filter(f => !f.is_sold_out && f.stock_kg > 0 && f.name.toLowerCase().includes(searchTerm.toLowerCase())).map(fish => (
                <div 
                  key={fish.id} 
                  className="glass-panel float-card" 
                  style={{ 
                    borderRadius: '24px', 
                    padding: '20px', 
                    position: 'relative', 
                    overflow: 'hidden',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(20px)',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '320px'
                  }}
                >
                  {/* Decorative Subtle Wave */}
                  <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-30px',
                    width: '120px',
                    height: '120px',
                    background: 'rgba(0, 166, 188, 0.1)',
                    borderRadius: '50%',
                    zIndex: 0
                  }}></div>

                  <div style={{ zIndex: 2, marginBottom: '12px' }}>
                    <h3 style={{ 
                      fontSize: '1.4rem', 
                      fontWeight: 800, 
                      textTransform: 'uppercase', 
                      letterSpacing: '1px',
                      margin: 0,
                      color: 'white'
                    }}>
                      {fish.name}
                    </h3>
                  </div>

                  {/* Balanced Image Section */}
                  <div style={{ 
                    width: '100%',
                    height: '140px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    zIndex: 1,
                    marginBottom: '16px'
                  }}>
                    <img src={fish.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={fish.name} />
                  </div>

                  <div style={{ marginTop: 'auto', zIndex: 2 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--accent-color)', fontWeight: 'bold' }}>HARGA / KG</span>
                          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                            Rp {fish.price_per_kg.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                           <span style={{ fontSize: '0.7rem', display: 'block', color: 'rgba(255,255,255,0.4)' }}>STOK</span>
                           <span style={{ fontSize: '0.9rem', color: 'white', fontWeight: 'bold' }}>{fish.stock_kg} kg</span>
                        </div>
                     </div>
                     
                     <button 
                       className="btn-gold" 
                       onClick={() => setBuyingFish(fish)}
                       style={{ 
                         width: '100%',
                         borderRadius: '30px', 
                         padding: '10px 0', 
                         fontSize: '0.85rem',
                         textTransform: 'uppercase',
                         letterSpacing: '1.5px'
                       }}
                     >
                       Beli Sekarang
                     </button>
                  </div>

                  {/* LIQUID WAVE BOTTOM */}
                  <div style={{
                    position: 'absolute',
                    bottom: '-20px',
                    left: '-10px',
                    width: '120%',
                    height: '60px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '50%',
                    zIndex: 0,
                    transform: 'rotate(-2deg)'
                  }}></div>
                </div>
              ))}
            </div>

            <header style={{ marginBottom: '32px' }}>
              <h2>Ikan Terjual Habis</h2>
              <p style={{ color: 'var(--text-muted)' }}>Katalog ikan yang stoknya sudah habis hari ini.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
               {fishes.filter(f => f.is_sold_out && f.name.toLowerCase().includes(searchTerm.toLowerCase())).map(fish => (
                 <div key={fish.id} className="glass-panel" style={{ 
                   padding: '16px', 
                   display: 'flex', 
                   gap: '16px', 
                   alignItems: 'center',
                   opacity: 0.7,
                   filter: 'grayscale(0.5)'
                 }}>
                   <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden' }}>
                     <img src={fish.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Sold out" />
                   </div>
                   <div style={{ flex: 1 }}>
                     <h4 style={{ margin: 0 }}>{fish.name}</h4>
                     <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--danger-color)', fontWeight: 'bold' }}>Terjual Habis</p>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Harga Terakhir</p>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>Rp {fish.price_per_kg.toLocaleString('id-ID')}</p>
                   </div>
                 </div>
               ))}
            </div>
          </>
        )}
      </div>

      {/* Checkout Modal */}
      {buyingFish && (
        <div 
          onClick={() => setBuyingFish(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', cursor: 'pointer' }}
        >
          <div 
            className="glass-panel animate-fade-in" 
            style={{ width: '400px', padding: '24px', cursor: 'default' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3>Checkout {buyingFish.name}</h3>
              <button style={{ background: 'transparent', padding: 0 }} onClick={() => setBuyingFish(null)}>
                <X size={20} color="var(--text-main)" />
              </button>
            </div>
            
            <form onSubmit={handleCheckout}>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Harga Per Kg: <strong>Rp {buyingFish.price_per_kg.toLocaleString()}</strong></p>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Sisa Stok: <strong>{buyingFish.stock_kg} kg</strong></p>
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Berapa kilogram?</label>
                <input 
                  type="number" 
                  min="0.1" 
                  max={buyingFish.stock_kg} 
                  step="0.1" 
                  value={qty === 0 ? '' : qty} 
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                    setQty(val);
                  }}
                  onFocus={(e) => e.target.select()}
                  required 
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white' }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '16px', background: 'rgba(0, 0, 0, 0.05)', borderRadius: '8px', border: '1px solid var(--primary-color)' }}>
                <span>Total Bayar:</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                  Rp {(buyingFish.price_per_kg * qty).toLocaleString()}
                </span>
              </div>
              
              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={isProcessing}>
                {isProcessing ? 'Memproses...' : 'Selesaikan Pembayaran'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating WA Chat Widget */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 999 }}>
        {/* Chat Popup */}
        {isChatOpen && (
          <div className="animate-fade-in" style={{ 
            position: 'absolute', 
            bottom: '75px', 
            right: '0', 
            width: '90vw', 
            maxWidth: '380px', 
            background: 'white', 
            borderRadius: '16px', 
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            border: 'none',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{ background: 'white', padding: '16px', color: '#111827', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  <Leaf size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700' }}>Admin Fish-Link</h4>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#6b7280' }}>Typically replies within a minute</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            
            {/* Body */}
            <div style={{ padding: '24px', background: '#fdf8f0', minHeight: '200px', position: 'relative' }}>
              <div style={{ position: 'relative', background: 'white', padding: '14px 18px', borderRadius: '8px', color: '#111827', fontSize: '0.9rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'inline-block', maxWidth: '85%', lineHeight: '1.4' }}>
                {/* Bubble tail */}
                <div style={{ position: 'absolute', top: '12px', left: '-6px', width: '0', height: '0', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '6px solid white' }}></div>
                
                Halo! Selamat datang di Fish-Link.<br/>Ada yang bisa kami bantu?
                
                <div style={{ fontSize: '0.65rem', color: '#9ca3af', textAlign: 'right', marginTop: '8px' }}>
                  12:10 pm
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div style={{ padding: '16px', background: 'white', display: 'flex', flexDirection: 'column', gap: '12px', margin: 0 }}>
              <div style={{ position: 'relative', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
                <input 
                  type="text" 
                  placeholder="Type Message" 
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendWa(e as any)}
                  style={{ width: '100%', padding: '4px 30px 4px 8px', border: 'none', outline: 'none', fontSize: '0.9rem', color: '#111827', background: 'white' }}
                />
                <Smile size={18} color="#9ca3af" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              <button onClick={handleSendWa} style={{ width: '100%', background: '#21c063', color: 'white', border: 'none', padding: '12px', borderRadius: '24px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}>
                Send A Message
              </button>
              <div style={{ textAlign: 'center', fontSize: '0.65rem', color: '#9ca3af', fontWeight: '600' }}>
                Powered by Fish-Link
              </div>
            </div>
          </div>
        )}

        {/* Floating Button */}
        <button 
          onClick={() => {
            setIsChatOpen(!isChatOpen);
            if (!hasReadChat) setHasReadChat(true);
          }}
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: '#0ba48b',
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isChatOpen ? <X size={36} /> : (
            <>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {/* Red dot indicator */}
              {!hasReadChat && (
                <div style={{ position: 'absolute', top: '14px', right: '14px', width: '14px', height: '14px', background: '#ef4444', borderRadius: '50%', border: '2px solid #0ba48b' }}></div>
              )}
            </>
          )}
        </button>
      </div>
    </>
  );
}
