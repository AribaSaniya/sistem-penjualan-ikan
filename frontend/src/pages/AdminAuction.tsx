import { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
} from 'recharts';
import { supabase } from '../services/supabaseClient';
import { TrendingUp, Fish, Calendar, Award, type LucideIcon } from 'lucide-react';

/* ─── Soft & Bright Color Palette (matches ocean theme) ─── */
const CHART_COLORS = [
  '#38BDF8', // sky-400
  '#34D399', // emerald-400
  '#FB923C', // orange-400
  '#A78BFA', // violet-400
  '#F472B6', // pink-400
  '#FBBF24', // amber-400
  '#2DD4BF', // teal-400
  '#60A5FA', // blue-400
  '#F87171', // red-400
  '#4ADE80', // green-400
];

interface OrderItem {
  quantity_kg: number;
  fish_id: number;
  fish: { name: string } | { name: string }[] | null;
  orders: { created_at: string; status: string } | { created_at: string; status: string }[] | null;
}

interface DayStats {
  date: string;        // "27 Apr"
  dateISO: string;     // "2026-04-27"
  totalKg: number;
  totalTransaksi: number;
  topFish: string;
  topFishKg: number;
  fishBreakdown: { name: string; kg: number }[];
}

interface FishTotal {
  name: string;
  totalKg: number;
  percentage: number;
}

/* ─── Custom Tooltip ─── */
interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  unit?: string;
  payload?: Record<string, unknown>;
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel" style={{
        padding: '16px 20px',
        background: 'rgba(2, 6, 23, 0.95)',
        border: '1px solid rgba(56, 189, 248, 0.4)',
        borderRadius: '14px',
        minWidth: '180px'
      }}>
        <p style={{ fontWeight: 800, fontSize: '1rem', color: '#38BDF8', marginBottom: '10px' }}>{label}</p>
        {payload.map((p: TooltipPayloadItem, i: number) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', marginBottom: '4px' }}>
            <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>{p.name}:</span>
            <strong style={{ color: p.color, fontSize: '0.9rem' }}>
              {typeof p.value === 'number' ? p.value % 1 === 0 ? p.value : p.value.toFixed(1) : p.value}
              {p.unit || ''}
            </strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

interface PiePayloadItem {
  name?: string;
  value?: number;
  payload: { fill?: string; percentage?: number };
}

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0] as PiePayloadItem;
    return (
      <div className="glass-panel" style={{
        padding: '14px 18px',
        background: 'rgba(2, 6, 23, 0.95)',
        border: `1px solid ${entry.payload.fill}60`,
        borderRadius: '14px',
      }}>
        <p style={{ fontWeight: 800, color: entry.payload.fill, marginBottom: '6px' }}>{entry.name}</p>
        <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
          Total: <strong style={{ color: '#fff' }}>{Number(entry.value).toFixed(1)} kg</strong>
        </p>
        <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
          Porsi: <strong style={{ color: '#fff' }}>{entry.payload.percentage}%</strong>
        </p>
      </div>
    );
  }
  return null;
};

