import React from 'react';
import { Market } from '../types';
import { TrendingUp, Clock, BarChart3 } from 'lucide-react';
import { cn, formatCurrency, formatCompactNumber } from '../lib/utils';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

interface MarketCardProps {
  market: Market;
}

export const MarketCard: React.FC<MarketCardProps> = ({ market }) => {
  return (
    <Link to={`/market/${market.id}`}>
      <motion.div 
        whileHover={{ y: -4 }}
        className="glass-card rounded-2xl overflow-hidden cursor-pointer flex flex-col h-full"
      >
        <div className="relative h-40 overflow-hidden">
          <img 
            src={market.image} 
            alt={market.title} 
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          <div className="absolute top-3 left-3">
            <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-semibold border border-white/10">
              {market.category}
            </span>
          </div>
        </div>
        
        <div className="p-5 flex flex-col flex-grow">
          <h3 className="text-lg font-bold leading-tight mb-2 line-clamp-2">
            {market.title}
          </h3>
          
          <p className="text-xs text-gray-500 mb-4 line-clamp-2 flex-grow">
            {market.description}
          </p>
          
          <div className="flex items-center gap-4 mb-5 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <BarChart3 size={14} className="text-brand-primary" />
              <span>{formatCompactNumber(market.volume)} ALGO Vol</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} className="text-brand-secondary" />
              <span>{new Date(market.endTime).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="mt-auto grid grid-cols-2 gap-3">
            <div className="group relative px-4 py-2.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary/20 transition-all">
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-wider text-brand-primary font-bold">Yes</span>
                <span className="text-lg font-black text-brand-primary">{(market.yesPrice * 100).toFixed(0)}¢</span>
              </div>
            </div>
            
            <div className="group relative px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all">
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-wider text-red-500 font-bold">No</span>
                <span className="text-lg font-black text-red-500">{(market.noPrice * 100).toFixed(0)}¢</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
