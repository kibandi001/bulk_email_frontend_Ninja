import { useEffect, useState } from 'react';
import { getCampaignPerformance } from '../../services/analyticsService';
import type { Campaign } from '../../types';
import { Card } from '../../components/ui/Card';

export function Analytics() {
  const [sent, setSent] = useState<Campaign[]>([]);

  useEffect(() => {
    getCampaignPerformance().then(setSent);
  }, []);

  return (
    <div>
      <p className="section-intro">
        Delivery, open, click and unsubscribe performance by campaign. Analytics linkage
        attributes downstream site activity to the same UTM-tagged links.
      </p>
      <Card title="Campaign performance" actions={<button className="btn">Export report</button>}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Recipients</th>
              <th>Open rate</th>
              <th>Click rate</th>
              <th>Bounce rate</th>
            </tr>
          </thead>
          <tbody>
            {sent.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="mono">{c.recipients.toLocaleString()}</td>
                <td className="mono">{c.openRate}%</td>
                <td className="mono">{c.clickRate}%</td>
                <td className="mono">{c.bounceRate}%</td>
              </tr>
            ))}
            {sent.length === 0 && (
              <tr><td colSpan={5} className="empty-state">No completed campaigns yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
