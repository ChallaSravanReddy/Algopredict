import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users, 
  DollarSign,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Search,
  Filter
} from 'lucide-react';
import { Market } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'ended' | 'resolved'>('all');
  const [search, setSearch] = useState('');

  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ marketId: string, outcome: number, title: string, pool: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchMarkets = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch('/api/markets');
        if (res.ok) {
          const data = await res.json();
          setMarkets(data);
          setLoading(false);
          return;
        }
        throw new Error(`Failed to fetch markets: ${res.status}`);
      } catch (e) {
        console.error(`Fetch markets attempt ${i + 1} failed:`, e);
        if (i === retries - 1) {
          // Last attempt failed
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      } finally {
        if (i === retries - 1) setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (marketId: string, outcome: number) => {
    const market = markets.find(m => m.id === marketId);
    if (!market) return;

    const totalPool = (market.totalYesAmount || 0) + (market.totalNoAmount || 0);
    setConfirmModal({ marketId, outcome, title: market.title, pool: totalPool });
  };

  const executeResolve = async () => {
    if (!confirmModal) return;
    const { marketId, outcome } = confirmModal;
    
    setConfirmModal(null);
    setResolvingId(marketId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/markets/${marketId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome })
      });
      
      if (res.ok) {
        setSuccessMsg(`Market resolved successfully! Payouts have been processed.`);
        await fetchMarkets();
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        const err = await res.json();
        setErrorMsg(`Error: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to resolve market');
    } finally {
      setResolvingId(null);
    }
  };

  const filteredMarkets = markets.filter(m => {
    const isEnded = new Date(m.endTime) < new Date();
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase());
    
    if (filter === 'active') return !m.isStopped && !isEnded && matchesSearch;
    if (filter === 'ended') return !m.isStopped && isEnded && matchesSearch;
    if (filter === 'resolved') return m.isStopped && matchesSearch;
    return matchesSearch;
  });

  const stats = {
    total: markets.length,
    active: markets.filter(m => !m.isStopped && new Date(m.endTime) > new Date()).length,
    awaiting: markets.filter(m => !m.isStopped && new Date(m.endTime) < new Date()).length,
    resolved: markets.filter(m => m.isStopped).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Admin Portal</h1>
          <p className="text-gray-500 font-medium">Manage market resolutions and protocol health.</p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: LayoutDashboard, color: 'text-white' },
            { label: 'Active', value: stats.active, icon: Clock, color: 'text-brand-primary' },
            { label: 'Awaiting', value: stats.awaiting, icon: AlertCircle, color: 'text-yellow-500' },
            { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'text-brand-secondary' },
          ].map((stat, i) => (
            <div key={i} className="glass-card p-4 rounded-2xl border-white/5 min-w-[120px]">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon size={14} className={stat.color} />
                <span className="text-[10px] uppercase font-bold text-gray-500">{stat.label}</span>
              </div>
              <div className="text-2xl font-black">{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between glass-card p-4 rounded-2xl border-white/5">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text"
            placeholder="Search markets..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-primary/50"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
          {(['all', 'active', 'ended', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                filter === f ? "bg-brand-primary text-black" : "text-gray-500 hover:text-white"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Market List */}
      <div className="grid grid-cols-1 gap-4">
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/50 text-red-500 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              {errorMsg}
            </div>
            <button onClick={() => setErrorMsg(null)}><X size={16} /></button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/50 text-brand-primary text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              {successMsg}
            </div>
            <button onClick={() => setSuccessMsg(null)}><X size={16} /></button>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {filteredMarkets.map((market) => {
            const isEnded = new Date(market.endTime) < new Date();
            const totalPool = (market.totalYesAmount || 0) + (market.totalNoAmount || 0);

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={market.id}
                className={cn(
                  "glass-card rounded-3xl border-white/5 overflow-hidden transition-all hover:border-white/10",
                  market.isStopped && "opacity-75"
                )}
              >
                <div className="p-6 flex flex-col lg:flex-row gap-6">
                  {/* Market Info */}
                  <div className="flex-1 min-w-0 flex gap-4">
                    <img 
                      src={market.image} 
                      alt="" 
                      className="w-20 h-20 rounded-2xl object-cover border border-white/10 flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/5 text-gray-400">
                          {market.category}
                        </span>
                        {market.isStopped ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-brand-secondary/20 text-brand-secondary flex items-center gap-1">
                            <CheckCircle2 size={10} /> Resolved
                          </span>
                        ) : isEnded ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500 flex items-center gap-1">
                            <AlertCircle size={10} /> Awaiting Resolution
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-brand-primary/20 text-brand-primary flex items-center gap-1">
                            <Clock size={10} /> Active
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-black truncate mb-1">{market.title}</h3>
                      <p className="text-xs text-gray-500 truncate max-w-md">{market.description}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 px-6 border-x border-white/5">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Total Pool</div>
                      <div className="text-lg font-black text-white">{totalPool} ALGO</div>
                      <div className="text-[10px] text-gray-500">{(market.yesCount || 0) + (market.noCount || 0)} Predictions</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">YES / NO Split</div>
                      <div className="flex items-center gap-2">
                        <span className="text-brand-primary font-bold">{market.totalYesAmount || 0}</span>
                        <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                          <div 
                            className="h-full bg-brand-primary" 
                            style={{ width: `${totalPool > 0 ? ((market.totalYesAmount || 0) / totalPool) * 100 : 50}%` }} 
                          />
                          <div 
                            className="h-full bg-red-500" 
                            style={{ width: `${totalPool > 0 ? ((market.totalNoAmount || 0) / totalPool) * 100 : 50}%` }} 
                          />
                        </div>
                        <span className="text-red-500 font-bold">{market.totalNoAmount || 0}</span>
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">End Time</div>
                      <div className={cn(
                        "text-xs font-bold",
                        isEnded ? "text-red-500" : "text-gray-300"
                      )}>
                        {new Date(market.endTime).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col justify-center gap-2 min-w-[160px]">
                    {market.isStopped ? (
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                        <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 text-center">Result</div>
                        <div className={cn(
                          "text-center font-black text-xl",
                          market.resolvedOutcome === 1 ? "text-brand-primary" : "text-red-500"
                        )}>
                          {market.resolvedOutcome === 1 ? "YES WON" : "NO WON"}
                        </div>
                        <div className="text-[10px] text-center text-gray-500 mt-1">Payout: {market.payoutPerShare?.toFixed(2)}x</div>
                        
                        {market.payouts && market.payouts.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/5">
                            <div className="text-[10px] text-gray-500 uppercase font-bold mb-2">Recent Payouts</div>
                            <div className="space-y-1">
                              {market.payouts.slice(0, 3).map((p: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-[10px]">
                                  <span className="text-gray-400 font-mono">{p.address.slice(0, 6)}...</span>
                                  <span className="text-brand-primary font-bold">+{p.amount.toFixed(2)} ALGO</span>
                                </div>
                              ))}
                              {market.payouts.length > 3 && (
                                <div className="text-[8px] text-gray-600 text-center">+{market.payouts.length - 3} more</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <button 
                          disabled={resolvingId !== null}
                          onClick={() => handleResolve(market.id, 1)}
                          className="w-full py-2.5 rounded-xl bg-brand-primary text-black text-xs font-black uppercase tracking-tighter hover:scale-105 transition-all disabled:opacity-50"
                        >
                          {resolvingId === market.id ? "Processing..." : "Resolve YES"}
                        </button>
                        <button 
                          disabled={resolvingId !== null}
                          onClick={() => handleResolve(market.id, 0)}
                          className="w-full py-2.5 rounded-xl bg-red-500 text-white text-xs font-black uppercase tracking-tighter hover:scale-105 transition-all disabled:opacity-50"
                        >
                          {resolvingId === market.id ? "Processing..." : "Resolve NO"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredMarkets.length === 0 && (
          <div className="text-center py-20 glass-card rounded-3xl border-white/5">
            <div className="text-gray-500 font-medium">No markets found matching your criteria.</div>
          </div>
        )}
      </div>
      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md glass-card rounded-3xl p-8 border-white/10"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase tracking-tight">Confirm Resolution</h2>
                <button onClick={() => setConfirmModal(null)} className="text-gray-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Market</div>
                  <div className="font-bold text-lg">{confirmModal.title}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Winning Side</div>
                    <div className={cn(
                      "text-xl font-black",
                      confirmModal.outcome === 1 ? "text-brand-primary" : "text-red-500"
                    )}>
                      {confirmModal.outcome === 1 ? "YES" : "NO"}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Total Pool</div>
                    <div className="text-xl font-black text-white">{confirmModal.pool} ALGO</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs leading-relaxed">
                  <AlertCircle size={14} className="inline mr-2 mb-0.5" />
                  This action will finalize the market and distribute the total pool to the winning side. This cannot be undone.
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={executeResolve}
                    className="flex-1 py-3 rounded-xl bg-brand-primary text-black font-black hover:scale-[1.02] transition-all neon-glow"
                  >
                    Confirm & Resolve
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
