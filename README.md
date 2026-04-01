

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/9b9be53f-eca3-4b09-a381-837122c626fa

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
A high-performance, non-custodial prediction market built on the Algorand blockchain. AlgoPredict allows users to trade on real-world outcomes with instant finality, minimal transaction fees, and completely trustless resolution mechanisms.

View the prototype app in AI Studio: [https://ai.studio/apps/9b9be53f-eca3-4b09-a381-837122c626fa](https://ai.studio/apps/9b9be53f-eca3-4b09-a381-837122c626fa)

## 🌟 Features

- **Decentralized & Trustless**: Markets are created and resolved using Algorand Smart Contracts (`PyTeal`), ensuring fair and automated payouts without third-party escrow.
- **Pera Wallet Integration**: Seamless authentication and transaction signing using `@perawallet/connect`.
- **AI-Powered Insights**: Integrated with the **Google Gemini API** to provide data-driven insights and market sentiment analysis.
- **Real-Time Data**: Live market graphs and statistics rendered via `recharts` and real-time backend communication using WebSockets.
- **Modern User Experience**: A highly responsive, slick web3 dashboard built with React, Tailwind CSS, and Framer Motion.

## 🛠 Tech Stack

### Frontend
- **React 19** & **Vite**: Ultra-fast development and optimized production build.
- **Tailwind CSS 4**: Utility-first CSS framework for a beautiful, responsive, and custom modern web3 interface.
- **Framer Motion**: Fluid animations for a premium user experience.

### Backend & Blockchain
- **Node.js & Express**: API and backend service logic handling integrations (`server.ts`).
- **Algorand SDK**: Interaction with the Algorand blockchain (`algosdk`).
- **PyTeal**: Python-based Smart Contracts language for Algorand (`contracts/market.py`, `contracts/prediction_market.py`).
- **Google GenAI**: AI integrations powered by Gemini models.

## 📁 Project Structure

```text
algoHack/Algopredict/
├── contracts/               # PyTeal smart contracts for market logic and payouts
├── src/                     # React App frontend
│   ├── components/          # Reusable UI components
│   ├── pages/               # Application views
│   ├── lib/                 # Utility functions and API integrations
│   ├── App.tsx              # Main routing and application layout
│   └── index.css            # Global CSS styles
├── server.ts                # Express backend server logic
├── .env.example             # Template for environment variables
└── package.json             # Project configuration and dependencies
```

## 🚀 Run Locally

**Prerequisites:** Node.js (v18+)

1. **Clone and Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Rename `.env.example` to `.env.local` (or `.env`) and add your required keys:
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```
   (Make sure to add Algorand API/Algod details if required)

3. **Run the App (Frontend + Server concurrently):**
   ```bash
   npm run dev
   ```
   *The Express server runs via `tsx`, and Vite handles the frontend.*

4. **Build for Production:**
   ```bash
   npm run build
   ```

## 📜 Smart Contracts

Contracts are written in **PyTeal** and handle the complete lifecycle of a prediction market:
- **Initialization**: Creating a new market with predefined outcomes (e.g., Yes/No).
- **Betting**: Depositing ALGO for a specific outcome before the market closes.
- **Resolution**: Setting the winning outcome (either through an oracle or AI consensus).
- **Claiming**: Automated distribution of the payout pool proportionally among the winning bettors.

---
*Built for the AlgoHack Hackathon.*
