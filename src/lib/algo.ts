import algosdk from 'algosdk';
import { PeraWalletConnect } from '@perawallet/connect';

// Configuration for Algorand Testnet (using AlgoNode public nodes)
const algodToken = process.env.ALGOD_TOKEN || '';
const algodServer = process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
const algodPort = process.env.ALGOD_PORT || '443';

const indexerServer = process.env.INDEXER_SERVER || 'https://testnet-idx.algonode.cloud';
const indexerPort = process.env.INDEXER_PORT || '443';

export const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);
export const indexerClient = new algosdk.Indexer(algodToken, indexerServer, indexerPort);
export const peraWallet = new PeraWalletConnect();

/**
 * Connects to Pera Wallet
 */
export async function connectWallet() {
  try {
    const accounts = await peraWallet.connect();
    peraWallet.connector?.on('disconnect', () => {
      window.location.reload();
    });
    return accounts[0];
  } catch (error) {
    console.error('Wallet connection failed:', error);
    throw error;
  }
}

/**
 * Reconnects to Pera Wallet session
 */
export async function reconnectWallet() {
  try {
    const accounts = await peraWallet.reconnectSession();
    if (accounts.length > 0) {
      peraWallet.connector?.on('disconnect', () => {
        window.location.reload();
      });
      return accounts[0];
    }
    return null;
  } catch (error) {
    console.error('Wallet reconnection failed:', error);
    return null;
  }
}

export async function getAccountBalance(address: string): Promise<number> {
  try {
    const accountInfo = await algodClient.accountInformation(address).do();
    return Number(accountInfo.amount);
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    return 0;
  }
}

/**
 * Constructs and sends a bet transaction
 * @param sender - User's address
 * @param appId - Smart contract application ID
 * @param amount - Amount in microAlgos
 * @param outcome - 1 for YES, 0 for NO
 * @param orderType - 'Market', 'Limit', or 'Stop'
 * @param price - Limit price or Stop price (optional)
 */
export async function sendBetTransaction(
  sender: string, 
  appId: number, 
  amount: number, 
  outcome: number,
  orderType: 'Market' | 'Limit' | 'Stop' = 'Market',
  price?: number
) {
  // Check account balance first
  const accountInfo = await algodClient.accountInformation(sender).do();
  const balance = accountInfo.amount;
  const minBalance = amount + 2000; // Amount + fees for 2 transactions

  if (balance < BigInt(minBalance)) {
    throw new Error(`Insufficient balance. You have ${(Number(balance) / 1000000).toFixed(2)} ALGO but need at least ${(minBalance / 1000000).toFixed(2)} ALGO. Please fund your wallet at the Algorand Testnet Faucet.`);
  }

  const params = await algodClient.getTransactionParams().do();
  
  // 1. Payment Transaction to the Smart Contract
  const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: sender,
    receiver: algosdk.getApplicationAddress(appId),
    amount: amount,
    suggestedParams: params,
  });

  // 2. Application Call Transaction
  // We encode the order type and price into appArgs
  const appArgs = [
    new Uint8Array(Buffer.from('place_bet')),
    algosdk.encodeUint64(outcome),
    new Uint8Array(Buffer.from(orderType.toLowerCase())),
    algosdk.encodeUint64(price ? Math.floor(price * 100) : 0) // Price in cents
  ];

  const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    sender: sender,
    appIndex: appId,
    appArgs: appArgs,
    suggestedParams: params,
  });

  // Group the transactions
  const txns = [payTxn, appCallTxn];
  algosdk.assignGroupID(txns);

  // Request signature from Pera Wallet
  const signedTxns = await peraWallet.signTransaction([
    [{ txn: payTxn, signers: [sender] }, { txn: appCallTxn, signers: [sender] }]
  ]);

  // Broadcast
  const txResponse = await algodClient.sendRawTransaction(signedTxns).do();
  const txId = txResponse.txid;
  
  // Wait for confirmation
  const result = await algosdk.waitForConfirmation(algodClient, txId, 4);
  return { txId, result };
}

/**
 * Fetches global state of the application
 */
export async function getGlobalState(appId: number) {
  const info = await algodClient.getApplicationByID(appId).do();
  const globalState = info.params['global-state'];
  
  const state: Record<string, any> = {};
  if (globalState) {
    globalState.forEach((item: any) => {
      const key = Buffer.from(item.key, 'base64').toString();
      const value = item.value.uint !== undefined ? item.value.uint : item.value.bytes;
      state[key] = value;
    });
  }
  return state;
}
