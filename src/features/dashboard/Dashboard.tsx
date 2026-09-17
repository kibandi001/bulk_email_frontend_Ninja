import { useEffect, useMemo, useState } from 'react';
import { getDashboardSummary } from '../../services/analyticsService';
//import { getQuota } from '../../services/adminService';
import type { DashboardSummary } from '../../services/analyticsService';
import { getCampaignStatsSummary } from '../../services/campaignStatsService';
import type { CampaignStatsSummary } from '../../types/campaignStats';
import { DateRangeFilter } from '../../components/ui/DateRangeFilter';

// Reused from the original dashboard tiles so the new layout still reads as
// the same product: blue = sent/volume, purple = open engagement,
// green = click engagement, amber = deliverability issues.
const BLUE = '#159ddd';
const PURPLE = '#8650d4';
const GREEN = '#119b72';
const AMBER = '#d4813a';

function currentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}
//noma sana. nishow bana
function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function StatCard({
  icon,
  accent,
  label,
  value,
}: {
  icon: string;
  accent: string;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        border: '1px solid #ddd9cf',
        borderRadius: 10,
        padding: '18px 20px',
        boxShadow: '0 2px 12px rgba(15, 35, 60, 0.06)',
        minHeight: 100,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: `${accent}1a`, // ~10% tint of the accent for the badge background
          color: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          marginBottom: 10,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#062b52' }}>{value}</div>

      {/* purely decorative accent wave — not data */}
      <svg
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
        style={{ position: 'absolute', bottom: 0, right: 0, width: '55%', height: 28, opacity: 0.12 }}
      >
        <path d="M0,20 Q15,5 30,15 T60,10 T100,18 L100,30 L0,30 Z" fill={accent} />
      </svg>
    </div>
  );
}

