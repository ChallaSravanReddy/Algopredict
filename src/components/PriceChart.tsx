import React from 'react';
import { 
  ComposedChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface PriceChartProps {
  currentPrice: number;
  data?: { time: string; open: number; high: number; low: number; close: number }[];
}

export const PriceChart: React.FC<PriceChartProps> = ({ currentPrice, data }) => {
  // Generate semi-random historical data based on current price if no data provided
  const generateData = (price: number) => {
    const points = 20;
    const result = [];
    const now = new Date();
    
    let lastClose = price;
    for (let i = points - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60000);
      const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const open = lastClose + (Math.random() - 0.5) * 0.05;
      const close = open + (Math.random() - 0.5) * 0.05;
      const high = Math.max(open, close) + Math.random() * 0.02;
      const low = Math.min(open, close) - Math.random() * 0.02;
      
      result.push({
        time: timeStr,
        open: Math.max(0.01, Math.min(0.99, open)),
        high: Math.max(0.01, Math.min(0.99, high)),
        low: Math.max(0.01, Math.min(0.99, low)),
        close: Math.max(0.01, Math.min(0.99, close)),
      });
      lastClose = close;
    }
    return result;
  };

  const chartData = data && data.length > 0 ? data : generateData(currentPrice);

  // Prepare data for Recharts (Bar needs [min, max] for range)
  const formattedData = chartData.map(d => ({
    ...d,
    candle: [d.open, d.close],
    wick: [d.low, d.high],
    color: d.close >= d.open ? '#00FF9C' : '#FF4B4B'
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#24272E" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="#4B5563" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(time) => time.split(':').slice(0, 2).join(':')}
          />
          <YAxis 
            stroke="#4B5563" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            domain={[0, 1]}
            tickFormatter={(value) => `${(value * 100).toFixed(0)}¢`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#15171C', border: '1px solid #24272E', borderRadius: '8px' }}
            itemStyle={{ color: '#00FF9C' }}
            labelStyle={{ color: '#9CA3AF' }}
            formatter={(value: any, name: string) => {
              if (name === 'candle') return [`O: ${(value[0]*100).toFixed(1)}¢, C: ${(value[1]*100).toFixed(1)}¢`, 'Price'];
              return null;
            }}
          />
          {/* Wick */}
          <Bar dataKey="wick" barSize={2} fill="#4B5563">
            {formattedData.map((entry, index) => (
              <Cell key={`wick-${index}`} fill={entry.color} />
            ))}
          </Bar>
          {/* Candle Body */}
          <Bar dataKey="candle" barSize={12}>
            {formattedData.map((entry, index) => (
              <Cell key={`candle-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
