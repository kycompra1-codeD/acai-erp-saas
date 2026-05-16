const STATS = [
  { value: '14+', label: 'Módulos integrados' },
  { value: '99.9%', label: 'Uptime garantido' },
  { value: '14 dias', label: 'Trial gratuito' },
  { value: '< 5min', label: 'Setup inicial' },
];

export default function SocialProof() {
  return (
    <section className="py-16 px-4 border-y border-white/8">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {STATS.map(({ value, label }) => (
          <div key={label}>
            <div className="text-3xl md:text-4xl font-black gradient-text mb-1">{value}</div>
            <div className="text-xs text-[var(--text-muted)]">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
