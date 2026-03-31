import React, { useState, useEffect } from 'react';
import { Market } from '../types';
import { Play, Pause, Trash2, Zap, TrendingUp, TrendingDown, Users, Activity, ExternalLink, X, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function AdminSimulate() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isSimulating, setIsSimulating] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ marketId: string, outcome: number, title: string, pool: number } | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

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
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'MARKET_CREATED' || data.type === 'MARKET_DELETED' || data.type === 'TRADE_EXECUTED') {
        fetchMarkets();
      }
    };

    return () => socket.close();
  }, []);

  const handleSimulateTrade = async (marketId: string, action: string) => {
    const market = markets.find(m => m.id === marketId);
    const amount = market?.fixedTradeAmount || Math.floor(Math.random() * 500) + 100;
    
    try {
      await fetch('/api/simulate-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId,
          action,
          amount
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleAutoSimulate = (marketId: string) => {
    setIsSimulating(prev => {
      const newState = { ...prev, [marketId]: !prev[marketId] };
      return newState;
    });
  };

  useEffect(() => {
    const intervals: Record<string, NodeJS.Timeout> = {};
    
    Object.entries(isSimulating).forEach(([marketId, active]) => {
      if (active) {
        intervals[marketId] = setInterval(() => {
          const action = Math.random() > 0.5 ? 'Buy YES' : 'Buy NO';
          handleSimulateTrade(marketId, action);
        }, Math.random() * 1000 + 500);
      }
    });

    return () => {
      Object.values(intervals).forEach(clearInterval);
    };
  }, [isSimulating]);

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
    
    try {
      await fetch(`/api/markets/${marketId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome })
      });
      await fetchMarkets();
    } catch (e) {
      console.error(e);
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
            <Zap className="text-brand-primary" />
            Market Simulator
          </h1>
          <p className="text-gray-400">Dummy purchases to make markets look active and high-volume.</p>
          <div className="mt-4 p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/30 text-xs text-brand-primary">
            <strong>Tip:</strong> Open this page in one window and the <strong>Market Details</strong> in another to watch the graph grow in real-time!
          </div>
        </div>
        <button 
          onClick={() => window.open(window.location.href, '_blank')}
          className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-400 font-bold hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <ExternalLink size={20} />
          Open in New Window
        </button>
      </div>

      <div className="grid gap-4">
        {markets.map(market => (
          <div key={market.id} className={cn(
            "glass-card p-6 rounded-3xl border-white/5 bg-white/5 flex items-center justify-between transition-all",
            market.isStopped && "opacity-60"
          )}>
            <div className="flex items-center gap-4">
              <img 
                src={market.image} 
                alt={market.title} 
                className="w-16 h-16 rounded-2xl object-cover border border-white/10"
                referrerPolicy="no-referrer"
              />
              <div>
                <h3 className="font-bold text-lg">{market.title}</h3>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <TrendingUp size={14} className="text-brand-primary" />
                    <span>YES: {(market.yesPrice * 100).toFixed(0)}¢</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Users size={14} className="text-brand-secondary" />
                    <span>Vol: {market.volume.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <DollarSign size={14} className="text-yellow-500" />
                    <span>Fixed: {market.fixedTradeAmount || 500} ALGO</span>
                  </div>
                  {market.isStopped && (
                    <div className="flex items-center gap-1.5 text-xs text-brand-secondary">
                      <CheckCircle2 size={14} />
                      <span>Resolved: {market.resolvedOutcome === 1 ? 'YES' : 'NO'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {market.isStopped ? (
                <div className="text-right">
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Final Payout</div>
                  <div className="text-lg font-black text-brand-primary">{market.payoutPerShare?.toFixed(2)}x</div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <button 
                      disabled={resolvingId === market.id}
                      onClick={() => handleSimulateTrade(market.id, 'Buy YES')}
                      className="px-4 py-2 rounded-xl bg-brand-primary/20 text-brand-primary text-xs font-bold hover:bg-brand-primary/30 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <TrendingUp size={14} />
                      Simulate YES
                    </button>
                    <button 
                      disabled={resolvingId === market.id}
                      onClick={() => handleSimulateTrade(market.id, 'Buy NO')}
                      className="px-4 py-2 rounded-xl bg-red-500/20 text-red-500 text-xs font-bold hover:bg-red-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <TrendingDown size={14} />
                      Simulate NO
                    </button>
                    <a 
                      href={`/market/${market.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 text-[10px] font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 uppercase"
                    >
                      <ExternalLink size={12} />
                      View
                    </a>
                  </div>

                  <div className="h-12 w-px bg-white/5 mx-2" />

                  <div className="flex flex-col gap-2">
                    <button 
                      disabled={resolvingId !== null}
                      onClick={() => handleResolve(market.id, 1)}
                      className="px-4 py-2 rounded-xl bg-brand-primary text-black text-[10px] font-black uppercase tracking-tighter hover:scale-105 transition-all disabled:opacity-50"
                    >
                      {resolvingId === market.id ? "..." : "Resolve YES"}
                    </button>
                    <button 
                      disabled={resolvingId !== null}
                      onClick={() => handleResolve(market.id, 0)}
                      className="px-4 py-2 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-tighter hover:scale-105 transition-all disabled:opacity-50"
                    >
                      {resolvingId === market.id ? "..." : "Resolve NO"}
                    </button>
                  </div>

                  <div className="h-12 w-px bg-white/5 mx-2" />

                  <button 
                    onClick={() => toggleAutoSimulate(market.id)}
                    className={cn(
                      "p-4 rounded-2xl transition-all flex flex-col items-center gap-1",
                      isSimulating[market.id] 
                        ? "bg-brand-primary text-black neon-glow" 
                        : "bg-white/5 text-gray-500 hover:bg-white/10"
                    )}
                  >
                    {isSimulating[market.id] ? <Pause size={24} /> : <Play size={24} />}
                    <span className="text-[8px] font-black uppercase tracking-widest">Auto</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
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
}

