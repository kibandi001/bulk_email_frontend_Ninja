// Wallets (Tmail API, "Wallets" folder). No example responses were saved in
// the collection, so RawWallet is assumed to mirror the "Create a wallet" /
// "Replace a wallet" request bodies plus a server-assigned id — confirm
// against a live response.

import { apiClient } from './apiClient';
import type { CreateWalletInput, Wallet } from '../types';

interface RawWallet {
  id: number;
  partner_id: number;
  account_type: string;
  actual_balance: string;
  available_balance: string;
  account_balance_limit: string;
  daily_transaction_limit: string;
  account_number: string;
  account_status: number;
  blocked_amount: string;
  set_limit: boolean;
}

function toWallet(raw: RawWallet): Wallet {
  return {
    id: raw.id,
    partnerId: raw.partner_id,
    accountType: raw.account_type,
    actualBalance: raw.actual_balance,
    availableBalance: raw.available_balance,
    accountBalanceLimit: raw.account_balance_limit,
    dailyTransactionLimit: raw.daily_transaction_limit,
    accountNumber: raw.account_number,
    accountStatus: raw.account_status,
    blockedAmount: raw.blocked_amount,
    setLimit: raw.set_limit,
  };
}

function toRawPayload(wallet: CreateWalletInput) {
  return {
    partner_id: wallet.partnerId,
    account_type: wallet.accountType,
    actual_balance: wallet.actualBalance,
    available_balance: wallet.availableBalance,
    account_balance_limit: wallet.accountBalanceLimit,
    daily_transaction_limit: wallet.dailyTransactionLimit,
    account_number: wallet.accountNumber,
    account_status: wallet.accountStatus,
    blocked_amount: wallet.blockedAmount,
    set_limit: wallet.setLimit,
  };
}

export async function listWallets(): Promise<Wallet[]> {
  const raw = await apiClient.get<RawWallet[]>('/wallets/');
  return raw.map(toWallet);
}

export async function getWallet(id: number): Promise<Wallet> {
  const raw = await apiClient.get<RawWallet>(`/wallets/${id}/`);
  return toWallet(raw);
}

export async function createWallet(input: CreateWalletInput): Promise<Wallet> {
  const raw = await apiClient.post<RawWallet>('/wallets/', toRawPayload(input));
  return toWallet(raw);
}

/** Full-record replace. */
export async function replaceWallet(id: number, input: CreateWalletInput): Promise<Wallet> {
  const raw = await apiClient.put<RawWallet>(`/wallets/${id}/`, toRawPayload(input));
  return toWallet(raw);
}

/** Partial update — e.g. adjusting available_balance alone. */
export async function updateWallet(id: number, patch: Partial<CreateWalletInput>): Promise<Wallet> {
  const body: Record<string, unknown> = {};
  if (patch.partnerId !== undefined) body.partner_id = patch.partnerId;
  if (patch.accountType !== undefined) body.account_type = patch.accountType;
  if (patch.actualBalance !== undefined) body.actual_balance = patch.actualBalance;
  if (patch.availableBalance !== undefined) body.available_balance = patch.availableBalance;
  if (patch.accountBalanceLimit !== undefined) body.account_balance_limit = patch.accountBalanceLimit;
  if (patch.dailyTransactionLimit !== undefined) body.daily_transaction_limit = patch.dailyTransactionLimit;
  if (patch.accountNumber !== undefined) body.account_number = patch.accountNumber;
  if (patch.accountStatus !== undefined) body.account_status = patch.accountStatus;
  if (patch.blockedAmount !== undefined) body.blocked_amount = patch.blockedAmount;
  if (patch.setLimit !== undefined) body.set_limit = patch.setLimit;

  const raw = await apiClient.patch<RawWallet>(`/wallets/${id}/`, body);
  return toWallet(raw);
}

export async function deleteWallet(id: number): Promise<void> {
  await apiClient.delete<void>(`/wallets/${id}/`);
}
