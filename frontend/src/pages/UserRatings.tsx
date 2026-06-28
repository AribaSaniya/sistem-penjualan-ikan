import { useState, useEffect } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';

interface Review {
  id: number;
  fish_name: string;
  rating: number;
  comment: string;
  image_url: string;
  created_at: string;
  merchant?: { name: string };
}

export default function UserRatings() {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Semua');

  const stats = {
    avg: reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) : 0,
    total: reviews.length,
    distribution: [
      { star: 5, count: reviews.filter(r => r.rating === 5).length },
      { star: 4, count: reviews.filter(r => r.rating === 4).length },
      { star: 3, count: reviews.filter(r => r.rating === 3).length },
      { star: 2, count: reviews.filter(r => r.rating === 2).length },
      { star: 1, count: reviews.filter(r => r.rating === 1).length },
    ]
  };

  const fetchReviews = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, merchants(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setReviews(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filteredReviews = activeFilter === 'Semua' 
    ? reviews 
    : reviews.filter(r => r.rating === parseInt(activeFilter));

  return (
    <div style={{ padding: '24px', minHeight: '100vh', color: '#F8FAFC' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '2rem', fontWeight: 800 }}>Rating & Ulasan Saya</h1>
        <p style={{ color: '#64748B' }}>Berikan masukan untuk kualitas ikan dan layanan pengirim.</p>
      </header>

      {/* Summary Section matching user image */}
      <div className="glass-panel" style={{ padding: '32px', display: 'flex', gap: '60px', flexWrap: 'wrap', marginBottom: '40px', borderRadius: '24px' }}>
        <div style={{ flex: '1', minWidth: '250px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '3.5rem', fontWeight: 800, margin: 0 }}>{stats.avg.toFixed(1)}</h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '2px' }}>
                {[...Array(5)].map((_, i) => <Star key={i} size={18} fill={i < Math.round(stats.avg) ? "#FBBF24" : "transparent"} color="#FBBF24" />)}
              </div>
              <span style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px' }}>Didasarkan pada {reviews.length} ulasan</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stats.distribution.map((d) => (
              <div key={d.star} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.9rem', width: '25px', fontWeight: 600 }}>{d.star} <Star size={12} style={{ display: 'inline', marginBottom: '2px' }} /></span>
                <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${reviews.length > 0 ? (d.count / reviews.length) * 100 : 0}%`, 
                    height: '100%', 
                    background: '#FBBF24',
                    boxShadow: '0 0 10px rgba(251, 191, 36, 0.4)'
                  }} />
                </div>
                <span style={{ fontSize: '0.8rem', color: '#64748B', width: '35px' }}>
                  {reviews.length > 0 ? Math.round((d.count / reviews.length) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: '1', minWidth: '250px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>Filter Ulasan</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {['Semua', '5', '4', '3', '2', '1'].map((f) => (
              <button 
                key={f}
                onClick={() => setActiveFilter(f)}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '30px', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: activeFilter === f ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                  color: activeFilter === f ? '#38BDF8' : '#64748B',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {f} {f !== 'Semua' && <Star size={14} fill={activeFilter === f ? "#38BDF8" : "transparent"} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Review List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner"></div></div>
        ) : filteredReviews.length === 0 ? (
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
            <MessageSquare size={48} style={{ color: 'rgba(255,255,255,0.05)', marginBottom: '16px' }} />
            <p style={{ color: '#64748B' }}>Belum ada ulasan untuk filter ini.</p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div key={review.id} className="glass-panel fade-in" style={{ padding: '24px', borderRadius: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'var(--gold-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'black' }}>
                    {review.fish_name[0]}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{review.fish_name}</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>Pengirim: <span style={{ color: '#FBBF24' }}>{review.merchant?.name || 'Umum'}</span></p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
                    {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < review.rating ? "#FBBF24" : "transparent"} color="#FBBF24" />)}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{new Date(review.created_at).toLocaleDateString('id-ID')}</span>
                </div>
              </div>
              
              <p style={{ margin: '0 0 20px 0', lineHeight: 1.6, color: '#E2E8F0' }}>{review.comment}</p>
              
              {review.image_url && (
                <div style={{ width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src={review.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Bukti" />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
