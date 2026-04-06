import { useRef } from 'react';

// ─── Sponsor data — professional, no emojis ───────────────────────────────────
// Each has a short abbreviation shown as a styled badge + brand color accent
const SPONSORS = [
  { name: 'Google Cloud', abbr: 'GC', color: '#4285F4', tier: 'platinum' },
  { name: 'AWS', abbr: 'AWS', color: '#FF9900', tier: 'platinum' },
  { name: 'GitHub', abbr: 'GH', color: '#E6EDF3', tier: 'gold' },
  { name: 'Vercel', abbr: '▲', color: '#FFFFFF', tier: 'gold' },
  { name: 'Appwrite', abbr: 'AW', color: '#FD366E', tier: 'gold' },
  { name: 'Microsoft Azure', abbr: 'Az', color: '#0089D6', tier: 'silver' },
  { name: 'Devfolio', abbr: 'DF', color: '#7C5CBF', tier: 'silver' },
  { name: 'MLH', abbr: 'MLH', color: '#00B0FF', tier: 'silver' },
  { name: 'Figma', abbr: 'Fg', color: '#F24E1E', tier: 'bronze' },
  { name: 'Notion', abbr: 'N', color: '#FFFFFF', tier: 'bronze' },
];

// Duplicate for seamless loop
const TRACK = [...SPONSORS, ...SPONSORS, ...SPONSORS];

interface SponsorCardProps {
  name: string;
  abbr: string;
  color: string;
}

function SponsorCard({ name, abbr, color }: SponsorCardProps) {
  return (
    <div
      className="flex items-center gap-3 px-5 py-3 border border-white/10 bg-white/[0.03]
                 rounded-xl flex-shrink-0 cursor-default select-none
                 hover:border-white/20 hover:bg-white/[0.06] transition-colors"
      style={{ minWidth: 180 }}
    >
      {/* Logo mark — colored square with abbreviation */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                   text-xs font-bold tracking-tight"
        style={{
          background: `${color}22`,   // 13% opacity background
          border: `1px solid ${color}44`,
          color,
        }}
      >
        {abbr}
      </div>

      {/* Name */}
      <span className="text-white/80 font-medium text-sm whitespace-nowrap">{name}</span>
    </div>
  );
}

export default function SponsorCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);

  const pause = () => {
    if (trackRef.current) trackRef.current.style.animationPlayState = 'paused';
  };
  const play = () => {
    if (trackRef.current) trackRef.current.style.animationPlayState = 'running';
  };

  return (
    <section className="py-14">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 text-center">
        <p className="text-xs text-cyber-gray/50 font-mono uppercase tracking-[0.25em]">
          Trusted by leading organisations
        </p>
      </div>

      {/* Carousel */}
      <div className="relative overflow-hidden">
        {/* Fade masks */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10
          bg-gradient-to-r from-cyber-dark to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10
          bg-gradient-to-l from-cyber-dark to-transparent" />

        {/* Scrolling track */}
        <div
          ref={trackRef}
          onMouseEnter={pause}
          onMouseLeave={play}
          style={{ animation: 'marquee 36s linear infinite' }}
          className="flex gap-4 w-max"
        >
          {TRACK.map((s, i) => (
            <SponsorCard key={`${s.name}-${i}`} {...s} />
          ))}
        </div>
      </div>

      {/* Divider line */}
      <div className="max-w-7xl mx-auto px-4 mt-14">
        <div className="h-px bg-gradient-to-r from-transparent via-cyber-cyan/20 to-transparent" />
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
      `}</style>
    </section>
  );
}
