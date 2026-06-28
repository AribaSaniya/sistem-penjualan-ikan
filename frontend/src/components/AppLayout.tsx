import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { LayoutDashboard, ShoppingCart, TrendingUp, LogOut, BarChart2, ClipboardList, Star, ChevronRight, User as UserIcon, X, Phone, Mail, Lock } from 'lucide-react';
import { useOrderStore } from '../store/useOrderStore';
import { supabase } from '../services/supabaseClient';
import { useEffect } from 'react';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const { fetchCount } = useOrderStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [newPhone, setNewPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user?.id) fetchCount(user.id);
    if (user?.name) setNewName(user.name);
    if (user?.phone) setNewPhone(user.phone);
  }, [user, fetchCount]);

  const handleUpdateProfile = async () => {
    if (!user || !newName.trim()) return;
    setIsSaving(true);
    try {
      console.log("Mencoba update profil paralel untuk ID:", user.id);
      
      const updateTasks = [];
      
      // Task 1: Update profiles table (Gunakan update karena RLS memblokir Insert/Upsert)
      const profileResult = await supabase.from('profiles').update({ 
        name: newName, 
        phone: newPhone
      }).eq('id', user.id);

      // Check for errors in profile update
      if (profileResult.error) {
        console.warn("Update profil dengan phone gagal, mencoba fallback nama saja...", profileResult.error);
        const { error: fallbackErr } = await supabase.from('profiles').update({ name: newName }).eq('id', user.id);
        if (fallbackErr) throw fallbackErr;
      }

      // Task 2: Update auth metadata (hanya jika HP berubah) - Dilakukan setelah task 1 selesai (menghindari Lock stolen)
      if (newPhone !== (user.phone || '')) {
        const { error: authError } = await supabase.auth.updateUser({ data: { phone: newPhone } });
        if (authError) {
          console.error("Gagal mengupdate Auth Metadata:", authError);
          // Kita tidak perlu melemparkan error jika ini gagal, profil database sudah terupdate.
        }
      }
      
      // Update local store immediately
      useAuthStore.getState().setUser({ ...user, name: newName, phone: newPhone }, useAuthStore.getState().session);
      
      alert('Profil berhasil diperbarui!');
      setShowProfileModal(false);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Update Error:", error);
      alert('Gagal menyimpan profil: ' + (error.message || 'Izin ditolak'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('Password minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Konfirmasi password tidak cocok.');
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      alert('Password berhasil diperbarui!');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Change Password Error:', error);
      alert('Gagal mengganti password: ' + (error.message || 'Terjadi kesalahan'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };


  const isActive = (path: string) => location.pathname === path;

  const NavButton = ({ path, icon: Icon, label, badge }: { path: string, icon: any, label: string, badge?: number }) => (
    <button 
      className={`btn-outline ${isActive(path) ? "active" : ""}`} 
      style={{ 
        justifyContent: 'flex-start', 
        width: '100%',
        padding: '12px 20px',
        border: 'none',
        position: 'relative'
      }} 
      onClick={() => navigate(path)}
    >
      <Icon size={18} /> {label}
      {badge !== undefined && badge > 0 && (
        <span style={{ 
          position: 'absolute', 
          right: '20px', 
          background: 'var(--danger-color)', 
          color: 'white', 
          fontSize: '0.7rem', 
          padding: '2px 8px', 
          borderRadius: '10px',
          fontWeight: 'bold',
          boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)'
        }}>
          {badge}
        </span>
      )}
    </button>
  );


  const isAuthPage = location.pathname === '/auth';

  if (isAuthPage) {
    return (
      <div className="app-container" style={{ display: 'block' }}>
        <main className="main-content" style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Desktop Sidebar Nav */}
      <nav className="desktop-sidebar">
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ 
            background: 'var(--gold-gradient)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            fontSize: '1.7rem', 
            fontWeight: 'bold' 
          }}>ArusLaut</h1>
          <p style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
            <span style={{ 
              background: 'var(--gold-gradient)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              fontSize: '1.1rem'
            }}>Fish-Link</span>
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          {user ? (
            <>
              {user.role === 'admin' ? (
                <NavButton path="/admin/sales" icon={LayoutDashboard} label="Kelola Penjualan" />
              ) : (
                <NavButton path="/" icon={LayoutDashboard} label="Bursa Ikan" />
              )}
              {user.role === 'user' ? (
                <>
                  <NavButton path="/user/dashboard" icon={ShoppingCart} label="Riwayat Pesanan" />
                  <NavButton path="/user/ratings" icon={Star} label="Rating & Ulasan" />
                </>
              ) : (
                <>
                  <NavButton path="/admin/dashboard" icon={TrendingUp} label="Manajemen Stok" />
                  <NavButton path="/admin/orders" icon={BarChart2} label="Rekap Penjualan" />
                </>
              )}






            </>
          ) : (
            <button className="btn-primary" onClick={() => navigate('/auth')}>
               Masuk / Daftar
            </button>
          )}
        </div>

        {user && (
          <div style={{ paddingTop: '24px', position: 'relative' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Profile</p>
            
            <button 
              onClick={() => setShowProfileModal(true)}
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '12px',
                background: 'transparent',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                marginBottom: '8px'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255, 215, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFD700' }}>
                  <UserIcon size={18} />
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#FFF8DC' }}>Profil Saya</span>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </button>
            
            <button 
              style={{ width: '100%', display: 'flex', alignItems: 'center', borderRadius: '12px', padding: '12px', background: 'linear-gradient(90deg, #9e0000, #c41212, #9e0000)', border: 'none', color: '#dbdbdb', cursor: 'pointer', marginTop: '16px', transition: 'filter 0.2s' }} 
              onClick={handleLogout}
              onMouseEnter={e => {
                e.currentTarget.style.filter = 'brightness(1.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              <LogOut size={18} style={{ marginRight: '10px' }} /> Log out
            </button>
          </div>
        )}
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        {user && user.role === 'user' && (
          <button className="mobile-nav-item" style={{ color: isActive('/') ? 'var(--primary-color)' : 'var(--text-muted)' }} onClick={() => navigate('/')}>
            <LayoutDashboard size={24} />
            <span>Bursa</span>
          </button>
        )}
        {user && user.role === 'admin' && (
          <button className="mobile-nav-item" style={{ color: isActive('/admin/sales') ? 'var(--primary-color)' : 'var(--text-muted)' }} onClick={() => navigate('/admin/sales')}>
            <LayoutDashboard size={24} />
            <span>Penjualan</span>
          </button>
        )}
        {user?.role === 'admin' && (
          <>
            <button className="mobile-nav-item" style={{ color: isActive('/admin/dashboard') ? 'var(--primary-color)' : 'var(--text-muted)' }} onClick={() => navigate('/admin/dashboard')}>
              <TrendingUp size={24} />
              <span>Stok</span>
            </button>
            <button className="mobile-nav-item" style={{ color: isActive('/admin/orders') ? 'var(--primary-color)' : 'var(--text-muted)' }} onClick={() => navigate('/admin/orders')}>
              <ClipboardList size={24} />
              <span>Pesanan</span>
            </button>
          </>
        )}
        {user?.role === 'user' && (
          <>
            <button className="mobile-nav-item" style={{ color: isActive('/user/dashboard') ? 'var(--primary-color)' : 'var(--text-muted)', position: 'relative' }} onClick={() => navigate('/user/dashboard')}>
              <ShoppingCart size={24} />
              <span>Pesanan</span>
            </button>

            <button className="mobile-nav-item" style={{ color: isActive('/user/ratings') ? 'var(--primary-color)' : 'var(--text-muted)' }} onClick={() => navigate('/user/ratings')}>
              <Star size={24} />
              <span>Rating</span>
            </button>

            <button className="mobile-nav-item" style={{ color: isActive('/user/market') ? 'var(--primary-color)' : 'var(--text-muted)' }} onClick={() => navigate('/user/market')}>
              <BarChart2 size={24} />
              <span>Pasar</span>
            </button>
          </>
        )}






        {user ? (
          <button className="mobile-nav-item" style={{ color: 'var(--danger-color)' }} onClick={handleLogout}>
            <LogOut size={24} />
            <span>Keluar</span>
          </button>
        ) : (
          <button className="mobile-nav-item" style={{ color: 'var(--primary-color)' }} onClick={() => navigate('/auth')}>
            <LayoutDashboard size={24} />
            <span>Login</span>
          </button>
        )}
      </nav>

      {/* Profile Modal */}
      {showProfileModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '32px', position: 'relative' }}>
            <button onClick={() => setShowProfileModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            <h2 style={{ marginBottom: '24px', fontSize: '1.5rem', color: 'var(--text-main)' }}>Profil Pengguna</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}><Mail size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/> Email (Hanya Baca)</label>
                <input type="text" value={user?.email || ''} readOnly style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}><UserIcon size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/> Nama Lengkap</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--accent-color)', color: 'white' }} />
              </div>
              
              {user?.role === 'admin' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}><Phone size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/> Nomor WhatsApp</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Contoh: 08123456789" 
                      value={newPhone} 
                      onChange={e => setNewPhone(e.target.value)} 
                      readOnly={!!user?.phone && newPhone === user.phone}
                      style={{ 
                        flex: 1, 
                        padding: '12px', 
                        borderRadius: '8px', 
                        background: (!!user?.phone && newPhone === user.phone) ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)', 
                        border: '1px solid var(--accent-color)', 
                        color: (!!user?.phone && newPhone === user.phone) ? 'var(--text-muted)' : 'white',
                        cursor: (!!user?.phone && newPhone === user.phone) ? 'not-allowed' : 'text'
                      }} 
                    />
                    {newPhone && (
                      <button 
                        onClick={() => setNewPhone('')}
                        style={{ 
                          padding: '0 12px', 
                          borderRadius: '8px', 
                          background: 'rgba(244, 63, 94, 0.1)', 
                          border: '1px solid #F43F5E', 
                          color: '#F43F5E', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        title="Hapus / Log Out Nomor WA untuk mengganti"
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.1)'}
                      >
                        <LogOut size={16} />
                      </button>
                    )}
                  </div>
                  {!!user?.phone && newPhone === user.phone && (
                    <p style={{ fontSize: '0.65rem', color: '#F43F5E', marginTop: '4px' }}>* Klik tombol merah untuk mengganti nomor</p>
                  )}
                </div>
              )}
              
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button 
                  type="button"
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', fontSize: '0.9rem' }}
                >
                  <Lock size={16} /> {showPasswordForm ? 'Sembunyikan' : 'Ganti Password'}
                </button>
                
                {showPasswordForm && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                    <input 
                      type="password" 
                      placeholder="Password Baru (min. 6 karakter)" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--accent-color)', color: 'white' }}
                    />
                    <input 
                      type="password" 
                      placeholder="Konfirmasi Password Baru" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--accent-color)', color: 'white' }}
                    />
                    <button 
                      className="btn-accent" 
                      onClick={handleChangePassword} 
                      disabled={isChangingPassword}
                      style={{ padding: '12px', width: '100%' }}
                    >
                      {isChangingPassword ? 'Menyimpan...' : 'Simpan Password Baru'}
                    </button>
                  </div>
                )}
              </div>

              <button className="btn-primary" onClick={handleUpdateProfile} disabled={isSaving} style={{ padding: '14px', marginTop: '10px' }}>
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-content">
         {children}
      </main>

    </div>
  );
}


