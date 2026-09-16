import { useEffect, useState } from 'react';
import { createWallet, deleteWallet, listWallets, updateWallet } from '../../services/walletService';
import type { Wallet } from '../../types';
import { Card } from '../../components/ui/Card';

const emptyForm = {
  partnerId: '',
  accountType: 'standard',
  accountBalanceLimit: '1000.0000',
  dailyTransactionLimit: '500.0000',
  accountNumber: '',
};

export function Wallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  function load() {
    listWallets()
      .then(setWallets)
      .catch(() => setError('Could not load wallets.'));
  }

  useEffect(load, []);

  async function handleCreate() {
    if (!form.partnerId.trim() || !form.accountNumber.trim()) return;
    setError(null);
    try {
      const created = await createWallet({
        partnerId: Number(form.partnerId),
        accountType: form.accountType,
        actualBalance: '0.0000',
        availableBalance: '0.0000',
        accountBalanceLimit: form.accountBalanceLimit,
        dailyTransactionLimit: form.dailyTransactionLimit,
        accountNumber: form.accountNumber.trim(),
        accountStatus: 1,
        blockedAmount: '0.00',
        setLimit: false,
      });
      setWallets((prev) => [...prev, created]);
      setForm(emptyForm);
    } catch {
      setError('Could not create that wallet.');
    }
  }

  async function handleAdjustBalance(wallet: Wallet) {
    const next = window.prompt('New available balance', wallet.availableBalance);
    if (next == null) return;
    setError(null);
    try {
      const updated = await updateWallet(wallet.id, { availableBalance: next });
      setWallets((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    } catch {
      setError('Could not update that wallet.');
    }
  }

  async function handleDelete(wallet: Wallet) {
    setError(null);
    try {
      await deleteWallet(wallet.id);
      load();
    } catch {
      setError('Could not remove that wallet.');
    }
  }

  return (
    <div>
      <p className="section-intro">
        Wallets track a partner's sending balance and transaction limits.
      </p>

      <Card title="Create a wallet">
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="wallet-partner">Partner ID</label>
          <input
            id="wallet-partner"
            value={form.partnerId}
            onChange={(e) => setForm((f) => ({ ...f, partnerId: e.target.value }))}
          />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="wallet-account-number">Account number</label>
          <input
            id="wallet-account-number"
            value={form.accountNumber}
            onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
          />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="wallet-account-type">Account type</label>
          <input
            id="wallet-account-type"
            value={form.accountType}
            onChange={(e) => setForm((f) => ({ ...f, accountType: e.target.value }))}
          />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="wallet-balance-limit">Balance limit</label>
          <input
            id="wallet-balance-limit"
            value={form.accountBalanceLimit}
            onChange={(e) => setForm((f) => ({ ...f, accountBalanceLimit: e.target.value }))}
          />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="wallet-daily-limit">Daily transaction limit</label>
          <input
            id="wallet-daily-limit"
            value={form.dailyTransactionLimit}
            onChange={(e) => setForm((f) => ({ ...f, dailyTransactionLimit: e.target.value }))}
          />
        </div>
        {error && <p className="login__error">{error}</p>}
        <button className="btn btn--primary" onClick={handleCreate}>
          Create wallet
        </button>
      </Card>

      <Card title="Wallets" eyebrow={`${wallets.length} total`}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account #</th>
              <th>Partner</th>
              <th>Type</th>
              <th>Available</th>
              <th>Balance limit</th>
              <th>Daily limit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {wallets.map((w) => (
              <tr key={w.id}>
                <td className="mono">{w.accountNumber}</td>
                <td>{w.partnerId}</td>
                <td>{w.accountType}</td>
                <td className="mono">{w.availableBalance}</td>
                <td className="mono">{w.accountBalanceLimit}</td>
                <td className="mono">{w.dailyTransactionLimit}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => handleAdjustBalance(w)}>
                    Adjust balance
                  </button>
                  <button className="btn" onClick={() => handleDelete(w)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
