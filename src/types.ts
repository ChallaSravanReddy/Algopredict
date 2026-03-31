export interface Market {
  id: string;
  appId: number;
  title: string;
  category: string;
  endTime: string;
  volume: number;
  liquidity: number;
  yesPrice: number;
  noPrice: number;
  image: string;
  description: string;
  creator?: string;
  isStopped?: boolean;
  resolvedOutcome?: number;
  payoutPerShare?: number;
  yesCount?: number;
  noCount?: number;
  totalYesAmount?: number;
  totalNoAmount?: number;
  initialPrice?: number;
  fixedTradeAmount?: number;
  trades?: { time: string; open: number; high: number; low: number; close: number }[];
  orderBook?: {
    bids: OrderbookEntry[];
    asks: OrderbookEntry[];
  };
}

export interface Activity {
  id: number;
  user: string;
  action: string;
  amount: number;
  market: string;
  time: string;
  verified?: boolean;
  details?: string;
}

export interface OrderbookEntry {
  price: number;
  size: number;
  total: number;
}

export interface PortfolioItem {
  marketId: string;
  marketTitle: string;
  amount: number;
  avgPrice: number;
  type: 'YES' | 'NO';
}

export interface HistoryItem {
  id: number;
  market: string;
  action: string;
  amount: number;
  time: string;
  status: string;
}
