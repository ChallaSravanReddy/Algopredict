import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Wallet, 
  History, 
  Settings, 
  HelpCircle, 
  Search, 
  Bell,
  ExternalLink,
  Loader2,
  CheckCircle2,
  X,
  Plus,
  Zap
} from 'lucide-react';
import { Market, Activity, PortfolioItem, HistoryItem } from './types';
import { MarketCard } from './components/MarketCard';
import { ActivityFeed } from './components/ActivityFeed';
import { PriceChart } from './components/PriceChart';
import { Orderbook } from './components/Orderbook';
import { cn, formatCurrency } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { connectWallet, reconnectWallet, sendBetTransaction, getGlobalState, getAccountBalance } from './lib/algo';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { MarketDetails } from './pages/MarketDetails';
import { AdminSimulate } from './pages/AdminSimulate';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const activeTab = location.pathname === '/' ? 'Markets' : 
                    location.pathname === '/activity' ? 'Activity' :
                    location.pathname === '/portfolio' ? 'Portfolio' :
                    location.pathname === '/history' ? 'History' :
                    location.pathname === '/admin/simulate' ? 'Simulator' :
                    location.pathname === '/admin/dashboard' ? 'Admin Portal' : 'Markets';

  // Form state for new market
  const [newMarket, setNewMarket] = useState({
    title: '',
    description: '',
    category: 'Crypto',
    endTime: '',
    image: '',
    initialLiquidity: 2,
    initialPrice: 50,
    fixedTradeAmount: 1
  });

  const [isAppLoading, setIsAppLoading] = useState(true);

  const fetchBalance = useCallback(async (address: string) => {
    try {
      const balance = await getAccountBalance(address);
      setUserBalance(balance);
    } catch (e) {
      console.error("Failed to fetch balance:", e);
    }
  }, []);

  const fetchData = useCallback(async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Fetching data (attempt ${i + 1})...`);
        
        const fetchPromises: Promise<any>[] = [
          fetch('/api/markets'),
          fetch('/api/activity')
        ];

        if (userAddress) {
          fetchPromises.push(fetch(`/api/portfolio/${userAddress}`));
          fetchPromises.push(fetch(`/api/history/${userAddress}`));
          // Don't await fetchBalance here, let it run in parallel or separately
          fetchBalance(userAddress);
        }

        const responses = await Promise.all(fetchPromises);
        
        for (const res of responses) {
          if (!res.ok) throw new Error(`Server responded with error: ${res.status}`);
        }

        const [mRes, aRes, pRes, hRes] = responses;
        
        const [mData, aData] = await Promise.all([mRes.json(), aRes.json()]);
        setMarkets(mData);
        setActivities(aData);

        if (pRes && hRes) {
          const [pData, hData] = await Promise.all([pRes.json(), hRes.json()]);
          setPortfolio(pData);
          setHistory(hData);
        }
        
        setIsAppLoading(false);
        return; // Success!
      } catch (e) {
        console.error(`Fetch attempt ${i + 1} failed:`, e);
        if (i === retries - 1) {
          setIsAppLoading(false);
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
  }, [userAddress, fetchBalance]);

  useEffect(() => {
    // Fetch public data immediately
    fetchData();

    reconnectWallet().then(addr => {
      if (addr) {
        setUserAddress(addr);
      }
    });
  }, []); // Only on mount

  useEffect(() => {
    if (userAddress) {
      // Fetch user-specific data when wallet connects
      fetchData();
      fetchBalance(userAddress);
    }
  }, [userAddress, fetchData, fetchBalance]);

  // WebSocket for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Real-time update:', data);
      
      // Refresh data on relevant updates
      if (data.type === 'TRADE_EXECUTED' || data.type === 'MARKET_CREATED' || data.type === 'MARKET_RESOLVED' || data.type === 'MARKET_STOPPED' || data.type === 'MARKET_DELETED') {
        fetchData();
      }

      if (data.type === 'USER_PAYOUT' && data.address === userAddress) {
        setTxSuccess(`PAYOUT: ${data.amount.toFixed(2)} ALGO from ${data.marketTitle}`);
        fetchData();
      }
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected. Reconnecting...');
      // Simple reconnection logic could be added here
    };

    return () => socket.close();
  }, [userAddress]);

  const handleConnect = async () => {
    try {
      const addr = await connectWallet();
      setUserAddress(addr);
      fetchBalance(addr);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    try {
      const res = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newMarket, creator: userAddress })
      });
      if (res.ok) {
        setIsCreateModalOpen(false);
        setNewMarket({ title: '', description: '', category: 'Crypto', endTime: '', image: '', initialLiquidity: 2, initialPrice: 50 });
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPending(false);
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Markets', path: '/' },
    { icon: TrendingUp, label: 'Activity', path: '/activity' },
    { icon: Zap, label: 'Simulator', path: '/admin/simulate' },
    { icon: CheckCircle2, label: 'Admin Portal', path: '/admin/dashboard' },
    { icon: Wallet, label: 'Portfolio', path: '/portfolio' },
    { icon: History, label: 'History', path: '/history' },
  ];

  if (isAppLoading) {
    return (
      <div className="fixed inset-0 bg-[#050505] flex items-center justify-center z-[999]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-brand-primary animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">
              Algo<span className="text-brand-primary">Predict</span>
            </h2>
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mt-2">
              Initializing Oracle Streams...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-dark-bg text-white overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "glass border-r border-white/5 flex flex-col transition-all duration-300 z-50",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <Link to="/" className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center neon-glow">
            <TrendingUp size={20} className="text-black" />
          </div>
          {isSidebarOpen && <span className="font-black text-xl tracking-tighter">ALGO<span className="text-brand-primary">PREDICT</span></span>}
        </Link>

        <nav className="flex-grow px-3 py-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group",
                activeTab === item.label ? "bg-brand-primary/10 text-brand-primary" : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="font-semibold">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-all border border-brand-primary/20"
          >
            <Plus size={20} />
            {isSidebarOpen && <span className="font-semibold">Create Event</span>}
          </button>
          <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all">
            <Settings size={20} />
            {isSidebarOpen && <span className="font-semibold">Settings</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-20 glass border-b border-white/5 px-8 flex items-center justify-between z-40">
          <div className="flex items-center gap-4 flex-grow max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text" 
                placeholder="Search markets..." 
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-12 pr-4 focus:outline-none focus:border-brand-primary/50 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            {userAddress && (
              <div className="flex flex-col items-end">
                <div className="text-[10px] text-gray-500 uppercase font-bold">Balance</div>
                <div className="text-sm font-black text-brand-secondary">
                  {userBalance !== null ? `${(userBalance / 1000000).toFixed(2)} ALGO` : "Loading..."}
                </div>
                <a 
                  href="https://bank.testnet.algorand.network/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[10px] text-brand-primary hover:underline"
                >
                  Get Testnet ALGO
                </a>
              </div>
            )}
            <button 
              onClick={handleConnect}
              className={cn(
                "px-6 py-2.5 rounded-2xl font-bold transition-all flex items-center gap-2",
                userAddress 
                  ? "bg-white/5 border border-white/10 text-brand-primary" 
                  : "bg-brand-primary text-black hover:scale-105 neon-glow"
              )}
            >
              <Wallet size={18} />
              {userAddress ? `${userAddress.slice(0, 4)}...${userAddress.slice(-4)}` : "Connect Wallet"}
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Transaction Status Toast */}
            <AnimatePresence>
              {txSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-brand-primary/20 border border-brand-primary/50 p-4 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-brand-primary" />
                    <div>
                      <div className="font-bold">Transaction Confirmed!</div>
                      <div className="text-xs text-gray-400 font-mono">TX: {txSuccess}</div>
                    </div>
                  </div>
                  <button onClick={() => setTxSuccess(null)} className="text-gray-500 hover:text-white">
                    <X size={18} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <Routes>
              <Route path="/" element={
                <>
                  {/* Market Controls */}

                  <section>
                    <h2 className="text-2xl font-bold mb-6">Active Markets</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {markets.map(market => (
                        <MarketCard 
                          key={market.id} 
                          market={market} 
                        />
                      ))}
                    </div>
                  </section>
                </>
              } />

              <Route path="/market/:id" element={
                <MarketDetails 
                  userAddress={userAddress} 
                  onTrade={fetchData} 
                  onActivityClick={(a) => setSelectedActivity(a)} 
                  setTxSuccess={setTxSuccess}
                />
              } />

              <Route path="/activity" element={
                <section className="glass-card rounded-3xl p-8">
                  <h2 className="text-2xl font-bold mb-6">Global Activity</h2>
                  <ActivityFeed 
                    activities={activities} 
                    onActivityClick={(activity) => setSelectedActivity(activity)}
                  />
                </section>
              } />

              <Route path="/portfolio" element={
                <section className="glass-card rounded-3xl p-8">
                  <h2 className="text-2xl font-bold mb-6">Your Portfolio</h2>
                  {!userAddress ? (
                    <div className="text-center py-20">
                      <Wallet size={48} className="mx-auto text-gray-600 mb-4" />
                      <p className="text-gray-400">Connect your wallet to view your portfolio</p>
                    </div>
                  ) : portfolio.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">No active positions</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {portfolio.map((item, idx) => (
                        <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center">
                          <div>
                            <div className="text-xs text-gray-500 uppercase font-bold mb-1">{item.marketTitle}</div>
                            <div className="text-xl font-black flex items-center gap-2">
                              {item.amount} Shares 
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                item.type === 'YES' ? "bg-brand-primary/20 text-brand-primary" : "bg-red-500/20 text-red-500"
                              )}>
                                {item.type}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase mb-1">Avg Price</div>
                            <div className="text-lg font-bold">{(item.avgPrice * 100).toFixed(0)}¢</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              } />

              <Route path="/admin/simulate" element={<AdminSimulate />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />

              <Route path="/history" element={
                <section className="glass-card rounded-3xl p-8">
                  <h2 className="text-2xl font-bold mb-6">Transaction History</h2>
                  {!userAddress ? (
                    <div className="text-center py-20 text-gray-500">Connect wallet to view history</div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">No transactions yet</div>
                  ) : (
                    <div className="space-y-4">
                      {history.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              item.action.includes("YES") ? "bg-brand-primary/10 text-brand-primary" : "bg-red-500/10 text-red-500"
                            )}>
                              <TrendingUp size={18} />
                            </div>
                            <div>
                              <div className="font-bold">{item.market}</div>
                              <div className="text-xs text-gray-500">{item.action} • {item.amount} ALGO</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{item.time}</div>
                            <div className="text-[10px] text-brand-primary uppercase font-bold">{item.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              } />
            </Routes>
          </div>
        </div>

        {/* Activity Details Modal */}
        <AnimatePresence>
          {selectedActivity && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedActivity(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md glass-card rounded-3xl p-8 border-white/10"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black">Activity Details</h2>
                  <button onClick={() => setSelectedActivity(null)} className="text-gray-500 hover:text-white">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 uppercase font-bold">User</div>
                    <div className="font-mono text-brand-secondary">{selectedActivity.user}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 uppercase font-bold">Action</div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold uppercase",
                      selectedActivity.action.includes("YES") ? "bg-brand-primary/20 text-brand-primary" : "bg-red-500/20 text-red-500"
                    )}>
                      {selectedActivity.action}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 uppercase font-bold">Market</div>
                    <div className="text-sm font-semibold text-right max-w-[200px]">{selectedActivity.market}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 uppercase font-bold">Amount</div>
                    <div className="text-lg font-black">${selectedActivity.amount}</div>
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Verified Details</div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {selectedActivity.details || "No additional details available for this transaction."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-brand-primary font-bold uppercase tracking-widest justify-center">
                    <CheckCircle2 size={14} />
                    Verified on Algorand Blockchain
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Create Market Modal */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCreateModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-lg glass-card rounded-3xl p-8 border-white/10"
              >
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black">Create New Event</h2>
                    <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:text-white">
                      <X size={24} />
                    </button>
                  </div>

                <form onSubmit={handleCreateMarket} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Event Title</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Will Bitcoin hit $100k?"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-brand-primary/50"
                      value={newMarket.title}
                      onChange={e => setNewMarket({...newMarket, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                    <textarea 
                      required
                      placeholder="Provide details about the event..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 h-24 focus:outline-none focus:border-brand-primary/50"
                      value={newMarket.description}
                      onChange={e => setNewMarket({...newMarket, description: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Image URL (Optional)</label>
                    <input 
                      type="url" 
                      placeholder="https://example.com/image.jpg"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-brand-primary/50"
                      value={newMarket.image}
                      onChange={e => setNewMarket({...newMarket, image: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                      <select 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-brand-primary/50"
                        value={newMarket.category}
                        onChange={e => setNewMarket({...newMarket, category: e.target.value})}
                      >
                        <option>Crypto</option>
                        <option>Science</option>
                        <option>Sports</option>
                        <option>Politics</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Initial Liquidity (ALGO)</label>
                      <input 
                        required
                        type="number" 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-brand-primary/50"
                        value={isNaN(newMarket.initialLiquidity) ? '' : newMarket.initialLiquidity}
                        onChange={e => setNewMarket({...newMarket, initialLiquidity: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Initial YES Price (¢)</label>
                      <input 
                        required
                        type="number" 
                        min="1"
                        max="99"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-brand-primary/50"
                        value={isNaN(newMarket.initialPrice) ? '' : newMarket.initialPrice}
                        onChange={e => setNewMarket({...newMarket, initialPrice: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Fixed Trade Amount (ALGO)</label>
                      <input 
                        required
                        type="number" 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-brand-primary/50"
                        value={isNaN(newMarket.fixedTradeAmount) ? '' : newMarket.fixedTradeAmount}
                        onChange={e => setNewMarket({...newMarket, fixedTradeAmount: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">End Date</label>
                    <input 
                      required
                      type="datetime-local" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-brand-primary/50"
                      value={newMarket.endTime}
                      onChange={e => setNewMarket({...newMarket, endTime: e.target.value})}
                    />
                  </div>
                  <button 
                    disabled={isPending}
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-brand-primary text-black font-black text-lg neon-glow hover:scale-[1.02] transition-all disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="animate-spin mx-auto" /> : "Deploy Event"}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <footer className="h-12 glass border-t border-white/5 px-8 flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-widest">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-primary neon-glow" />
              <span>Algorand Testnet: Connected</span>
            </div>
            <span>Finality: 3.3s</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-brand-primary transition-colors flex items-center gap-1">
              View on Lora <ExternalLink size={10} />
            </a>
            <span>© 2026 AlgoPredict Protocol</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