/* ─── Stat Card ─── */
const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: LucideIcon; label: string; value: string; sub?: string; color: string }) => (
  <div className="glass-panel" style={{
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
    background: 'rgba(15, 23, 42, 0.75)',
    border: `1px solid ${color}30`,
    borderRadius: '16px',
    flex: 1,
    minWidth: '180px'
  }}>
    <div style={{
      width: '48px', height: '48px', borderRadius: '12px',
      background: `${color}20`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0
    }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <p style={{ fontSize: '0.78rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: '0.78rem', color: color, marginTop: '4px', fontWeight: 600 }}>{sub}</p>}
    </div>
  </div>
);

/* ─── CUSTOM DONUT LABEL ─── */
const RADIAN = Math.PI / 180;

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: '0.72rem', fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function AdminAuction() {
  const [loading, setLoading] = useState(true);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [activeTab, setActiveTab] = useState<'bar' | 'line'>('bar');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Ambil semua order_items beserta info pesanan dan ikan
        const { data, error } = await supabase
          .from('order_items')
          .select(`
            quantity_kg,
            fish_id,
            fish(name),
            orders!inner(created_at, status)
          `)
          .neq('orders.status', 'cancelled');

        if (error) throw error;
        setOrderItems((data as OrderItem[]) || []);
      } catch (err) {
        console.error('Gagal ambil data penjualan:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /* ─── Proses Data ─── */
  const { dayStats, allFishTotals, summaryStats, trendData } = useMemo(() => {
    if (orderItems.length === 0) {
      return { dayStats: [], allFishTotals: [], summaryStats: { totalKg: 0, totalDays: 0, topFish: '-', avgKgPerDay: 0 }, trendData: [] };
    }

    // Kelompokkan per hari
    const byDay: Record<string, { kg: number; fishMap: Record<string, number>; count: number }> = {};
    const fishGlobal: Record<string, number> = {};

    orderItems.forEach((item) => {
      const orderData = Array.isArray(item.orders) ? item.orders[0] : item.orders;
      if (!orderData) return;

      const dateISO = new Date(orderData.created_at).toLocaleDateString('id-ID', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).split('/').reverse().join('-');

      if (!byDay[dateISO]) byDay[dateISO] = { kg: 0, fishMap: {}, count: 0 };
      byDay[dateISO].kg += Number(item.quantity_kg);
      byDay[dateISO].count += 1;

      const fishData = Array.isArray(item.fish) ? item.fish[0] : item.fish;
      const fishName = fishData?.name || 'Unknown';
      byDay[dateISO].fishMap[fishName] = (byDay[dateISO].fishMap[fishName] || 0) + Number(item.quantity_kg);
      fishGlobal[fishName] = (fishGlobal[fishName] || 0) + Number(item.quantity_kg);
    });

    // Sort by date
    const sortedDays = Object.keys(byDay).sort();
    const last7 = sortedDays.slice(-7);

    const dayStats: DayStats[] = last7.map(dateISO => {
      const d = byDay[dateISO];
      const fishBreakdown = Object.entries(d.fishMap)
        .map(([name, kg]) => ({ name, kg }))
        .sort((a, b) => b.kg - a.kg);
      const topFish = fishBreakdown[0]?.name || '-';
      const topFishKg = fishBreakdown[0]?.kg || 0;

      // Format tanggal tampil
      const parts = dateISO.split('-');
      const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const dateLabel = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

      return {
        date: dateLabel,
        dateISO,
        totalKg: Math.round(d.kg * 10) / 10,
        totalTransaksi: d.count,
        topFish,
        topFishKg: Math.round(topFishKg * 10) / 10,
        fishBreakdown,
      };
    });

    // All fish totals (global)
    const totalGlobalKg = Object.values(fishGlobal).reduce((a, b) => a + b, 0);
    const allFishTotals: FishTotal[] = Object.entries(fishGlobal)
      .map(([name, totalKg]) => ({
        name,
        totalKg: Math.round(totalKg * 10) / 10,
        percentage: totalGlobalKg > 0 ? Math.round((totalKg / totalGlobalKg) * 100) : 0,
      }))
      .sort((a, b) => b.totalKg - a.totalKg)
      .slice(0, 8);

    // Summary stats
    const topFish = allFishTotals[0]?.name || '-';
    const totalKg = Math.round(totalGlobalKg * 10) / 10;
    const totalDays = sortedDays.length;
    const avgKgPerDay = totalDays > 0 ? Math.round((totalKg / totalDays) * 10) / 10 : 0;

    // Trend data (semua hari sorted)
    const trendData = sortedDays.map(dateISO => {
      const d = byDay[dateISO];
      const parts = dateISO.split('-');
      const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const dateLabel = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      return {
        date: dateLabel,
        totalKg: Math.round(d.kg * 10) / 10,
        transaksi: d.count,
      };
    });

    return { dayStats, allFishTotals, summaryStats: { totalKg, totalDays, topFish, avgKgPerDay }, trendData };
  }, [orderItems]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid rgba(56,189,248,0.3)', borderTopColor: '#38BDF8', borderRadius: '50%' }} />
        <p style={{ color: '#64748B' }}>Memuat rekap penjualan...</p>
      </div>
    );
  }

  if (orderItems.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', marginTop: '60px' }}>
        <Fish size={48} color="#38BDF8" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ color: '#F8FAFC', marginBottom: '8px' }}>Belum Ada Data Transaksi</h2>
        <p style={{ color: '#64748B' }}>Rekap akan muncul setelah ada penjualan ikan yang berhasil.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* ─── HEADER ─── */}
      <header>
        <h2 style={{
          background: 'linear-gradient(135deg, #38BDF8 0%, #34D399 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontSize: '2rem',
          fontWeight: 800,
          marginBottom: '6px'
        }}>
          📊 Rekap Penjualan
        </h2>
        <p style={{ color: '#64748B' }}>Analisis harian ikan terlaris — dibandingkan antar hari penjualan.</p>
      </header>

      {/* ─── STAT CARDS ─── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        <StatCard
          icon={Fish}
          label="Total Terjual"
          value={`${summaryStats.totalKg} kg`}
          sub="Semua waktu"
          color="#38BDF8"
        />
        <StatCard
          icon={Calendar}
          label="Hari Penjualan"
          value={`${summaryStats.totalDays} hari`}
          sub="Memiliki transaksi"
          color="#34D399"
        />
        <StatCard
          icon={Award}
          label="Ikan Terlaris"
          value={summaryStats.topFish}
          sub="Paling diminati pembeli"
          color="#FB923C"
        />
        <StatCard
          icon={TrendingUp}
          label="Rata-rata/Hari"
          value={`${summaryStats.avgKgPerDay} kg`}
          sub="Per hari aktif"
          color="#A78BFA"
        />
      </div>

      {/* ─── GRAFIK UTAMA: DAILY KG ─── */}
      <div className="glass-panel" style={{
        padding: '28px',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(56, 189, 248, 0.15)',
        borderRadius: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>
              Volume Penjualan Harian
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.85rem' }}>7 hari terakhir — total kg ikan terjual per sesi penjualan</p>
          </div>
          {/* Tab Switch */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '4px', gap: '4px' }}>
            {(['bar', 'line'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: activeTab === tab ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                  color: activeTab === tab ? '#38BDF8' : '#64748B',
                  border: activeTab === tab ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {tab === 'bar' ? 'Batang' : 'Tren'}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          {activeTab === 'bar' ? (
            <BarChart data={dayStats} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barGap={8}>
              <defs>
                <linearGradient id="barKgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="barTxGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34D399" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(56,189,248,0.06)' }} />
              <Legend wrapperStyle={{ paddingTop: '12px', color: '#94A3B8', fontSize: '0.82rem' }} />
              <Bar yAxisId="left" dataKey="totalKg" name="Volume (kg)" fill="url(#barKgGrad)" radius={[6, 6, 0, 0]} unit=" kg" />
              <Bar yAxisId="right" dataKey="totalTransaksi" name="Transaksi" fill="url(#barTxGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '12px', color: '#94A3B8', fontSize: '0.82rem' }} />
              <Line yAxisId="left" type="monotone" dataKey="totalKg" name="Volume (kg)" stroke="#38BDF8" strokeWidth={3} dot={{ r: 5, fill: '#38BDF8' }} activeDot={{ r: 7 }} unit=" kg" />
              <Line yAxisId="right" type="monotone" dataKey="transaksi" name="Transaksi" stroke="#34D399" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: '#34D399' }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* ─── BAWAH: DONUT + TABEL REKAP ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>

        {/* DONUT CHART — Distribusi Ikan Terlaris */}
        <div className="glass-panel" style={{
          padding: '28px',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(52, 211, 153, 0.15)',
          borderRadius: '20px'
        }}>
          <h3 style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '1.05rem', marginBottom: '4px' }}>
            🏆 Ikan Terlaris
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.82rem', marginBottom: '20px' }}>Distribusi total kg per jenis ikan</p>

          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={allFishTotals}
                dataKey="totalKg"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                labelLine={false}
                label={CustomPieLabel}
              >
                {allFishTotals.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            {allFishTotals.map((f, i) => (
              <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 500 }}>{f.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: CHART_COLORS[i % CHART_COLORS.length], fontWeight: 700 }}>{f.percentage}%</span>
                  <span style={{ fontSize: '0.75rem', color: '#475569' }}>{f.totalKg} kg</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TABEL REKAP HARIAN */}
        <div className="glass-panel" style={{
          padding: '28px',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(167, 139, 250, 0.15)',
          borderRadius: '20px'
        }}>
          <h3 style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '1.05rem', marginBottom: '4px' }}>
            📅 Rekap Harian Penjualan
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.82rem', marginBottom: '20px' }}>
            Perbandingan volume &amp; ikan terlaris tiap sesi
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Tanggal', 'Volume (kg)', 'Transaksi', 'Ikan Terlaris', 'Top Qty'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      color: '#475569',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      fontSize: '0.72rem',
                      letterSpacing: '0.8px',
                      whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dayStats.slice().reverse().map((day, idx) => {
                  // Cari rank hari ini berdasarkan totalKg antar semua hari
                  const isTop = [...dayStats].sort((a, b) => b.totalKg - a.totalKg)[0]?.dateISO === day.dateISO;
                  return (
                    <tr
                      key={day.dateISO}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: isTop ? 'rgba(56, 189, 248, 0.05)' : idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                    >
                      <td style={{ padding: '12px 14px', color: isTop ? '#38BDF8' : '#CBD5E1', fontWeight: isTop ? 700 : 500, whiteSpace: 'nowrap' }}>
                        {isTop && <span style={{ marginRight: '6px' }}>🥇</span>}
                        {day.date}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Mini bar */}
                          <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(56,189,248,0.15)', flex: 1, maxWidth: '80px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              borderRadius: '3px',
                              background: 'linear-gradient(90deg, #38BDF8, #0EA5E9)',
                              width: `${Math.round((day.totalKg / Math.max(...dayStats.map(d => d.totalKg))) * 100)}%`,
                              transition: 'width 0.5s'
                            }} />
                          </div>
                          <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap' }}>{day.totalKg} kg</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: 'rgba(52, 211, 153, 0.12)',
                          color: '#34D399',
                          fontWeight: 600,
                          fontSize: '0.8rem'
                        }}>
                          {day.totalTransaksi}x
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#FB923C', fontWeight: 600 }}>
                        {day.topFish}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#94A3B8', fontSize: '0.85rem' }}>
                        {day.topFishKg} kg
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Fish Breakdown per Day — Detail Perbandingan */}
          {dayStats.length > 0 && (
            <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
              <h4 style={{ color: '#94A3B8', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>
                Detail Perbandingan Ikan Antar Hari (7 Terakhir)
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={dayStats}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    barGap={2}
                    barCategoryGap="25%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(167,139,250,0.06)' }} />
                    <Legend wrapperStyle={{ paddingTop: '8px', color: '#64748B', fontSize: '0.75rem' }} />
                    {/* Render bar per ikan terlaris (dari allFishTotals top 4) */}
                    {allFishTotals.slice(0, 5).map((fish, i) => (
                      <Bar
                        key={fish.name}
                        dataKey={(row: DayStats) => {
                          const found = row.fishBreakdown.find(f => f.name === fish.name);
                          return found ? found.kg : 0;
                        }}
                        name={fish.name}
                        fill={CHART_COLORS[i]}
                        radius={[4, 4, 0, 0]}
                        unit=" kg"
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
