import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import algosdk from "algosdk";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import compression from "compression";

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(compression());
  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Broadcast to all connected clients
  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  // Algorand Admin Client for Oracle
  const algodToken = process.env.ALGOD_TOKEN || '';
  const algodServer = process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
  const algodPort = process.env.ALGOD_PORT || '443';
  const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

  // In-memory store for demo
  let markets: any[] = [
    {
      id: "m1",
      appId: 12345678,
      title: "Will Algorand reach $1.00 by June 2026?",
      category: "Crypto",
      endTime: "2026-06-01T00:00:00Z",
      volume: 1250000,
      liquidity: 450000,
      yesPrice: 0.5,
      noPrice: 0.5,
      initialPrice: 0.5,
      yesCount: 100,
      noCount: 100,
      totalYesAmount: 100,
      totalNoAmount: 100,
      image: "https://picsum.photos/seed/algo/200/100",
      description: "Prediction on ALGO price action based on ecosystem growth and adoption.",
      creator: "ADMIN",
      isStopped: false,
      trades: [
        { time: "09:00:00", open: 0.60, high: 0.62, low: 0.59, close: 0.61 },
        { time: "10:00:00", open: 0.61, high: 0.63, low: 0.60, close: 0.62 },
        { time: "11:00:00", open: 0.62, high: 0.66, low: 0.61, close: 0.65 }
      ],
      orderBook: {
        bids: [{ price: 0.64, size: 1000, total: 1000 }, { price: 0.63, size: 2000, total: 3000 }],
        asks: [{ price: 0.66, size: 1500, total: 1500 }, { price: 0.67, size: 2500, total: 4000 }]
      }
    },
    {
      id: "m2",
      appId: 87654321,
      title: "Will a human land on Mars by 2030?",
      category: "Science",
      endTime: "2030-12-31T23:59:59Z",
      volume: 5000000,
      liquidity: 1200000,
      yesPrice: 0.5,
      noPrice: 0.5,
      initialPrice: 0.5,
      yesCount: 100,
      noCount: 100,
      totalYesAmount: 100,
      totalNoAmount: 100,
      image: "https://picsum.photos/seed/mars/200/100",
      description: "Betting on SpaceX or other space agencies achieving a crewed Mars mission.",
      creator: "ADMIN",
      isStopped: false,
      trades: [
        { time: "09:00:00", open: 0.10, high: 0.11, low: 0.09, close: 0.11 },
        { time: "10:00:00", open: 0.11, high: 0.13, low: 0.10, close: 0.12 },
        { time: "11:00:00", open: 0.12, high: 0.16, low: 0.11, close: 0.15 }
      ],
      orderBook: {
        bids: [{ price: 0.14, size: 5000, total: 5000 }, { price: 0.13, size: 10000, total: 15000 }],
        asks: [{ price: 0.16, size: 8000, total: 8000 }, { price: 0.17, size: 12000, total: 20000 }]
      }
    }
  ];

  let activities = [
    { 
      id: 1, 
      user: "A3X...9Z", 
      action: "Bought YES", 
      amount: 500, 
      market: "ALGO $1.00", 
      time: "2m ago", 
      verified: true,
      details: "User A3X...9Z purchased 500 YES shares at 0.65¢. This trade increases the probability of Algorand reaching $1.00."
    },
    { 
      id: 2, 
      user: "B7Y...2W", 
      action: "Sold NO", 
      amount: 1200, 
      market: "Mars 2030", 
      time: "5m ago", 
      verified: true,
      details: "User B7Y...2W liquidated 1200 NO shares. This suggests a shift in sentiment towards a successful Mars landing."
    },
  ];

  let userPortfolios: Record<string, any[]> = {};
  let userHistory: Record<string, any[]> = {};

  // API for Markets
  app.get("/api/markets", (req, res) => {
    res.set('Cache-Control', 'public, max-age=5');
    res.json(markets);
  });

  app.get("/api/markets/:id", (req, res) => {
    const market = markets.find(m => m.id === req.params.id);
    if (market) {
      res.json(market);
    } else {
      res.status(404).json({ error: "Market not found" });
    }
  });

  app.post("/api/markets", (req, res) => {
    const initialPrice = req.body.initialPrice ? parseFloat(req.body.initialPrice) / 100 : 0.5;
    const newMarket = {
      ...req.body,
      id: `m${markets.length + 1}`,
      appId: Math.floor(Math.random() * 100000000), // Mock App ID for new markets
      volume: 0,
      liquidity: req.body.initialLiquidity || 0,
      yesPrice: initialPrice,
      noPrice: 1 - initialPrice,
      initialPrice: initialPrice,
      yesCount: 0,
      noCount: 0,
      totalYesAmount: 0,
      totalNoAmount: 0,
      fixedTradeAmount: req.body.fixedTradeAmount || 500,
      image: req.body.image || `https://picsum.photos/seed/${req.body.title}/200/100`,
      creator: req.body.creator || "ANONYMOUS",
      isStopped: false,
      trades: Array.from({ length: 10 }, (_, i) => {
        const basePrice = initialPrice + (Math.random() - 0.5) * 0.1;
        return {
          time: new Date(Date.now() - (10 - i) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          open: basePrice,
          high: basePrice + Math.random() * 0.05,
          low: basePrice - Math.random() * 0.05,
          close: basePrice + (Math.random() - 0.5) * 0.05
        };
      }),
      orderBook: {
        bids: [{ price: initialPrice - 0.01, size: 1000, total: 1000 }],
        asks: [{ price: initialPrice + 0.01, size: 1000, total: 1000 }]
      }
    };
    markets.push(newMarket);
    broadcast({ type: 'MARKET_CREATED', market: newMarket });
    res.json(newMarket);
  });

  app.post("/api/markets/:id/resolve", (req, res) => {
    const { id } = req.params;
    const { outcome } = req.body; // 1 for YES, 0 for NO
    const market = markets.find(m => m.id === id);
    
    if (!market) return res.status(404).json({ error: "Market not found" });
    if (market.isStopped) return res.status(400).json({ error: "Market already resolved" });

    market.isStopped = true;
    market.resolvedOutcome = outcome;

    const totalYes = market.totalYesAmount || 0;
    const totalNo = market.totalNoAmount || 0;
    const totalPool = totalYes + totalNo;

    let payoutPerShare = 0;
    if (outcome === 1 && totalYes > 0) {
      payoutPerShare = totalPool / totalYes;
    } else if (outcome === 0 && totalNo > 0) {
      payoutPerShare = totalPool / totalNo;
    }

    market.payoutPerShare = payoutPerShare;
    market.payouts = [];

    // Process Payouts for all users
    Object.keys(userPortfolios).forEach(address => {
      const portfolio = userPortfolios[address];
      const positionIndex = portfolio.findIndex(p => p.marketId === id);
      
      if (positionIndex !== -1) {
        const position = portfolio[positionIndex];
        const isWinner = (outcome === 1 && position.type === 'YES') || (outcome === 0 && position.type === 'NO');
        
        if (isWinner) {
          const payoutAmount = position.amount * payoutPerShare;
          
          market.payouts.push({
            address,
            amount: payoutAmount,
            shares: position.amount,
            type: position.type
          });
          
          // Add to history
          if (!userHistory[address]) userHistory[address] = [];
          userHistory[address].unshift({
            id: `payout-${Date.now()}-${Math.random()}`,
            market: market.title,
            action: `PAYOUT: ${outcome === 1 ? 'YES' : 'NO'} WON`,
            amount: payoutAmount.toFixed(2),
            time: "Just now",
            status: "CLAIMED"
          });

          // Remove from portfolio (since it's resolved)
          portfolio.splice(positionIndex, 1);
          
          // In a real app, we would send ALGO here. 
          // For demo, we'll broadcast a payout event.
          broadcast({ 
            type: 'USER_PAYOUT', 
            address, 
            marketId: id, 
            amount: payoutAmount,
            marketTitle: market.title
          });
        } else {
          // Loser: just remove from portfolio
          portfolio.splice(positionIndex, 1);
          
          if (!userHistory[address]) userHistory[address] = [];
          userHistory[address].unshift({
            id: `loss-${Date.now()}-${Math.random()}`,
            market: market.title,
            action: `LOST: ${outcome === 1 ? 'YES' : 'NO'} WON`,
            amount: "0.00",
            time: "Just now",
            status: "RESOLVED"
          });
        }
      }
    });

    broadcast({ type: 'MARKET_RESOLVED', marketId: id, outcome, payoutPerShare });
    res.json({ success: true, payoutPerShare });
  });

  app.post("/api/markets/:id/stop", (req, res) => {
    const { address } = req.body;
    const market = markets.find(m => m.id === req.params.id);
    if (!market) return res.status(404).json({ error: "Market not found" });
    if (market.creator !== address) return res.status(403).json({ error: "Unauthorized" });
    
    market.isStopped = true;
    broadcast({ type: 'MARKET_STOPPED', marketId: market.id });
    res.json({ success: true });
  });

  app.delete("/api/markets/:id", (req, res) => {
    const { address } = req.body;
    const index = markets.findIndex(m => m.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Market not found" });
    if (markets[index].creator !== address) return res.status(403).json({ error: "Unauthorized" });
    
    const marketId = markets[index].id;
    markets.splice(index, 1);
    broadcast({ type: 'MARKET_DELETED', marketId });
    res.json({ success: true });
  });

  // Portfolio & History
  app.get("/api/portfolio/:address", (req, res) => {
    const { address } = req.params;
    res.json(userPortfolios[address] || []);
  });

  app.get("/api/history/:address", (req, res) => {
    const { address } = req.params;
    res.json(userHistory[address] || []);
  });

  app.post("/api/trade", (req, res) => {
    const { address, marketId, action, amount: reqAmount, marketTitle } = req.body;
    const market = markets.find(m => m.id === marketId);
    if (!market) return res.status(404).json({ error: "Market not found" });

    // Enforce fixed trade amount if set
    const amount = market.fixedTradeAmount || reqAmount;
    
    // Record in history
    if (!userHistory[address]) userHistory[address] = [];
    const historyItem = {
      id: Date.now(),
      market: marketTitle,
      action,
      amount,
      time: "Just now",
      status: "Confirmed"
    };
    userHistory[address].unshift(historyItem);

    // Update portfolio
    if (!userPortfolios[address]) userPortfolios[address] = [];
    const existing = userPortfolios[address].find(p => p.marketId === marketId);
    if (existing) {
      existing.amount += amount;
    } else {
      userPortfolios[address].push({
        marketId,
        marketTitle,
        amount,
        avgPrice: 0.5, // Mock
        type: action.includes("YES") ? "YES" : "NO"
      });
    }

    // Add to global activity
    const activityItem = {
      id: Date.now(),
      user: `${address.slice(0, 3)}...${address.slice(-3)}`,
      action,
      amount,
      market: marketTitle,
      time: "Just now",
      verified: true,
      details: `User ${address.slice(0, 6)}...${address.slice(-4)} executed a ${action} order for ${amount} shares on "${marketTitle}". The transaction was verified on the Algorand blockchain.`
    };
    activities.unshift(activityItem);

    // Update market prices and volume
    if (market) {
      market.volume += amount;
      const oldPrice = market.yesPrice;
      
      if (action.includes("YES")) {
        market.yesPrice = Math.min(0.99, market.yesPrice + 0.01);
        market.noPrice = 1 - market.yesPrice;
        market.yesCount = (market.yesCount || 0) + 1;
        market.totalYesAmount = (market.totalYesAmount || 0) + amount;
      } else {
        market.noPrice = Math.min(0.99, market.noPrice + 0.01);
        market.yesPrice = 1 - market.noPrice;
        market.noCount = (market.noCount || 0) + 1;
        market.totalNoAmount = (market.totalNoAmount || 0) + amount;
      }
      
      // Update trades for graph (OHLC)
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      market.trades = market.trades || [];
      const lastTrade = market.trades[market.trades.length - 1];
      const open = lastTrade ? lastTrade.close : oldPrice;
      const close = market.yesPrice;
      const high = Math.max(open, close) + Math.random() * 0.01;
      const low = Math.min(open, close) - Math.random() * 0.01;
      
      market.trades.push({ time, open, high, low, close });
      if (market.trades.length > 50) market.trades.shift();

      // Update Order Book (Simple simulation)
      market.orderBook = market.orderBook || { bids: [], asks: [] };
      if (action.includes("YES")) {
        // Buying YES pushes price up
        market.orderBook.bids = [
          { price: market.yesPrice - 0.01, size: Math.floor(Math.random() * 5000), total: 0 },
          { price: market.yesPrice - 0.02, size: Math.floor(Math.random() * 10000), total: 0 }
        ];
        market.orderBook.asks = [
          { price: market.yesPrice + 0.01, size: Math.floor(Math.random() * 5000), total: 0 },
          { price: market.yesPrice + 0.02, size: Math.floor(Math.random() * 10000), total: 0 }
        ];
      } else {
        // Buying NO pushes YES price down
        market.orderBook.bids = [
          { price: market.yesPrice - 0.01, size: Math.floor(Math.random() * 5000), total: 0 },
          { price: market.yesPrice - 0.02, size: Math.floor(Math.random() * 10000), total: 0 }
        ];
        market.orderBook.asks = [
          { price: market.yesPrice + 0.01, size: Math.floor(Math.random() * 5000), total: 0 },
          { price: market.yesPrice + 0.02, size: Math.floor(Math.random() * 10000), total: 0 }
        ];
      }
      
      // Calculate totals for order book
      let bidTotal = 0;
      market.orderBook.bids.forEach(b => { bidTotal += b.size; b.total = bidTotal; });
      let askTotal = 0;
      market.orderBook.asks.forEach(a => { askTotal += a.size; a.total = askTotal; });
    }

    broadcast({ type: 'TRADE_EXECUTED', activity: activityItem, address, marketId });
    res.json({ success: true });
  });

  app.post("/api/simulate-trade", (req, res) => {
    const { marketId, action, amount: reqAmount } = req.body;
    const market = markets.find(m => m.id === marketId);
    if (!market) return res.status(404).json({ error: "Market not found" });

    // Use fixed amount if available, otherwise use requested amount or random
    const amount = market.fixedTradeAmount || reqAmount || Math.floor(Math.random() * 500) + 100;
    
    // Dummy user address for simulation
    const dummyAddress = "SIMULATED_" + Math.random().toString(36).substring(7).toUpperCase();
    
    // Add to global activity
    const activityItem = {
      id: Date.now(),
      user: `${dummyAddress.slice(0, 3)}...${dummyAddress.slice(-3)}`,
      action,
      amount,
      market: market.title,
      time: "Just now",
      verified: true,
      details: `Simulated trade: ${action} for ${amount} shares on "${market.title}".`
    };
    activities.unshift(activityItem);

    // Update market prices and volume
    market.volume += amount;
    
    // Price move proportional to amount (e.g., 1000 shares = 0.01 move)
    const priceImpact = (amount / 10000); 
    const oldPrice = market.yesPrice;
    
    if (action.includes("YES")) {
      market.yesPrice = Math.min(0.99, market.yesPrice + Math.max(0.001, priceImpact));
      market.noPrice = 1 - market.yesPrice;
      market.yesCount = (market.yesCount || 0) + 1;
      market.totalYesAmount = (market.totalYesAmount || 0) + amount;
    } else {
      market.noPrice = Math.min(0.99, market.noPrice + Math.max(0.001, priceImpact));
      market.yesPrice = 1 - market.noPrice;
      market.noCount = (market.noCount || 0) + 1;
      market.totalNoAmount = (market.totalNoAmount || 0) + amount;
    }
    
    // Update trades for graph (OHLC)
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    market.trades = market.trades || [];
    const lastTrade = market.trades[market.trades.length - 1];
    const open = lastTrade ? lastTrade.close : oldPrice;
    const close = market.yesPrice;
    const high = Math.max(open, close) + Math.random() * 0.01;
    const low = Math.min(open, close) - Math.random() * 0.01;
    
    market.trades.push({ time, open, high, low, close });
    if (market.trades.length > 50) market.trades.shift();

    // Update Order Book with more levels and dynamic sizes
    market.orderBook = market.orderBook || { bids: [], asks: [] };
    const spread = 0.01;
    market.orderBook.bids = [
      { price: market.yesPrice - spread, size: Math.floor(Math.random() * 5000) + 1000, total: 0 },
      { price: market.yesPrice - spread - 0.01, size: Math.floor(Math.random() * 10000) + 2000, total: 0 },
      { price: market.yesPrice - spread - 0.02, size: Math.floor(Math.random() * 15000) + 3000, total: 0 }
    ];
    market.orderBook.asks = [
      { price: market.yesPrice + spread, size: Math.floor(Math.random() * 5000) + 1000, total: 0 },
      { price: market.yesPrice + spread + 0.01, size: Math.floor(Math.random() * 10000) + 2000, total: 0 },
      { price: market.yesPrice + spread + 0.02, size: Math.floor(Math.random() * 15000) + 3000, total: 0 }
    ];
    
    let bidTotal = 0;
    market.orderBook.bids.forEach(b => { bidTotal += b.size; b.total = bidTotal; });
    let askTotal = 0;
    market.orderBook.asks.forEach(a => { askTotal += a.size; a.total = askTotal; });

    // Record in userPortfolios for payout simulation
    if (!userPortfolios[dummyAddress]) userPortfolios[dummyAddress] = [];
    userPortfolios[dummyAddress].push({
      marketId,
      marketTitle: market.title,
      amount,
      avgPrice: oldPrice,
      type: action.includes("YES") ? "YES" : "NO"
    });

    broadcast({ type: 'TRADE_EXECUTED', activity: activityItem, marketId });
    res.json({ success: true });
  });

  // Oracle Resolution Route
  app.post("/api/resolve-market", async (req, res) => {
    const { appId, marketId } = req.body;
    const adminMnemonic = process.env.ADMIN_MNEMONIC;

    if (!adminMnemonic) {
      return res.status(500).json({ error: "Admin mnemonic not configured" });
    }

    try {
      // 1. Fetch real-world data (Example: ALGO price)
      const coingeckoResponse = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=algorand&vs_currencies=usd");
      const algoPrice = coingeckoResponse.data.algorand.usd;
      
      // 2. Determine outcome (Example logic)
      const winningOutcome = algoPrice >= 1.0 ? 1 : 0;

      // 3. On-Chain Update
      const adminAccount = algosdk.mnemonicToSecretKey(adminMnemonic);
      const params = await algodClient.getTransactionParams().do();
      
      const appArgs = [
        new Uint8Array(Buffer.from('resolve')),
        algosdk.encodeUint64(winningOutcome)
      ];

      const txn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: adminAccount.addr,
        appIndex: appId,
        appArgs: appArgs,
        suggestedParams: params,
      });

      const signedTxn = txn.signTxn(adminAccount.sk);
      const txResponse = await algodClient.sendRawTransaction(signedTxn).do();
      const txId = txResponse.txid;
      
      await algosdk.waitForConfirmation(algodClient, txId, 4);

      broadcast({ type: 'MARKET_RESOLVED', marketId, outcome: winningOutcome === 1 ? "YES" : "NO" });

      res.json({ 
        success: true, 
        txId, 
        outcome: winningOutcome === 1 ? "YES" : "NO",
        verifiedPrice: algoPrice 
      });
    } catch (error: any) {
      console.error("Oracle resolution failed:", error);
      res.status(500).json({ error: "Failed to resolve market", details: error.message });
    }
  });

  // Mock Activity Feed
  app.get("/api/activity", (req, res) => {
    res.set('Cache-Control', 'public, max-age=5');
    const { marketId } = req.query;
    if (marketId) {
      // For demo, we'll filter by market title snippet if marketId is provided
      // In a real app, activities would have a marketId field
      const market = markets.find(m => m.id === marketId);
      if (market) {
        return res.json(activities.filter(a => a.market.includes(market.title.slice(0, 10))));
      }
    }
    res.json(activities);
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("Backend server is fully initialized and ready to handle requests.");
  });
}

startServer();
