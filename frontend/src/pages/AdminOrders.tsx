import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart2, Calendar, TrendingUp, Package } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

interface RekapItem {
  id: number;
  quantity_kg: number;
  price_at_buy: number;
  fish_id?: number;
  fish: { name: string } | null;
  orders: {
    id: number;
    created_at: string;
    status: string;
    user_id: string;
    total_amount: number;
  };
}



export default function AdminOrders() {
  const navigate = useNavigate();
  const [items, setItems] = useState<RekapItem[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const fetchData = async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          id, created_at, status, user_id, total_amount,
          profiles!orders_user_id_fkey(name),
          order_items(id, quantity_kg, price_at_buy, fish(name))
        `)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback to query without profiles relation if it fails
        console.warn('Join with profiles failed, fetching without join');
        const { data: fallbackData, error: fbError } = await supabase
          .from('orders')
          .select(`
            id, created_at, status, user_id, total_amount,
            order_items(id, quantity_kg, price_at_buy, fish(name))
          `)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false });
          
        if (fbError) throw fbError;
        
        const flattened: RekapItem[] = [];
        (fallbackData as any[] | null)?.forEach(o => {
          o.order_items?.forEach((it: any) => {
            const fishData = Array.isArray(it.fish) ? it.fish[0] : it.fish;
            flattened.push({ ...it, fish: fishData, orders: { ...o } } as RekapItem);
          });
        });
        setItems(flattened);
        
        const uids = [...new Set(fallbackData?.map(o => o.user_id))].filter(id => !!id);
        if (uids.length > 0) {
          const { data: pData } = await supabase.from('profiles').select('id, name').in('id', uids);
          const pMap: Record<string, string> = {};
          pData?.forEach(p => pMap[p.id] = p.name);
          setProfiles(pMap);
        }
        return;
      }
      
      const flattened: RekapItem[] = [];
      const pMap: Record<string, string> = {};
      (ordersData as any[] | null)?.forEach(o => {
        const profileData = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
        if (o.user_id && profileData?.name) {
          pMap[o.user_id] = profileData.name;
        }
        o.order_items?.forEach((it: any) => {
          const fishData = Array.isArray(it.fish) ? it.fish[0] : it.fish;
          flattened.push({ ...it, fish: fishData, orders: { ...o } } as RekapItem);
        });
      });
      setItems(flattened);
      setProfiles(pMap);
    } catch (err) {
      console.error('Rekap error:', err);
    }
  };

  useEffect(() => {
    fetchData();

    // Sinkronisasi Real-time untuk Admin Rekap
    const ordersChannel = supabase.channel('admin_rekap_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  const { dailyRekap, fishChartData, ordersList, totals } = useMemo(() => {
    interface DayEntry {
      date: string;
      kg: number;
      rp: number;
      count: number;
      orderIds: Set<number>;
    }
    interface CustEntry {
      name: string;
      kg: number;
      rp: number;
      count: number;
      orders: { id: number; total_amount: number }[];
    }

    const dayMap: Record<string, DayEntry> = {};
    const custMap: Record<string, CustEntry> = {};
    const fishDayMap: Record<string, Record<string, number>> = {};
    
    items.forEach(it => {
      const rawDate = new Date(it.orders.created_at);
      const dateKey = rawDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const uid = it.orders.user_id;
      const name = profiles[uid] || (uid ? `User ${uid.substring(0,6)}` : 'Tamu');
      const fishName = it.fish?.name || 'Lainnya';

      // Daily stats
      if (!dayMap[dateKey]) dayMap[dateKey] = { date: dateKey, kg: 0, rp: 0, count: 0, orderIds: new Set() };
      dayMap[dateKey].kg += Number(it.quantity_kg);
      if (!dayMap[dateKey].orderIds.has(it.orders.id)) {
        dayMap[dateKey].rp += Number(it.orders.total_amount);
        dayMap[dateKey].count += 1;
        dayMap[dateKey].orderIds.add(it.orders.id);
      }

      // Fish popularity per day
      if (!fishDayMap[dateKey]) fishDayMap[dateKey] = {};
      fishDayMap[dateKey][fishName] = (fishDayMap[dateKey][fishName] || 0) + Number(it.quantity_kg);

      // Customer stats
      if (!custMap[name]) custMap[name] = { name, kg: 0, rp: 0, count: 0, orders: [] };
      custMap[name].kg += Number(it.quantity_kg);
      if (!custMap[name].orders.find(o => o.id === it.orders.id)) {
        custMap[name].rp += Number(it.orders.total_amount);
        custMap[name].count += 1;
        custMap[name].orders.push(it.orders);
      }
    });

    const chartData = Object.entries(fishDayMap).map(([date, fishStats]) => {
      const topFish = Object.entries(fishStats).sort((a,b) => b[1] - a[1])[0];
      return {
        date,
        name: topFish?.[0] || '-',
        value: topFish?.[1] || 0
      };
    }).slice(-7);

    // Hitung total keseluruhan tanpa duplikasi order
    const uniqueOrders = Array.from(new Set(items.map(i => i.orders.id))).map(id => items.find(i => i.orders.id === id)?.orders);

    const detailedOrders = Array.from(new Set(items.map(i => i.orders.id))).map(id => {
      const orderItems = items.filter(i => i.orders.id === id);
      const orderData = orderItems[0].orders;
      const uid = orderData.user_id;
      const name = profiles[uid] || 'Pelanggan Anonim';
      const itemNames = orderItems.map(it => `${it.fish?.name || 'Lainnya'} (${it.quantity_kg}kg)`).join(', ');
      
      const rawDate = new Date(orderData.created_at);
      const formattedDate = rawDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

      return {
        id,
        name,
        items: itemNames,
        total: orderData.total_amount,
        date: formattedDate,
        rawDate
      };
    }).sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

    return {
      dailyRekap: Object.values(dayMap).reverse(),
      fishChartData: chartData,
      ordersList: detailedOrders,
      totals: { 
        totalKg: items.reduce((s,i) => s + Number(i.quantity_kg), 0),
        totalRp: uniqueOrders.reduce((s, o) => s + Number(o?.total_amount || 0), 0),
        totalTx: uniqueOrders.length
      }
    };
  }, [items, profiles]);

  return (
    <div style={{ padding: '24px', minHeight: '100vh', color: '#F8FAFC' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '2.2rem', fontWeight: 800 }}>📊 Rekap Penjualan</h1>
          <p style={{ color: '#64748B' }}>Statistik penjualan dan minat pelanggan secara real-time.</p>
        </div>
        <button className="btn-outline" onClick={() => navigate('/admin/dashboard')} style={{ padding: '10px 24px' }}>
          <ArrowLeft size={16} /> Kembali
        </button>
      </header>

      {/* TOP STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(56,189,248,0.2)' }}>
          <TrendingUp size={24} color="#38BDF8" style={{ marginBottom: '12px' }} />
          <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Volume Terjual</p>
          <h2 style={{ fontSize: '2rem' }}>{totals.totalKg.toFixed(1)} <span style={{ fontSize: '1.1rem', opacity: 0.6 }}>kg</span></h2>
        </div>
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(52,211,153,0.2)' }}>
          <BarChart2 size={24} color="#34D399" style={{ marginBottom: '12px' }} />
          <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Omzet Total</p>
          <h2 style={{ fontSize: '2rem' }}>Rp {totals.totalRp.toLocaleString('id-ID')}</h2>
        </div>
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(251,189,36,0.2)' }}>
          <Package size={24} color="#FBBF24" style={{ marginBottom: '12px' }} />
          <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Total Transaksi</p>
          <h2 style={{ fontSize: '2rem' }}>{totals.totalTx} <span style={{ fontSize: '1.1rem', opacity: 0.6 }}>Pesanan</span></h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* GRAFIK MINAT HARIAN */}
          <section className="glass-panel" style={{ padding: '24px', background: 'rgba(15,23,42,0.6)' }}>
            <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>
              <BarChart2 size={20} color="#38BDF8" /> Ikan Paling Diminati (Per Hari)
            </h3>
            <div style={{ height: '300px', width: '100%' }}>
              {fishChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fishChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#38BDF8' }}
                    />
                    <Bar dataKey="value" name="Volume (kg)" radius={[4, 4, 0, 0]}>
                      {fishChartData.map((_, index) => (
                        <Cell key={index} fill={index % 2 === 0 ? '#38BDF8' : '#34D399'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>Belum ada data minat</div>
              )}
            </div>
            <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '12px', textAlign: 'center' }}>Grafik menunjukkan jenis ikan dengan volume pembelian tertinggi setiap harinya.</p>
          </section>

          {/* DAFTAR PESANAN PELANGGAN */}
          <section className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>
              <Package size={20} color="#FBBF24" /> Rincian Pesanan Pelanggan
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#64748B', fontSize: '0.75rem' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>TANGGAL</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>NAMA PEMBELI</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>ITEM PESANAN</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>TOTAL HARGA</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersList.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '16px', fontSize: '0.85rem', color: '#94A3B8' }}>{o.date}</td>
                      <td style={{ padding: '16px', fontWeight: 700 }}>{o.name}</td>
                      <td style={{ padding: '16px', fontSize: '0.85rem', color: '#CBD5E1' }}>{o.items}</td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: 800, color: '#FBBF24' }}>
                        Rp {Number(o.total).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* REKAP HARIAN (SIDEBAR) */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>
            <Calendar size={20} color="#10B981" /> Histori Harian
          </h3>
          <div className="glass-panel" style={{ padding: '0' }}>
            {dailyRekap.map(day => (
              <div key={day.date} style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{day.date}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{day.count} Transaksi</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#34D399', fontWeight: 700 }}>Rp {day.rp.toLocaleString('id-ID')}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{day.kg.toFixed(1)} kg</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
