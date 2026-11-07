import React from 'react';

/**
 * Marketing-only, verified Shadow Lab performance carousel.
 * Supply metrics from a validated reporting endpoint; never calculate from mock trades.
 * Example item: { id, label, value, detail, period, sampleSize, status, source }
 */
export default function ShadowLabStatsCarousel({ metrics = [], signupHref = '/signup' }) {
  const verified = metrics.filter((m) =>
    m && m.status === 'verified' && m.source && m.period && m.sampleSize > 0 &&
    m.value !== undefined && m.value !== null
  );
  if (!verified.length) return null;

  const styles = [
    { accent: '#0f766e', tilt: '-2deg', align: 'left' },
    { accent: '#4338ca', tilt: '2deg', align: 'center' },
    { accent: '#b45309', tilt: '-1deg', align: 'right' },
    { accent: '#be185d', tilt: '1deg', align: 'left' }
  ];
  return (
    <section aria-label="IMALI Shadow Lab verified results" style={{ background: '#f8fafc', padding: '3rem 1rem', color: '#101827' }}>
      <div style={{ maxWidth: 1100, margin: 'auto' }}>
        <p style={{ fontWeight: 800, letterSpacing: 3, color: '#334155' }}>IMALI / SHADOW LAB</p>
        <h2 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', margin: '0 0 1rem' }}>The numbers tell the story.</h2>
        <div style={{ display: 'flex', gap: 18, overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '1rem 0 1.75rem' }}>
          {verified.map((m, i) => {
            const s = styles[i % styles.length];
            return (
              <article key={m.id || i} style={{ flex: '0 0 min(80vw,320px)', scrollSnapAlign: 'start', padding: 28, minHeight: 330,
                background: 'white', border: '1px solid #e2e8f0', borderRadius: i % 2 ? 32 : 9,
                boxShadow: '0 12px 35px #0f172a10', transform: 'rotate(' + s.tilt + ')', textAlign: s.align }}>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>{m.label}</div>
                <div style={{ fontSize: 'clamp(3.5rem,8vw,5.3rem)', fontWeight: 900, lineHeight: 1.2, color: s.accent, margin: '1.5rem 0' }}>{m.value}</div>
                <p style={{ fontSize: 17, fontWeight: 700 }}>{m.detail}</p>
                <p style={{ fontSize: 12, color: '#475569' }}>Period: {m.period} · Sample: {m.sampleSize} · Source: {m.source}</p>
              </article>
            );
          })}
        </div>
        <p style={{ maxWidth: 720, fontSize: 13, color: '#475569' }}>
          Shadow Lab results are simulated or research results, not live customer returns.
          Past or simulated performance does not guarantee future results.
        </p>
        <a href={signupHref} style={{ display: 'inline-block', background: '#111827', color: 'white', fontWeight: 800,
          borderRadius: 999, padding: '1rem 1.5rem', textDecoration: 'none' }}>Explore IMALI AI →</a>
      </div>
    </section>
  );
}
