export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a855f7" />
            <stop offset="1" stopColor="#6d28d9" />
          </linearGradient>
        </defs>
        <path
          d="M16 2 4 6.5v8.7c0 7.3 5.1 13.4 12 14.8 6.9-1.4 12-7.5 12-14.8V6.5z"
          fill="url(#logo-g)"
        />
        <path d="m11 16 3.5 3.5L21.5 12" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="logo-text">
        AG <strong>VPN</strong>
      </span>
    </span>
  );
}