function Bar({ label, pct, displayValue, color }: { label: string; pct: number; displayValue: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <div style={{ width: 140, fontSize: 13, color: '#6b7280', flexShrink: 0, textAlign: 'right' }}>
        {label}
      </div>
      <div style={{ flex: 1, backgroundColor: '#f1f0eb', borderRadius: 6, height: 18, position: 'relative' }}>
        <div
          style={{
            width: `${Math.max(pct, 2)}%`,
            height: '100%',
            borderRadius: 6,
            backgroundColor: color,
          }}
        />
      </div>
      <div style={{ width: 56, fontSize: 13, fontWeight: 600, color: '#062b52', flexShrink: 0 }}>
        {displayValue}
      </div>
    </div>
  );
}

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [stats, setStats] = useState<CampaignStatsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const defaultRange = useMemo(currentMonthRange, []);
  const [range, setRange] = useState(defaultRange);

  function loadStats(startDate: string, endDate: string) {
    getCampaignStatsSummary({ startDate, endDate })
      .then(setStats)
      .catch((reason: unknown) => {
        setStatsError(
          reason instanceof Error ? reason.message : 'Could not load campaign stats.'
        );
      });
  }

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch((reason: unknown) => {
        setError(
          reason instanceof Error
            ? reason.message
            : 'Could not load dashboard data.'
        );
      });

    loadStats(defaultRange.startDate, defaultRange.endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSent = stats?.totalEmailsSent ?? summary?.sentTotal ?? 0;
  const openRate = stats?.averageOpenRate ?? summary?.avgOpenRate;
  const clickRate = stats?.averageClickRate;
  const totalBounces = stats?.totalBounces;

  const rateMetrics = [
    { label: 'Avg Open Rate', value: stats?.averageOpenRate ?? 0, color: PURPLE },
    { label: 'Avg Click Rate', value: stats?.averageClickRate ?? 0, color: GREEN },
    { label: 'Avg Bounce Rate', value: stats?.averageBounceRate ?? 0, color: AMBER },
  ];

  const volumeMetrics = [
    { label: 'Total Sent', value: stats?.totalEmailsSent ?? 0 },
    { label: 'Total Delivered', value: stats?.totalDelivered ?? 0 },
    { label: 'Total Opened', value: stats?.totalOpened ?? 0 },
    { label: 'Total Clicked', value: stats?.totalClicked ?? 0 },
  ];
  const volumeMax = Math.max(1, ...volumeMetrics.map((m) => m.value));

  // Delivery breakdown donut — built entirely from real fields already
  // returned by campaignStatsService (delivered / bounced / unsubscribed).
  const delivered = stats?.totalDelivered ?? 0;
  const bounced = stats?.totalBounces ?? 0;
  const unsubscribed = stats?.totalUnsubscribers ?? 0;
  const donutTotal = delivered + bounced + unsubscribed;
  const donutSegments = [
    { label: 'Delivered', value: delivered, color: BLUE },
    { label: 'Bounced', value: bounced, color: AMBER },
    { label: 'Unsubscribed', value: unsubscribed, color: GREEN },
  ];
  let cumulativePct = 0;
  const conicStops = donutSegments
    .map((seg) => {
      const pct = donutTotal > 0 ? (seg.value / donutTotal) * 100 : 0;
      const start = cumulativePct;
      cumulativePct += pct;
      return `${seg.color} ${start}% ${cumulativePct}%`;
    })
    .join(', ');

  return (
    <div>
      {error && <div className="campaign-studio__alert">{error}</div>}
      {statsError && (
        <div className="campaign-studio__alert">
          Campaign stats: {statsError} (showing fallback figures where available)
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#061d38', margin: 0 }}>
          {timeOfDayGreeting()} 👋
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>
          Here's what's happening with your email campaigns today.
        </p>
      </div>

      <DateRangeFilter
        defaultStartDate={defaultRange.startDate}
        defaultEndDate={defaultRange.endDate}
        onSearch={(startDate, endDate) => {
          setRange({ startDate, endDate });
          loadStats(startDate, endDate);
        }}
        onClear={(startDate, endDate) => {
          setRange({ startDate, endDate });
          loadStats(startDate, endDate);
        }}
      />

      {/* ===================== STAT CARDS ===================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <StatCard icon="📧" accent={BLUE} label="Messages sent" value={totalSent.toLocaleString()} />
        <StatCard
          icon="📬"
          accent={PURPLE}
          label="Average open rate"
          value={openRate != null ? `${openRate.toFixed(1)}%` : '—'}
        />
        <StatCard
          icon="🖱️"
          accent={GREEN}
          label="Click rate"
          value={clickRate != null ? `${clickRate.toFixed(1)}%` : '—'}
        />
        <StatCard
          icon="⚠️"
          accent={AMBER}
          label="Bounces"
          value={totalBounces != null ? totalBounces.toLocaleString() : '—'}
        />
      </div>

      {/* ===================== MAIN CONTENT ===================== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        {/* ---- Campaign performance bars ---- */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #ddd9cf',
            borderRadius: 6,
            padding: '24px 28px',
            boxShadow: '0 2px 12px rgba(15, 35, 60, 0.06)',
          }}
        >
          <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, color: '#061d38' }}>
            Campaign Performance
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#9ca3af' }}>
            {range.startDate} to {range.endDate}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            <div>
              <h3
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#765f47',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  marginBottom: 14,
                }}
              >
                Rates
              </h3>
              {rateMetrics.map((m) => (
                <Bar
                  key={m.label}
                  label={m.label}
                  pct={Math.min(100, m.value)}
                  displayValue={`${m.value.toFixed(1)}%`}
                  color={m.color}
                />
              ))}
            </div>
            <div>
              <h3
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#765f47',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  marginBottom: 14,
                }}
              >
                Volumes
              </h3>
              {volumeMetrics.map((m) => (
                <Bar
                  key={m.label}
                  label={m.label}
                  pct={(m.value / volumeMax) * 100}
                  displayValue={m.value.toLocaleString()}
                  color={BLUE}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ---- Delivery breakdown donut ---- */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #ddd9cf',
            borderRadius: 6,
            padding: '24px 28px',
            boxShadow: '0 2px 12px rgba(15, 35, 60, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h2
            style={{
              margin: '0 0 20px',
              fontSize: 18,
              fontWeight: 700,
              color: '#061d38',
              alignSelf: 'flex-start',
            }}
          >
            Delivery Breakdown
          </h2>

          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: donutTotal > 0 ? `conic-gradient(${conicStops})` : '#f1f0eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 104,
                height: 104,
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700, color: '#062b52' }}>
                {donutTotal.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>Total</div>
            </div>
          </div>

          <div style={{ width: '100%' }}>
            {donutSegments.map((seg) => (
              <div
                key={seg.label}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: seg.color }} />
                  <span style={{ fontSize: 13, color: '#4b5563' }}>{seg.label}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#062b52' }}>
                  {donutTotal > 0 ? `${((seg.value / donutTotal) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===================== SECONDARY METRICS ===================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
          marginTop: 20,
        }}
      >
        {[
          { label: 'Total subscribers', value: stats?.totalSubscribers },
          { label: 'Total campaigns', value: stats?.totalCampaigns ?? summary?.completedCount },
          { label: 'Sending rate', value: stats?.sendingRate != null ? `${stats.sendingRate.toFixed(1)}%` : undefined },
          { label: 'Delivery rate', value: stats?.deliveryRate != null ? `${stats.deliveryRate.toFixed(1)}%` : undefined },
          { label: 'Unsubscribe rate', value: stats?.unsubscribeRate != null ? `${stats.unsubscribeRate.toFixed(1)}%` : undefined },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #ddd9cf',
              borderRadius: 8,
              padding: '14px 16px',
              boxShadow: '0 2px 10px rgba(15, 35, 60, 0.05)',
            }}
          >
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#062b52' }}>
              {item.value != null ? (typeof item.value === 'number' ? item.value.toLocaleString() : item.value) : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}