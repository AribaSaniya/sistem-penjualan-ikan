import { useState, useEffect } from 'react';
import { Star, Search, Plus, X, Trash2, MessageCircle, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface Merchant {
  id: number;
  name: string;
  category: string;
  rating: number;
  review_count: number;
  image_url: string;
  total_sales_rp: number;
  status: string;
}

interface Review {
  id: number;
  fish_name: string;
  rating: number;
  comment: string;
  image_url: string;
  created_at: string;
  user_email?: string;
}

interface Fish {
  id: number;
  name: string;
  price_per_kg: number;
  stock_kg: number;
  image_url: string;
  is_sold_out: boolean;
}

export default function AdminSales() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Reviews State
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [merchantReviews, setMerchantReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Fish Catalog State
  const [fishes, setFishes] = useState<Fish[]>([]);
  const [loadingFishes, setLoadingFishes] = useState(true);
  const [fishSearchTerm, setFishSearchTerm] = useState('');

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    id: null as number | null,
    name: '',
    category: '',
    rating: '5.0',
    imageFile: null as File | null
  });

  const fetchMerchants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMerchants(data || []);
    } catch (err) {
      console.error('Gagal mengambil data pedagang:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFishes = async () => {
    setLoadingFishes(true);
    try {
      const { data, error } = await supabase
        .from('fish')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setFishes(data || []);
    } catch (err) {
      console.error('Gagal mengambil data ikan:', err);
    } finally {
      setLoadingFishes(false);
    }
  };

  useEffect(() => {
    fetchMerchants();
    fetchFishes();
  }, []);

  const fetchMerchantReviews = async (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setLoadingReviews(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMerchantReviews(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleUploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `merchant-photos/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('fish-images').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('fish-images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let finalImageUrl = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200';
      if (formData.imageFile) finalImageUrl = await handleUploadImage(formData.imageFile);
      const payload = { name: formData.name, category: formData.category, rating: parseFloat(formData.rating), image_url: finalImageUrl, status: 'Aktif' };
      if (formData.id) {
        await supabase.from('merchants').update(payload).eq('id', formData.id);
      } else {
        await supabase.from('merchants').insert([payload]);
      }
      setIsModalOpen(false);
      setFormData({ id: null, name: '', category: '', rating: '5.0', imageFile: null });
      fetchMerchants();
    } catch (err: any) {
      alert('Gagal: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Hapus pedagang ini?')) return;
    await supabase.from('merchants').delete().eq('id', id);
    fetchMerchants();
  };

  const filteredMerchants = merchants.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '24px', minHeight: '100vh', color: '#F8FAFC' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div>
          <h1 style={{ background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '2.5rem', fontWeight: 800 }}>
            Kelola Penjualan
          </h1>
          <p style={{ color: '#64748B', fontSize: '1.1rem' }}>Input dan pantau reputasi pedagang.</p>
        </div>
      </header>

      {/* KATALOG IKAN SECTION (MIRIP BURSA IKAN) */}
      <section style={{ marginBottom: '64px' }}>
        <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-color)' }}>Pantau Katalog Bursa</h2>
            <p style={{ color: '#64748B' }}>Tampilan katalog ikan yang dilihat oleh pembeli saat ini.</p>
          </div>
          <div style={{ minWidth: '300px', position: 'relative' }}>
             <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
             <input 
              type="text" 
              placeholder="Cari katalog ikan..." 
              value={fishSearchTerm} 
              onChange={e => setFishSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '12px 45px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
             />
          </div>
        </header>

        {loadingFishes ? (
          <p style={{ color: '#64748B' }}>Memuat katalog...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {fishes.filter(f => !f.is_sold_out && f.name.toLowerCase().includes(fishSearchTerm.toLowerCase())).map(fish => (
              <div 
                key={fish.id} 
                className="glass-panel" 
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
                  minHeight: '280px'
                }}
              >
                <div style={{ zIndex: 2, marginBottom: '12px' }}>
                  <h3 style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: 800, 
                    textTransform: 'uppercase', 
                    letterSpacing: '1px',
                    margin: 0,
                    color: 'white'
                  }}>
                    {fish.name}
                  </h3>
                </div>

                <div style={{ 
                  width: '100%',
                  height: '120px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  zIndex: 1,
                  marginBottom: '16px'
                }}>
                  <img src={fish.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={fish.name} />
                </div>

                <div style={{ marginTop: 'auto', zIndex: 2 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--accent-color)', fontWeight: 'bold' }}>HARGA / KG</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                          Rp {fish.price_per_kg.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                         <span style={{ fontSize: '0.65rem', display: 'block', color: 'rgba(255,255,255,0.4)' }}>STOK</span>
                         <span style={{ fontSize: '0.85rem', color: 'white', fontWeight: 'bold' }}>{fish.stock_kg} kg</span>
                      </div>
                   </div>
                </div>

                {/* Decorative Element */}
                <div style={{
                  position: 'absolute',
                  bottom: '-20px',
                  right: '-10px',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(56, 189, 248, 0.05)',
                  borderRadius: '50%',
                  zIndex: 0
                }}></div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '64px' }}></div>

      {/* MERCHANTS SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-color)', margin: 0 }}>Kelola Reputasi Pedagang</h2>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary" style={{ padding: '12px 24px', borderRadius: '12px' }}>
          <Plus size={20} /> Tambah Pedagang
        </button>
      </div>
      
      <div style={{ position: 'relative', marginBottom: '32px' }}>
        <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
        <input type="text" placeholder="Cari pedagang..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '12px 45px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
        {filteredMerchants.map((merchant) => (
          <div key={merchant.id} className="glass-panel" style={{ padding: '24px', borderRadius: '20px', position: 'relative' }}>
            <button onClick={() => handleDelete(merchant.id)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', color: '#F43F5E', border: 'none' }}><Trash2 size={18} /></button>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <img src={merchant.image_url} alt={merchant.name} style={{ width: '80px', height: '80px', borderRadius: '16px', objectFit: 'cover' }} />
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{merchant.name}</h3>
                <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>{merchant.category}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < Math.floor(merchant.rating) ? "#FBBF24" : "transparent"} color={i < Math.floor(merchant.rating) ? "#FBBF24" : "#475569"} />)}
                  <span style={{ marginLeft: '8px', fontWeight: 700, color: '#FBBF24' }}>{merchant.rating}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => fetchMerchantReviews(merchant)}
              style={{ width: '100%', marginTop: '20px', padding: '10px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', border: '1px dashed #38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <MessageCircle size={18} /> Lihat Ulasan Pembeli
            </button>
          </div>
        ))}
      </div>

      {/* Reviews Modal */}
      {selectedMerchant && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', padding: '32px', position: 'relative', overflowY: 'auto' }}>
            <button onClick={() => setSelectedMerchant(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: 'white', border: 'none' }}><X size={24} /></button>
            <h2 style={{ marginBottom: '8px' }}>Ulasan untuk {selectedMerchant.name}</h2>
            <p style={{ color: '#64748B', marginBottom: '24px' }}>Total {merchantReviews.length} ulasan dari pembeli.</p>
            
            {loadingReviews ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner"></div></div>
            ) : merchantReviews.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>Belum ada ulasan untuk pedagang ini.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {merchantReviews.map(review => (
                  <div key={review.id} style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ display: 'flex' }}>
                          {[...Array(5)].map((_, i) => <Star key={i} size={12} fill={i < review.rating ? "#FBBF24" : "transparent"} color="#FBBF24" />)}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#FBBF24', fontWeight: 700 }}>{review.fish_name}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{new Date(review.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem', lineHeight: 1.5 }}>{review.comment}</p>
                    {review.image_url ? (
                      <div style={{ width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img src={review.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Bukti" />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748B' }}>
                        <ImageIcon size={14} /> Tanpa Foto Bukti
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Form Pedagang */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '32px', position: 'relative' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: 'white', border: 'none' }}><X size={24} /></button>
            <h2 style={{ marginBottom: '24px' }}>Tambah Data Pedagang</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <input required placeholder="Nama Pedagang" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }} />
              <input required placeholder="Spesialisasi" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }} />
              <button disabled={isSaving} className="btn-primary" style={{ padding: '14px' }}>{isSaving ? 'Menyimpan...' : 'Simpan'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
