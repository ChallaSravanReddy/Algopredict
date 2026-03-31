import React from 'react';
import { OrderbookEntry } from '../types';

interface OrderbookProps {
  bids?: OrderbookEntry[];
  asks?: OrderbookEntry[];
}

export const Orderbook: React.FC<OrderbookProps> = ({ bids: propBids, asks: propAsks }) => {
  const defaultAsks = [
    { price: 0.68, size: 1200, total: 1200 },
    { price: 0.67, size: 850, total: 2050 },
    { price: 0.66, size: 2100, total: 4150 },
  ];

  const defaultBids = [
    { price: 0.64, size: 1500, total: 1500 },
    { price: 0.63, size: 3200, total: 4700 },
    { price: 0.62, size: 900, total: 5600 },
  ];

  const asks = propAsks || defaultAsks;
  const bids = propBids || defaultBids;

  const spread = asks.length > 0 && bids.length > 0 
    ? (asks[0].price - bids[0].price).toFixed(2) 
    : '0.00';
  const spreadPercent = asks.length > 0 && bids.length > 0
    ? ((parseFloat(spread) / asks[0].price) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col h-full">
      <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 px-2">Orderbook</h3>
      
      <div className="flex-grow flex flex-col">
        {/* Asks (Sells) */}
        <div className="space-y-1 mb-4">
          {asks.map((ask, i) => (
            <div key={i} className="relative flex items-center justify-between text-xs py-1 px-2 group">
              <div 
                className="absolute right-0 top-0 bottom-0 bg-red-500/10 transition-all" 
                style={{ width: `${(ask.size / 5000) * 100}%` }}
              />
              <span className="text-red-500 font-bold relative z-10">{ask.price.toFixed(2)}</span>
              <span className="text-gray-400 relative z-10">{ask.size}</span>
            </div>
          ))}
        </div>

        {/* Spread */}
        <div className="py-2 border-y border-white/5 text-center text-xs font-bold text-gray-500 mb-4">
          Spread: {spread} ({spreadPercent}%)
        </div>

        {/* Bids (Buys) */}
        <div className="space-y-1">
          {bids.map((bid, i) => (
            <div key={i} className="relative flex items-center justify-between text-xs py-1 px-2 group">
              <div 
                className="absolute right-0 top-0 bottom-0 bg-brand-primary/10 transition-all" 
                style={{ width: `${(bid.size / 5000) * 100}%` }}
              />
              <span className="text-brand-primary font-bold relative z-10">{bid.price.toFixed(2)}</span>
              <span className="text-gray-400 relative z-10">{bid.size}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
