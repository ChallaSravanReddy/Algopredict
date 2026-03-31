import algosdk from 'algosdk';

export interface MockAccount {
  account: algosdk.Account;
  mnemonic: string;
  address: string;
  role: 'YES' | 'NO';
  betAmount: number;
}

/**
 * Generates 30 mock accounts for the hackathon demo
 * 10 for YES, 20 for NO
 */
export function generateMockAccounts(): MockAccount[] {
  const accounts: MockAccount[] = [];
  
  for (let i = 0; i < 30; i++) {
    const account = algosdk.generateAccount();
    accounts.push({
      account,
      mnemonic: algosdk.secretKeyToMnemonic(account.sk),
      address: account.addr.toString(),
      role: i < 10 ? 'YES' : 'NO',
      betAmount: 10 // 10 ALGO
    });
  }
  
  return accounts;
}
