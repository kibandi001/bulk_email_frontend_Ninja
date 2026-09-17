import './StatusBadge.css';

type Tone = 'verified' | 'amber' | 'alert' | 'neutral' | 'blueprint';

const TONE_MAP: Record<string, Tone> = {
  granted: 'verified',
  sent: 'verified',
  delivered: 'verified',
  unsubscribed: 'neutral',
  pending: 'amber',
  scheduled: 'blueprint',
  sending: 'blueprint',
  draft: 'neutral',
  paused: 'amber',
  bounced: 'alert',
  submitted: 'neutral',
  queued: 'blueprint',
  opened: 'verified',
  clicked: 'verified',
  unopened: 'amber',
  undelivered: 'amber',
  not_clicked: 'amber',
  failed: 'alert',
  operational: 'verified',
  degraded: 'amber',
  down: 'alert',
};

export function StatusBadge({ status }: { status: string }) {
  const tone = TONE_MAP[status] ?? 'neutral';
  return <span className={`badge badge--${tone}`}>{status.replace('_', ' ')}</span>;
}
