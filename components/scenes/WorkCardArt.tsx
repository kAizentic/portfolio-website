"use client";

import Image from "next/image";

/**
 * Generative SVG thumbnails for the Selected Work cards. Each motif is an
 * abstract, data-viz-style illustration that evokes the card's outcome
 * (revenue growth, financing lift, coupon redemption, recovery, etc.),
 * themed to the brand accent. No raster assets — these scale crisply and
 * inherit the dark/violet aesthetic of the rest of the site.
 */

const ACCENT = "#7C3AED";
const LIGHT = "#A78BFA";
const BRIGHT = "#C4B5FD";

function Defs({ id }: { id: string }): React.JSX.Element {
  return (
    <defs>
      <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#141029" />
        <stop offset="1" stopColor="#0a0812" />
      </linearGradient>
      <radialGradient id={`${id}-halo`} cx="0.72" cy="0.22" r="0.85">
        <stop offset="0" stopColor={ACCENT} stopOpacity="0.4" />
        <stop offset="1" stopColor={ACCENT} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${id}-line`} x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor={ACCENT} />
        <stop offset="1" stopColor={BRIGHT} />
      </linearGradient>
      <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={ACCENT} stopOpacity="0.42" />
        <stop offset="1" stopColor={ACCENT} stopOpacity="0" />
      </linearGradient>
      <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.2" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

/** Outcome-specific foreground for each motif key. */
function Motif({ motif, id }: { motif: string; id: string }): React.JSX.Element {
  const line = `url(#${id}-line)`;
  const area = `url(#${id}-area)`;
  const glow = `url(#${id}-glow)`;

  switch (motif) {
    // AI Infrastructure GTM — speed / efficiency (brief in <2 days)
    case "velocity":
      return (
        <g fill="none" strokeLinecap="round">
          <line x1="48" y1="72" x2="138" y2="58" stroke={LIGHT} strokeWidth="2" opacity="0.22" />
          <line x1="56" y1="60" x2="158" y2="44" stroke={LIGHT} strokeWidth="2" opacity="0.32" />
          <path d="M66 80 L204 38" stroke={line} strokeWidth="3.5" filter={glow} />
          <g stroke={BRIGHT} strokeWidth="3" filter={glow}>
            <path d="M206 30 l16 8 -16 8" />
            <path d="M224 26 l18 10 -18 10" opacity="0.7" />
          </g>
          <circle cx="66" cy="80" r="3.5" fill={BRIGHT} filter={glow} />
        </g>
      );

    // Dell Financial Services — revenue growth (+$104M, 500K customers)
    case "revenue":
      return (
        <g>
          {[
            { x: 56, h: 26 },
            { x: 94, h: 40 },
            { x: 132, h: 34 },
            { x: 170, h: 56 },
            { x: 208, h: 70 },
          ].map((b) => (
            <rect
              key={b.x}
              x={b.x}
              y={92 - b.h}
              width="20"
              height={b.h}
              rx="3"
              fill={ACCENT}
              fillOpacity="0.25"
              stroke={ACCENT}
              strokeOpacity="0.5"
            />
          ))}
          <path
            d="M66 60 L104 46 L142 50 L180 30 L218 18"
            fill="none"
            stroke={line}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={glow}
          />
          <circle cx="218" cy="18" r="4" fill={BRIGHT} filter={glow} />
        </g>
      );

    // Premium Financing Launches — steep penetration surge (+1,200 bps)
    case "surge":
      return (
        <g>
          <path
            d="M38 92 C110 90 150 82 198 34 S252 12 264 9 L264 92 Z"
            fill={area}
          />
          <path
            d="M38 92 C110 90 150 82 198 34 S252 12 264 9"
            fill="none"
            stroke={line}
            strokeWidth="3"
            strokeLinecap="round"
            filter={glow}
          />
          <line x1="38" y1="22" x2="264" y2="22" stroke={LIGHT} strokeWidth="1" strokeDasharray="3 5" opacity="0.3" />
          <circle cx="264" cy="9" r="4" fill={BRIGHT} filter={glow} />
        </g>
      );

    // Consumer Ecommerce Merchandising — portfolio of tiles + margin uptick
    case "gridUptick":
      return (
        <g>
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={46 + col * 26}
                y={24 + row * 26}
                width="18"
                height="18"
                rx="3"
                fill={ACCENT}
                fillOpacity={0.14 + (row + col) * 0.05}
                stroke={ACCENT}
                strokeOpacity="0.4"
              />
            )),
          )}
          <path
            d="M170 78 L200 52 L218 64 L252 28"
            fill="none"
            stroke={line}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={glow}
          />
          <path d="M238 28 L252 28 L252 42" fill="none" stroke={BRIGHT} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter={glow} />
        </g>
      );

    // B2B Demand Gen — funnel narrowing to high-intent leads
    case "funnel":
      return (
        <g>
          <path d="M72 24 L228 24 L174 92 L126 92 Z" fill={area} stroke={line} strokeWidth="2.5" strokeLinejoin="round" />
          <line x1="96" y1="46" x2="204" y2="46" stroke={LIGHT} strokeWidth="1.5" opacity="0.35" />
          <line x1="116" y1="68" x2="184" y2="68" stroke={LIGHT} strokeWidth="1.5" opacity="0.35" />
          <g fill={LIGHT} opacity="0.5">
            <circle cx="100" cy="14" r="2.5" />
            <circle cx="150" cy="12" r="2.5" />
            <circle cx="200" cy="14" r="2.5" />
          </g>
          <circle cx="142" cy="102" r="3.5" fill={BRIGHT} filter={glow} />
          <circle cx="158" cy="102" r="3.5" fill={BRIGHT} filter={glow} />
        </g>
      );

    // Enterprise Lead List — network of decision-makers around a target node
    case "network": {
      const nodes = [
        { x: 88, y: 30 },
        { x: 212, y: 34 },
        { x: 68, y: 82 },
        { x: 228, y: 78 },
        { x: 150, y: 96 },
      ];
      return (
        <g>
          <g stroke={LIGHT} strokeWidth="1.5" opacity="0.4">
            {nodes.map((n) => (
              <line key={`${n.x}-${n.y}`} x1="150" y1="55" x2={n.x} y2={n.y} />
            ))}
          </g>
          {nodes.map((n) => (
            <circle key={`${n.x}-${n.y}`} cx={n.x} cy={n.y} r="4.5" fill={LIGHT} fillOpacity="0.7" />
          ))}
          <circle cx="150" cy="55" r="13" fill="none" stroke={ACCENT} strokeWidth="1.5" opacity="0.5" />
          <circle cx="150" cy="55" r="7" fill={BRIGHT} filter={glow} />
        </g>
      );
    }

    // Alienware Arena — coupon redemption ring (~63%) around a ticket
    case "redemption": {
      const r = 33;
      const c = 2 * Math.PI * r;
      return (
        <g>
          <circle cx="150" cy="55" r={r} fill="none" stroke={LIGHT} strokeWidth="6" opacity="0.18" />
          <circle
            cx="150"
            cy="55"
            r={r}
            fill="none"
            stroke={line}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${c * 0.63} ${c}`}
            transform="rotate(-90 150 55)"
            filter={glow}
          />
          <g transform="translate(150 55)">
            <rect x="-20" y="-11" width="40" height="22" rx="4" fill={ACCENT} fillOpacity="0.3" stroke={ACCENT} strokeOpacity="0.6" />
            <line x1="0" y1="-11" x2="0" y2="11" stroke={BRIGHT} strokeWidth="1.5" strokeDasharray="2 3" />
            <circle cx="-20" cy="0" r="3.5" fill="#0a0812" stroke={ACCENT} strokeOpacity="0.6" />
            <circle cx="20" cy="0" r="3.5" fill="#0a0812" stroke={ACCENT} strokeOpacity="0.6" />
          </g>
        </g>
      );
    }

    // Dell Rewards Sign-Up Bonus — decline arrested into a stable plateau
    case "stabilize":
      return (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M40 38 L130 86 L264 100" stroke={LIGHT} strokeWidth="1.5" strokeDasharray="3 5" opacity="0.35" />
          <path d="M40 44 L116 74 L150 78 L264 78" stroke={line} strokeWidth="3" filter={glow} />
          <line x1="150" y1="78" x2="264" y2="78" stroke={BRIGHT} strokeWidth="3" filter={glow} />
          <path
            d="M186 30 l3.8 7.7 8.5 1.2 -6.2 6 1.5 8.4 -7.6 -4 -7.6 4 1.5 -8.4 -6.2 -6 8.5 -1.2 Z"
            fill={BRIGHT}
            filter={glow}
          />
        </g>
      );

    // Affiliate Channel — 9x conversion multiplier
    case "multiplier":
      return (
        <g>
          <rect x="58" y="74" width="30" height="18" rx="3" fill={ACCENT} fillOpacity="0.3" stroke={ACCENT} strokeOpacity="0.5" />
          <rect x="186" y="14" width="34" height="78" rx="3" fill={area} stroke={ACCENT} strokeOpacity="0.6" />
          <path d="M104 66 L168 30" fill="none" stroke={line} strokeWidth="3" strokeLinecap="round" filter={glow} />
          <path d="M154 28 L168 30 L166 44" fill="none" stroke={BRIGHT} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter={glow} />
          <g stroke={BRIGHT} strokeWidth="2" strokeLinecap="round" opacity="0.7" filter={glow}>
            <line x1="203" y1="10" x2="203" y2="2" />
            <line x1="190" y1="13" x2="184" y2="7" />
            <line x1="216" y1="13" x2="222" y2="7" />
          </g>
        </g>
      );

    // Black Friday PC Accessories — flawless launch (all-checks) + margin rise
    case "flawless":
      return (
        <g>
          <circle cx="92" cy="55" r="27" fill="none" stroke={ACCENT} strokeWidth="2" opacity="0.5" />
          <path d="M80 56 L89 65 L106 44" fill="none" stroke={line} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter={glow} />
          <g fill={LIGHT}>
            <circle cx="150" cy="76" r="2.8" opacity="0.4" />
            <circle cx="178" cy="62" r="2.8" opacity="0.55" />
            <circle cx="206" cy="46" r="2.8" opacity="0.7" />
            <circle cx="234" cy="30" r="2.8" opacity="0.85" />
          </g>
          <path
            d="M246 18 l2.6 5.3 5.8 0.8 -4.2 4.1 1 5.7 -5.2 -2.7 -5.2 2.7 1 -5.7 -4.2 -4.1 5.8 -0.8 Z"
            fill={BRIGHT}
            filter={glow}
          />
        </g>
      );

    // POS Attach Optimization — peripherals attached to a core system + lift
    case "attach": {
      const peripherals = [
        { x: 66, y: 30 },
        { x: 66, y: 80 },
        { x: 150, y: 22 },
        { x: 150, y: 90 },
      ];
      return (
        <g>
          <g stroke={LIGHT} strokeWidth="1.5" opacity="0.45">
            {peripherals.map((p) => (
              <line key={`${p.x}-${p.y}`} x1="108" y1="55" x2={p.x} y2={p.y} />
            ))}
          </g>
          {peripherals.map((p) => (
            <rect key={`${p.x}-${p.y}`} x={p.x - 8} y={p.y - 8} width="16" height="16" rx="3" fill={LIGHT} fillOpacity="0.55" />
          ))}
          <rect x="92" y="40" width="32" height="30" rx="4" fill={ACCENT} fillOpacity="0.35" stroke={ACCENT} strokeOpacity="0.7" />
          <path d="M196 78 L226 50 L252 24" fill="none" stroke={line} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter={glow} />
          <path d="M238 24 L252 24 L252 38" fill="none" stroke={BRIGHT} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter={glow} />
        </g>
      );
    }

    // Black Friday $6M Recovery — sharp dip then catch / rebound
    case "rebound":
      return (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M40 34 L118 84 L146 90 L168 82 L260 16" stroke={line} strokeWidth="3.2" filter={glow} />
          <g stroke={BRIGHT} strokeWidth="2" opacity="0.85" filter={glow}>
            <line x1="146" y1="90" x2="146" y2="100" />
            <line x1="134" y1="94" x2="128" y2="100" />
            <line x1="158" y1="94" x2="164" y2="100" />
          </g>
          <circle cx="146" cy="90" r="4" fill={BRIGHT} filter={glow} />
          <circle cx="260" cy="16" r="4" fill={BRIGHT} filter={glow} />
        </g>
      );

    default:
      return <g />;
  }
}

/**
 * Card/modal thumbnail. Renders a real screenshot when `image` is provided
 * (e.g. a redesigned site homepage), otherwise the generative motif art.
 * Parent must be `position: relative` for the filled image to lay in.
 */
export function WorkCardThumb({
  motif,
  image,
  title,
}: {
  motif: string;
  image?: string;
  title: string;
}): React.JSX.Element {
  if (image) {
    return (
      <Image
        src={image}
        alt={`${title} — site homepage`}
        fill
        sizes="(max-width: 640px) 100vw, 520px"
        className="object-cover object-top"
      />
    );
  }
  return <WorkCardArt motif={motif} />;
}

export function WorkCardArt({ motif }: { motif: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 300 110"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <Defs id={motif} />
      <rect width="300" height="110" fill={`url(#${motif}-bg)`} />
      <rect width="300" height="110" fill={`url(#${motif}-halo)`} />
      <g stroke="#ffffff" strokeOpacity="0.04">
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={`v${i}`} x1={(i + 1) * 37.5} y1="0" x2={(i + 1) * 37.5} y2="110" />
        ))}
        {Array.from({ length: 3 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={(i + 1) * 27.5} x2="300" y2={(i + 1) * 27.5} />
        ))}
      </g>
      <Motif motif={motif} id={motif} />
    </svg>
  );
}
