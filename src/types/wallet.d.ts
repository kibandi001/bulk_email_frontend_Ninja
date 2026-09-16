// Shape used by GET/POST/PUT/PATCH/DELETE /wallets/ (Tmail API, "Wallets"
// folder). No example responses were saved in the collection, so this
// mirrors the "Create a wallet" / "Replace a wallet" request bodies —
// confirm field names (and whether balances truly come back as strings,
// which is typical for DRF DecimalField) against a live response.

export type WalletAccountStatus = number;

export interface Wallet {
  id: number;
  partnerId: number;
  accountType: string;
  actualBalance: string;
  availableBalance: string;
  accountBalanceLimit: string;
  dailyTransactionLimit: string;
  accountNumber: string;
  accountStatus: WalletAccountStatus;
  blockedAmount: string;
  setLimit: boolean;
}

export type CreateWalletInput = Omit<Wallet, 'id'>;
