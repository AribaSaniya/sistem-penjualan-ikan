import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ship, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../services/supabaseClient';

type AuthView = 'login' | 'register' | 'forgot_password' | 'verify_otp' | 'update_password';

export default function PortalAuth() {
  const [view, setView] = useState<AuthView>('login');
  const [roleMode, setRoleMode] = useState<'user' | 'admin'>('user');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const navigate = useNavigate();

  // Reset error when view changes
  useEffect(() => {
    setError('');
    setMessage('');
  }, [view]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (loginError) throw loginError;

      if (!data.user) throw new Error('User data not found');

      // Ambil profil dari database
      let { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();

      // Fallback: Jika profil belum ada di database, buatkan secara otomatis dari metadata
      if (!profile) {
        console.log("Profil belum ada, membuat profil baru...");
        const { data: newProfile, error: insertError } = await supabase.from('profiles').insert([
          { 
            id: data.user.id, 
            name: data.user.user_metadata?.name || email.split('@')[0], 
            role: data.user.user_metadata?.role || roleMode 
          }
        ]).select().single();

        if (insertError) {
          console.error("Gagal sinkron database:", insertError);
          // Jika gagal karena RLS, kita gunakan data sementara agar tetap bisa masuk
          profile = { id: data.user.id, name: data.user.user_metadata?.name || 'User', role: data.user.user_metadata?.role || roleMode } as any;
        } else {
          profile = newProfile;
        }
      }

      // Pastikan Role terdeteksi
      const finalRole = profile?.role || data.user.user_metadata?.role || roleMode;

      // Update State Global
      useAuthStore.getState().setUser(
        { id: profile.id, name: profile.name, email: data.user.email!, role: finalRole },
        data.session
      );
      
      // REDIRECT KE BURSA IKAN (HOME)
      navigate('/');

    } catch (err: any) {
      setError(err.message || 'Login gagal. Periksa Email/Password Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role: roleMode } }
      });
      if (signUpError) throw signUpError;
      
      setMessage('Kode verifikasi telah dikirim ke email Anda.');
      setView('verify_otp');
    } catch (err: any) {
      setError(err.message || 'Registrasi gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setMessage('Kode pemulihan telah dikirim ke email Anda.');
      setView('verify_otp');
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim email pemulihan.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (otpCode: string) => {
    setError('');
    setLoading(true);
    try {
      const type = message.includes('pemulihan') ? 'recovery' : 'signup';
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type
      });
      if (error) throw error;

      if (type === 'recovery') {
        setView('update_password');
      } else {
        // AUTO-LOGIN & REDIRECT
        const user = data.user;
        if (!user) throw new Error("Gagal mendapatkan data user setelah verifikasi.");

        // Ambil role dari metadata pendaftaran
        const role = user.user_metadata?.role || 'user';
        
        // Sync profil database (pastikan role tersimpan dengan benar)
        let { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        
        if (!profile) {
          const { data: newProfile } = await supabase.from('profiles').insert([
            { id: user.id, name: user.user_metadata?.name || email.split('@')[0], role }
          ]).select().single();
          profile = newProfile;
        }

        // Update Global State
        useAuthStore.getState().setUser(
          { id: user.id, name: profile?.name || 'User', email: user.email!, role: profile?.role || role },
          data.session
        );

        alert('Email Berhasil Diverifikasi!');
        
        // Arahkan ke bursa ikan
        navigate('/');
      }
    } catch (err: any) {
      setError('Kode OTP salah atau sudah kadaluarsa.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyOTP(otp);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      alert('Password berhasil diperbarui! Silakan login kembali.');
      setView('login');
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
        
        {/* Portal Selection (Only for Login/Register) */}
        {(view === 'login' || view === 'register') && (
          <div style={{ display: 'flex', gap: '12px', padding: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', marginBottom: '32px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button 
              onClick={() => setRoleMode('user')} 
              style={{ 
                flex: 1, 
                padding: '14px', 
                borderRadius: '12px', 
                border: 'none', 
                background: roleMode === 'user' ? 'linear-gradient(135deg, #FFD700 0%, #B8860B 50%, #8A6D1B 100%)' : 'transparent', 
                color: roleMode === 'user' ? '#000' : 'rgba(255,255,255,0.4)', 
                fontWeight: roleMode === 'user' ? '800' : '500', 
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: roleMode === 'user' ? '0 0 20px rgba(125, 211, 252, 0.7)' : 'none',
                transform: roleMode === 'user' ? 'scale(1.05)' : 'scale(1)',
                zIndex: roleMode === 'user' ? 2 : 1
              }}
            >
              <User size={18} /> Pembeli
            </button>
            <button 
              onClick={() => setRoleMode('admin')} 
              style={{ 
                flex: 1, 
                padding: '14px', 
                borderRadius: '12px', 
                border: 'none', 
                background: roleMode === 'admin' ? 'linear-gradient(135deg, #FFD700 0%, #B8860B 50%, #8A6D1B 100%)' : 'transparent', 
                color: roleMode === 'admin' ? '#000' : 'rgba(255,255,255,0.4)', 
                fontWeight: roleMode === 'admin' ? '800' : '500', 
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: roleMode === 'admin' ? '0 0 20px rgba(125, 211, 252, 0.7)' : 'none',
                transform: roleMode === 'admin' ? 'scale(1.05)' : 'scale(1)',
                zIndex: roleMode === 'admin' ? 2 : 1
              }}
            >
              <Ship size={18} /> Pengelola
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '8px' }}>
            {view === 'login' && (roleMode === 'admin' ? 'Login Pengelola' : 'Masuk Fish-Link')}
            {view === 'register' && (roleMode === 'admin' ? 'Daftar Admin' : 'Daftar Baru')}
            {view === 'forgot_password' && 'Reset Password'}
            {view === 'verify_otp' && 'Verifikasi Kode'}
            {view === 'update_password' && 'Password Baru'}
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {view === 'login' && (roleMode === 'admin' ? 'Masuk ke sistem manajemen ArusLaut' : 'Portal Pembeli Ikan Segar')}
            {view === 'register' && (roleMode === 'admin' ? 'Buat akun pengelola TPI baru' : 'Buat akun Anda untuk mulai bertransaksi')}
            {view === 'forgot_password' && 'Masukkan email untuk dikirimkan kode OTP'}
            {view === 'verify_otp' && 'Masukkan 8 digit kode yang dikirim ke email'}
            {view === 'update_password' && 'Buat kombinasi password baru yang kuat'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(225, 29, 72, 0.1)', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            {error}
          </div>
        )}
        
        {message && (
          <div style={{ background: 'rgba(52, 211, 153, 0.1)', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            {message}
          </div>
        )}

        {/* LOGIN FORM */}
        {view === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', paddingRight: '40px' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button type="button" onClick={() => setView('forgot_password')} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.9rem', cursor: 'pointer' }}>
                Lupa password?
              </button>
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Masuk...' : 'Masuk Sekarang'}
            </button>

            <p style={{ textAlign: 'center', marginTop: '16px' }}>
              Belum punya akun? <button type="button" onClick={() => setView('register')} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: 'bold' }}>Daftar</button>
            </p>
          </form>
        )}

        {/* REGISTER FORM */}
        {view === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="text" placeholder="Nama Lengkap" value={name} onChange={e => setName(e.target.value)} required />
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', paddingRight: '40px' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
            </button>
            <button type="button" onClick={() => setView('login')} className="btn-outline">
              <ArrowLeft size={16} /> Kembali Login
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {view === 'forgot_password' && (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="email" placeholder="Email Terdaftar" value={email} onChange={e => setEmail(e.target.value)} required />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
            </button>
            <button type="button" onClick={() => setView('login')} className="btn-outline">
              <ArrowLeft size={16} /> Kembali
            </button>
          </form>
        )}

        {/* VERIFY OTP FORM */}
        {view === 'verify_otp' && (
          <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <p style={{ textAlign: 'center', marginBottom: '20px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Kode OTP telah dikirim ke: <br/>
                <strong style={{ color: 'var(--text-main)' }}>{email}</strong>
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={otp[index] || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val) {
                        const newOtp = otp.split('');
                        newOtp[index] = val;
                        const finalOtp = newOtp.join('').slice(0, 8);
                        setOtp(finalOtp);
                        
                        // Auto focus next
                        if (index < 7) {
                          const nextInput = document.getElementById(`otp-${index + 1}`);
                          nextInput?.focus();
                        }
                        
                        // Auto submit if complete
                        if (finalOtp.length === 8 && !finalOtp.includes(' ')) {
                          verifyOTP(finalOtp);
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otp[index] && index > 0) {
                        const prevInput = document.getElementById(`otp-${index - 1}`);
                        prevInput?.focus();
                      }
                    }}
                    style={{
                      width: '46px',
                      height: '56px',
                      textAlign: 'center',
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: 'var(--text-main)',
                      borderRadius: '8px',
                      border: '2px solid var(--border-color)',
                      background: 'var(--input-bg)',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    required
                  />
                ))}
              </div>
            </div>
            
            <button type="submit" className="btn-accent" disabled={loading} style={{ padding: '14px' }}>
              {loading ? 'Memverifikasi...' : 'Verifikasi Sekarang'}
            </button>
            <button type="button" onClick={() => setView('login')} className="btn-outline" style={{ background: 'none' }}>
              Ganti Email
            </button>
          </form>
        )}

        {/* UPDATE PASSWORD FORM */}
        {view === 'update_password' && (
          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(52, 211, 153, 0.1)', padding: '12px', borderRadius: '8px', color: 'var(--accent-color)', fontSize: '0.9rem' }}>
               Kode benar! Silakan masukkan password baru Anda.
            </div>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? "text" : "password"} placeholder="Password Baru" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{ width: '100%', paddingRight: '40px' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button type="submit" className="btn-accent" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Password'}
            </button>
          </form>
        )}


      </div>
    </div>
  );
}

