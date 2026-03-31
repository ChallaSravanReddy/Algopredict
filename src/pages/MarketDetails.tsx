import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Market, Activity } from '../types';
import { 
  Loader2, 
  ArrowLeft, 
  CheckCircle2,
  Wallet,
  Settings,
  PauseCircle,
  Trash2,
  Users,
  Percent
} from 'lucide-react';
import { PriceChart } from '../components/PriceChart';
import { formatCurrency } from '../lib/utils';
import { sendBetTransaction } from '../lib/algo';
import { cn } from '../lib/utils';

interface MarketDetailsProps {
  userAddress: string | null;
  onTrade: () => void;
  onActivityClick: (activity: Activity) => void;
  setTxSuccess: (txId: string | null) => void;
}

export const MarketDetails: React.FC<MarketDetailsProps> = ({ userAddress, onTrade, setTxSuccess }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [market, setMarket] = useState<Market | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orderType, setOrderType] = useState<'Market' | 'Limit' | 'Stop'>('Market');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [stopPrice, setStopPrice] = useState<string>('');

  const fetchMarketData = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const mRes = await fetch(`/api/markets/${id}`);
        if (mRes.ok) {
          setMarket(await mRes.json());
          setLoading(false);
          return;
        }
        throw new Error(`Failed to fetch market data: ${mRes.status}`);
      } catch (e) {
        console.error(`Market fetch attempt ${i + 1} failed:`, e);
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
    fetchMarketData();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'TRADE_EXECUTED' && data.marketId === id) {
        fetchMarketData();
      }
      if (data.type === 'MARKET_STOPPED' && data.marketId === id) {
        fetchMarketData();
      }
    };

    return () => socket.close();
  }, [id]);

  const handleBet = async (outcome: number) => {
    if (!userAddress || !market) return;
    
    const price = orderType === 'Limit' ? parseFloat(limitPrice) / 100 : 
                  orderType === 'Stop' ? parseFloat(stopPrice) / 100 : 
                  undefined;

    if ((orderType === 'Limit' || orderType === 'Stop') && (!price || isNaN(price))) {
      alert(`Please enter a valid ${orderType.toLowerCase()} price`);
      return;
    }

    setIsPending(true);
    setIsConfirming(true);
    try {
      const tradeAmount = market.fixedTradeAmount || 1;
      const microAlgos = tradeAmount * 1000000;
      
      let txId = "MOCK_TX_" + Math.random().toString(36).substring(7).toUpperCase();
      
      // Only perform real transaction if appId is not mock
      const isMockApp = market.appId === 12345678 || market.appId === 87654321 || market.appId > 100000000;
      
      if (!isMockApp) {
        console.log("Executing real Algorand transaction...");
        const result = await sendBetTransaction(userAddress, market.appId, microAlgos, outcome, orderType, price);
        txId = result.txId;
      } else {
        console.log("Executing mock transaction for demo appId...");
        // Artificial delay for realism
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      setTxSuccess(txId);
      
      console.log("Recording trade on backend...");
      const tradeRes = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: userAddress,
          marketId: market.id,
          marketTitle: market.title,
          action: `${orderType} Buy ${outcome === 1 ? "YES" : "NO"}`,
          amount: tradeAmount,
          price: price
        })
      });

      if (!tradeRes.ok) {
        throw new Error("Failed to record trade on backend");
      }

      console.log("Trade successful, refreshing data...");
      onTrade();
      fetchMarketData();
    } catch (e: any) {
      console.error("Transaction failed:", e);
      if (e.message && e.message.includes("Insufficient balance")) {
        alert(`${e.message}\n\nFaucet: https://bank.testnet.algorand.network/`);
      } else {
        alert(`Transaction failed: ${e.message || "Unknown error"}. Please check your wallet and try again.`);
      }
    } finally {
      setIsPending(false);
      setIsConfirming(false);
    }
  };

  const handleStopMarket = async () => {
    if (!userAddress || !market) return;
    if (!confirm("Are you sure you want to stop this market? This will prevent new trades.")) return;
    
    try {
      const res = await fetch(`/api/markets/${id}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: userAddress })
      });
      if (res.ok) fetchMarketData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMarket = async () => {
    if (!userAddress || !market) return;
    if (!confirm("Are you sure you want to DELETE this market? This action cannot be undone.")) return;
    
    try {
      const res = await fetch(`/api/markets/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: userAddress })
      });
      if (res.ok) navigate('/');
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-brand-primary" size={48} />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Market Not Found</h2>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-brand-primary text-black rounded-xl font-bold"
        >
          Back to Markets
        </button>
      </div>
    );
  }

  const totalVotes = (market.yesCount || 0) + (market.noCount || 0);
  const totalPool = (market.totalYesAmount || 0) + (market.totalNoAmount || 0);
  const yesPercent = totalVotes > 0 ? Math.round(((market.yesCount || 0) / totalVotes) * 100) : 50;
  const noPercent = 100 - yesPercent;

  const isEnded = new Date(market.endTime) < new Date();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-semibold">Back to Markets</span>
      </button>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 blur-[100px] -z-10" />
            
            <div className="flex items-start justify-between mb-6 gap-6">
              <div className="w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 hidden sm:block">
                <img 
                  src={market.image} 
                  alt={market.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-grow">
                <span className="px-3 py-1 rounded-full bg-brand-primary/20 text-brand-primary text-xs font-bold uppercase tracking-wider mb-4 inline-block">
                  Live Market
                </span>
                <h1 className="text-3xl font-black leading-tight mb-4">
                  {market.title}
                </h1>
                <p className="text-gray-400 max-w-lg">
                  {market.description}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-sm text-gray-500 mb-1">Total Volume</div>
                <div className="text-2xl font-black text-brand-secondary">{formatCurrency(market.volume)}</div>
              </div>
            </div>

            <PriceChart currentPrice={market.yesPrice} data={market.trades} />

            <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6">
              <div className="flex items-center gap-4">
                {(['Market', 'Limit', 'Stop'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                      orderType === type 
                        ? "bg-brand-primary text-black" 
                        : "bg-white/5 text-gray-400 hover:text-white"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {orderType === 'Limit' && (
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-bold">Desired Price (¢)</label>
                  <input 
                    type="number"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder="e.g. 60"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>
              )}

              {orderType === 'Stop' && (
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-bold">Stop Price (¢)</label>
                  <input 
                    type="number"
                    value={stopPrice}
                    onChange={(e) => setStopPrice(e.target.value)}
                    placeholder="e.g. 40"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <button 
                disabled={isPending || !userAddress || market.isStopped}
                onClick={() => handleBet(1)}
                className="py-4 rounded-2xl bg-brand-primary text-black font-black text-lg hover:scale-[1.02] transition-transform active:scale-95 neon-glow disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 className="animate-spin" /> : `Buy YES for ${market.fixedTradeAmount || 500} ALGO`}
              </button>
              <button 
                disabled={isPending || !userAddress || market.isStopped}
                onClick={() => handleBet(0)}
                className="py-4 rounded-2xl bg-red-500 text-white font-black text-lg hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 className="animate-spin" /> : `Buy NO for ${market.fixedTradeAmount || 500} ALGO`}
              </button>
            </div>

            {market.isStopped && (
              <div className="mt-4 p-6 rounded-2xl bg-brand-primary/10 border border-brand-primary/30 space-y-4">
                <div className="flex items-center gap-3 text-brand-primary">
                  <CheckCircle2 size={24} />
                  <div className="text-xl font-black uppercase tracking-widest">Market Resolved</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Winning Outcome</div>
                    <div className={cn(
                      "text-2xl font-black",
                      market.resolvedOutcome === 1 ? "text-brand-primary" : "text-red-500"
                    )}>
                      {market.resolvedOutcome === 1 ? "YES" : "NO"}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Payout per Share</div>
                    <div className="text-2xl font-black text-white">
                      {market.payoutPerShare !== undefined ? 
                        `${market.payoutPerShare.toFixed(2)}x` 
                        : "N/A"}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 italic">
                  The total pool of {formatCurrency(totalPool)} has been divided among the {market.resolvedOutcome === 1 ? "YES" : "NO"} predictors.
                </p>
              </div>
            )}

            {isEnded && !market.isStopped && (
              <div className="mt-4 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-3 text-sm text-yellow-500">
                <PauseCircle size={18} />
                This market has reached its end time and is awaiting resolution by the admin.
              </div>
            )}

            {market.isStopped && !market.resolvedOutcome && (
              <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-sm text-red-500">
                <PauseCircle size={18} />
                This market has been stopped. No new trades are allowed.
              </div>
            )}

            {isConfirming && (
              <div className="mt-4 p-4 rounded-2xl bg-brand-secondary/10 border border-brand-secondary/30 flex items-center gap-3 text-sm text-brand-secondary animate-pulse">
                <Loader2 className="animate-spin" size={18} />
                Waiting for Algorand network confirmation...
              </div>
            )}
            
            {!userAddress && (
              <div className="mt-4 p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 flex items-center gap-3 text-sm text-brand-primary">
                <Wallet size={18} />
                Connect your wallet to start trading on this market.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {userAddress === market.creator && (
            <div className="glass-card rounded-2xl p-6 border-brand-primary/20">
              <div className="flex items-center gap-2 mb-4 text-brand-primary">
                <Settings size={18} />
                <h3 className="text-sm font-bold uppercase tracking-widest">Admin Controls</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleStopMarket}
                  disabled={market.isStopped}
                  className="flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <PauseCircle size={14} />
                  Stop Market
                </button>
                <button 
                  onClick={handleDeleteMarket}
                  className="flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 size={14} />
                  Delete Market
                </button>
              </div>
            </div>
          )}

          <div className="glass-card rounded-2xl p-6 border-white/5 space-y-6">
            <div className="flex items-center gap-2 text-gray-400">
              <Percent size={18} />
              <h3 className="text-sm font-bold uppercase tracking-widest">Market Sentiment</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-brand-primary">YES {yesPercent}%</span>
                <span className="text-red-500">NO {noPercent}%</span>
              </div>
              
              <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-brand-primary transition-all duration-1000" 
                  style={{ width: `${yesPercent}%` }}
                />
                <div 
                  className="h-full bg-red-500 transition-all duration-1000" 
                  style={{ width: `${noPercent}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div className="space-y-1">
                  <div className="text-[10px] text-gray-500 uppercase font-bold">YES Pool</div>
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-brand-primary" />
                    <span className="text-lg font-black">{market.totalYesAmount || 0} ALGO</span>
                  </div>
                  <div className="text-[10px] text-gray-500">{market.yesCount || 0} Buyers</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-gray-500 uppercase font-bold">NO Pool</div>
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-red-500" />
                    <span className="text-lg font-black">{market.totalNoAmount || 0} ALGO</span>
                  </div>
                  <div className="text-[10px] text-gray-500">{market.noCount || 0} Buyers</div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border-white/5">
            <div className="flex items-center gap-2 text-gray-400 mb-4">
              <CheckCircle2 size={18} />
              <h3 className="text-sm font-bold uppercase tracking-widest">Market Info</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">End Time</span>
                <span className={cn(
                  "font-bold",
                  isEnded ? "text-red-500" : "text-brand-primary"
                )}>
                  {new Date(market.endTime).toLocaleString()}
                  {isEnded && " (Ended)"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Total Pool</span>
                <span className="text-brand-secondary font-black">{formatCurrency(totalPool)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Liquidity</span>
                <span className="text-gray-300">{market.liquidity} ALGO</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Initial Price</span>
                <span className="text-gray-300">{(market.initialPrice * 100).toFixed(0)}¢</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
