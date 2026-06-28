import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabaseClient';


interface Fish {
  id: number;
  name: string;
  price_per_kg: number;
  market_price: number;
  stock_kg: number;
  image_url: string;
  is_sold_out: boolean;
}



/* ─── MAIN COMPONENT ─── */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [fishes, setFishes] = useState<Fish[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [stockKg, setStockKg] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [formattedPrice, setFormattedPrice] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const formatPrice = (val: string) => {
    const numeric = val.replace(/\D/g, '');
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  useEffect(() => {
    fetchData();


    const fishChannel = supabase.channel('admin_fish_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fish' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(fishChannel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('fish').select('*').order('created_at', { ascending: false });
      if (!error) setFishes(data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `fish-photos/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('fish-images').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('fish-images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !formattedPrice || !stockKg) {
      alert('Harap isi semua kolom wajib!');
      return;
    }
    setIsUploading(true);
    try {
      let finalImageUrl = 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=400';
      if (imageFile) {
        try { finalImageUrl = await uploadImage(imageFile); }
        catch (imgErr) { throw new Error(`Gagal upload gambar: ${(imgErr as Error).message}`); }
      }
      const priceNumeric = parseInt(formattedPrice.replace(/\./g, ''), 10);
      const { error } = await supabase.from('fish').insert({
        name: name.trim(), price_per_kg: priceNumeric,
        stock_kg: parseFloat(stockKg), image_url: finalImageUrl, is_sold_out: false,
      });
      if (error) throw error;
      setName(''); setFormattedPrice(''); setStockKg(''); setImageFile(null);
      const fi = document.getElementById('fish-image-input') as HTMLInputElement;
      if (fi) fi.value = '';
      alert(`✅ Ikan "${name}" berhasil ditayangkan!`);
      fetchData();
    } catch (error) {
      alert(`❌ Gagal: ${(error as Error).message}`);
    } finally { setIsUploading(false); }
  };

  const handleUpdatePrice = async (id: number, newPrice: number) => {
    try {
      const { error } = await supabase.from('fish').update({ price_per_kg: newPrice }).eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: number, fishName: string) => {
    if (!window.confirm(`Hapus ${fishName} dari katalog?`)) return;
    try {
      const { error } = await supabase.from('fish').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) { alert((err as Error).message || 'Gagal menghapus.'); }
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', padding: '24px' }}>

      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '2.2rem', fontWeight: 800 }}>Panel Pengelola</h1>
          <p style={{ color: 'var(--text-muted)' }}>Pantau stok, atur harga, dan lihat rekap penjualan.</p>
        </div>
        <button className="btn-outline" onClick={() => navigate('/')} style={{ padding: '10px 20px' }}>
          <ArrowLeft size={16} /> Kembali ke Bursa
        </button>
      </header>

      {/* FORM + TABEL STOK */}
      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Kolom Kiri: Form */}
        <div style={{ flex: 1, minWidth: '280px', maxWidth: '340px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Input Tangkapan Baru</h2>
          <form onSubmit={handleUpload} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.88rem', marginBottom: '6px', display: 'block', color: 'var(--text-muted)' }}>Nama Ikan</label>
              <input type="text" placeholder="Contoh: Kerapu Macan" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '0.88rem', marginBottom: '6px', display: 'block', color: 'var(--text-muted)' }}>Harga Per KG (Rp)</label>
              <input type="text" placeholder="70.000" value={formattedPrice} onChange={e => setFormattedPrice(formatPrice(e.target.value))} required />
            </div>
            <div>
              <label style={{ fontSize: '0.88rem', marginBottom: '6px', display: 'block', color: 'var(--text-muted)' }}>Stok Tersedia (KG)</label>
              <input type="number" step="0.1" placeholder="100.5" value={stockKg} onChange={e => setStockKg(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '0.88rem', marginBottom: '6px', display: 'block', color: 'var(--text-muted)' }}>Foto Ikan</label>
              <div style={{ border: '2px dashed var(--border-color)', padding: '16px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.1)' }}
                onClick={() => document.getElementById('fish-image-input')?.click()}>
                {imageFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <img src={URL.createObjectURL(imageFile)} style={{ width: '50px', height: '50px', borderRadius: '4px', objectFit: 'cover' }} alt="Preview" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)' }}>{imageFile.name} (Ganti)</span>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>
                    <Upload size={20} style={{ marginBottom: '6px' }} />
                    <p style={{ fontSize: '0.8rem' }}>Klik untuk pilih gambar</p>
                  </div>
                )}
              </div>
              <input id="fish-image-input" type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
            </div>
            <button type="submit" className="btn-primary" disabled={isUploading} style={{ marginTop: '8px', padding: '12px' }}>
              {isUploading ? (
                <><div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} /> Memproses...</>
              ) : (
                <><Upload size={16} /> Tayangkan ke Etalase</>
              )}
            </button>
          </form>
        </div>

        {/* Kolom Kanan: Tabel Stok */}
        <div style={{ flex: 2, minWidth: '0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Manajemen Stok & Harga</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Atur harga secara instan. Perubahan langsung terlihat pembeli.</p>
            </div>
            <button onClick={fetchData} className="btn-outline" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>Sync Ulang</button>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Memuat data stok...</p>
          ) : (
            <div className="glass-panel" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                    {['Pratinjau', 'Nama', 'Stok', 'Harga/Kg', 'Status', 'Kontrol'].map(h => (
                      <th key={h} style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fishes.length > 0 ? fishes.map((fish) => (
                    <tr key={fish.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                          <img src={fish.image_url || 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=100'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Fish" />
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{fish.name}</td>
                      <td style={{ padding: '14px 16px' }}>{fish.stock_kg} kg</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Rp</span>
                          <input
                            type="text"
                            defaultValue={fish.price_per_kg.toLocaleString('id-ID')}
                            onBlur={(e) => {
                              const v = parseInt(e.target.value.replace(/\./g, ''), 10);
                              if (!isNaN(v) && v !== fish.price_per_kg) handleUpdatePrice(fish.id, v);
                            }}
                            onInput={(e) => {
                              const target = e.target as HTMLInputElement;
                              const cursorPos = target.selectionStart;
                              target.value = formatPrice(target.value);
                              if (cursorPos) target.setSelectionRange(cursorPos, cursorPos);
                            }}
                            style={{ padding: '5px 8px', width: '90px', fontSize: '0.85rem', textAlign: 'right' }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold',
                          background: fish.is_sold_out ? 'rgba(225,29,72,0.1)' : 'rgba(0,166,188,0.1)',
                          color: fish.is_sold_out ? 'var(--danger-color)' : 'var(--accent-color)',
                        }}>{fish.is_sold_out ? 'HABIS' : 'AKTIF'}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button className="btn-outline" style={{ padding: '5px 10px', fontSize: '0.78rem', borderColor: 'var(--danger-color)', color: 'var(--danger-color)', background: 'transparent' }}
                          onClick={() => handleDelete(fish.id, fish.name)}>
                          <Trash2 size={13} /> Hapus
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada ikan terdaftar.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
