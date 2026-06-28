import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { supabase } from '../services/supabaseClient';

interface MarketData {
  name: string;
  price: number;
  marketPrice: number;
  totalSoldKg: number;
}

export default function MarketChart() {
  const [data, setData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: fishRes } = await supabase.from('fish').select('id, name, price_per_kg, market_price');
        const { data: itemsRes } = await supabase.from('order_items').select('quantity_kg, fish_id');


        if (!fishRes) return;

        const statsMap: Record<number, MarketData> = {};
        
        fishRes.forEach(f => {
          statsMap[f.id] = { 
            name: f.name, 
            price: Number(f.price_per_kg), 
            marketPrice: Number(f.market_price || 0),
            totalSoldKg: 0 
          };
        });


        itemsRes?.forEach(item => {
          if (statsMap[item.fish_id]) {
            statsMap[item.fish_id].totalSoldKg += Number(item.quantity_kg);
          }
        });

        const statsArray = Object.values(statsMap);
        const sortedData = statsArray.sort((a, b) => a.totalSoldKg - b.totalSoldKg);
        setData(sortedData);
      } catch (error) {
        console.error('Gagal mengambil data market:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as MarketData;
      return (
        <div className="glass-panel" style={{ padding: '20px', background: 'rgba(10, 22, 40, 0.98)', border: '1px solid var(--accent-color)', borderRadius: '16px' }}>
          <p style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '12px', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>{label}</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px' }}>
               <span style={{ color: 'var(--text-muted)' }}>Harga TPI (Anda):</span>
               <strong style={{ color: 'var(--primary-color)' }}>Rp {data.price.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px' }}>
               <span style={{ color: 'var(--text-muted)' }}>Harga Pasar Umum:</span>
               <strong style={{ color: 'var(--accent-color)' }}>Rp {data.marketPrice.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
               <span style={{ color: 'var(--text-muted)' }}>Kuantitas Terjual:</span>
               <strong style={{ color: '#fff' }}>{data.totalSoldKg} kg</strong>
            </div>
          </div>
        </div>
      );

    }
    return null;
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ marginBottom: '32px' }}>
        <h2>Sales &amp; Revenue (Harga Pasaran Ikan)</h2>
        <p style={{ color: 'var(--text-muted)' }}>Analisis dari jenis ikan yang kurang laku hingga paling diminati pasar.</p>
      </header>

      {loading ? (
         <p>Memuat grafik analitik...</p>
      ) : (
        <div className="glass-panel" style={{ flex: 1, minHeight: '500px', display: 'flex', padding: '32px 32px 32px 0', background: 'rgba(13, 33, 55, 0.9)', border: '1px solid var(--border-color)' }}>
           {data.length === 0 ? (
             <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
               Belum ada data transaksi yang direkam.
             </div>
           ) : (
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart
                 data={data}
                 margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
               >
                 <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00A6BC" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#00A6BC" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#C9A84C" stopOpacity={0}/>
                    </linearGradient>
                 </defs>
                 
                 <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={true} />
                 <XAxis 
                   dataKey="name" 
                   tick={{ fill: '#E8F4F8' }} 
                   axisLine={{ stroke: 'var(--border-color)' }}
                   tickLine={{ stroke: 'var(--border-color)' }}
                 />
                 <YAxis 
                   yAxisId="left"
                   tick={{ fill: '#E8F4F8' }} 
                   axisLine={{ stroke: 'var(--border-color)' }}
                   tickLine={{ stroke: 'var(--border-color)' }}
                 />
                 {/* Secondary YAxis for Price just to render the shape properly relatively */}
                 <YAxis 
                   yAxisId="right"
                   orientation="right"
                   tick={{ fill: 'transparent' }} 
                   axisLine={false}
                   tickLine={false}
                   width={1}
                 />

                 <Tooltip content={<CustomTooltip />} />
                 <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '20px', color: '#E8F4F8' }} />

                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    name="Harga TPI Anda (Rp/kg)" 
                    yAxisId="right"
                    stroke="var(--primary-color)" 
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                    strokeWidth={3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="marketPrice" 
                    name="Harga Pasar Umum (Rp/kg)" 
                    yAxisId="right"
                    stroke="var(--accent-color)" 
                    fillOpacity={0.6} 
                    fill="url(#colorPrice)" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />

                 
               </AreaChart>
             </ResponsiveContainer>
           )}
        </div>
      )}
    </div>
  );
}
