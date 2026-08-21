interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const FeedIcon = ({ size = 14, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} style={style} aria-hidden="true">
    <circle cx="7" cy="7" r="2.2" fill="currentColor" />
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2.8 1.4" />
    <circle cx="7" cy="7" r="6.2" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeDasharray="2.2 1.8" />
  </svg>
);

export const WalletIcon = ({ size = 14, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} style={style} aria-hidden="true">
    <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M1 6h12" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="10" cy="9.5" r="1" fill="currentColor" />
    <path d="M1 5V3.5A1.5 1.5 0 0 1 2.5 2h9A1.5 1.5 0 0 1 13 3.5V5" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const EarningsIcon = ({ size = 14, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} style={style} aria-hidden="true">
    <path
      d="M7 1.5v11M4.5 4.5C4.5 3.4 5.6 2.5 7 2.5s2.5.9 2.5 1.5c0 1.2-1.1 1.5-2.5 2-1.4.5-2.5 1-2.5 2.5C4.5 9.9 5.6 11 7 11s2.5-.9 2.5-2"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

export const SettingsIcon = ({ size = 14, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} style={style} aria-hidden="true">
    <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.6 2.6l1.1 1.1M10.3 10.3l1.1 1.1M2.6 11.4l1.1-1.1M10.3 3.7l1.1-1.1"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

export const FlameIcon = ({ size = 13, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 13 13" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M6.5 1C6.5 1 3 3.5 3 6a3.5 3.5 0 0 0 7 0C10 3.5 6.5 1 6.5 1Z" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="6.5" cy="6" r="1.2" fill="currentColor" />
  </svg>
);

export const VampIcon = ({ size = 12, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M6 1L2 4v4l4 3 4-3V4L6 1Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    <path d="M6 5v3M4.5 6.5l1.5 1 1.5-1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const UserIcon = ({ size = 14, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} style={style} aria-hidden="true">
    <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M2 12.5C2 10.3 4.24 8.5 7 8.5s5 1.8 5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const ClockIcon = ({ size = 12, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M6 1C3.24 1 1 3.24 1 6s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5Z" stroke="currentColor" strokeWidth="1.1" />
    <path d="M6 3.5v2.8l1.8 1.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

export const DeploysIcon = ({ size = 12, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M6 1.5C6 1.5 9.5 3.5 9.5 6.5a3.5 3.5 0 0 1-7 0C2.5 3.5 6 1.5 6 1.5Z" stroke="currentColor" strokeWidth="1.1" />
    <path d="M6 10.5v1M4.5 10.8l-.8.8M7.5 10.8l.8.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

export const ChartIcon = ({ size = 11, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 11 11" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M1 7.5L4 5l2 2.5L9.5 3.5" stroke="#818cf8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const FeesIcon = ({ size = 12, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <circle cx="4" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.1" />
    <circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.1" />
    <path d="M3 9L9 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

export const CloseIcon = ({ size = 10, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const SearchIcon = ({ size = 13, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 13 13" fill="none" className={className} style={style} aria-hidden="true">
    <circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export const ChevronDownIcon = ({ size = 9, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

export const CheckIcon = ({ size = 11, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M2 6.5l3 3 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const WarnIcon = ({ size = 14, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M7 1.5L12.5 11.5H1.5L7 1.5Z" stroke="#f59e0b" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M7 6v2.5M7 10v.5" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export const GearIcon = ({ size = 12, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <circle cx="6" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.1" />
    <path
      d="M6 0.8v1.4M6 9.8v1.4M0.8 6h1.4M9.8 6h1.4M2.1 2.1l1 1M8.9 8.9l1 1M2.1 9.9l1-1M8.9 3.1l1-1"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
    />
  </svg>
);

export const CopyIcon = ({ size = 12, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <rect x="4" y="4" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
    <path d="M8 4V2.5A1.5 1.5 0 0 0 6.5 1H2.5A1.5 1.5 0 0 0 1 2.5v4A1.5 1.5 0 0 0 2.5 8H4" stroke="currentColor" strokeWidth="1.1" />
  </svg>
);

export const ExternalIcon = ({ size = 11, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M5 2H2.5A1.5 1.5 0 0 0 1 3.5v6A1.5 1.5 0 0 0 2.5 11h6A1.5 1.5 0 0 0 10 9.5V7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    <path d="M7 1h4v4M11 1L5.5 6.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const TrashIcon = ({ size = 12, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M1.5 3h9M4.5 3V2a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M2.5 3l.5 7a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l.5-7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PlusIcon = ({ size = 11, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const RefreshIcon = ({ size = 12, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M10.5 6a4.5 4.5 0 1 1-1.32-3.18M10.5 1.5v2.5H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const EyeIcon = ({ size = 13, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    <circle cx="7" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export const EyeOffIcon = ({ size = 13, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M2 2l10 10M5.9 3.2A6.4 6.4 0 0 1 7 3c3.5 0 6 4 6 4a12.3 12.3 0 0 1-1.7 2.3M3.3 4.4A11.9 11.9 0 0 0 1 7s2.5 4 6 4c.8 0 1.6-.2 2.3-.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.5 5.6a1.8 1.8 0 0 0 2.6 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export const BoltIcon = ({ size = 12, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M6.5 1L2 7h3l-.5 4L9 5H6l.5-4Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
  </svg>
);

export const TargetIcon = ({ size = 12, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.1" />
    <circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="1.1" />
    <circle cx="6" cy="6" r="0.6" fill="currentColor" />
  </svg>
);

export const LayersIcon = ({ size = 12, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M6 1l5 2.5L6 6 1 3.5 6 1Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    <path d="M1 6l5 2.5L11 6M1 8.5L6 11l5-2.5" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
  </svg>
);

export const ShieldIcon = ({ size = 12, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M6 1l4.5 1.7v3C10.5 8.6 8.6 10.4 6 11 3.4 10.4 1.5 8.6 1.5 5.7v-3L6 1Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    <path d="M4 6l1.4 1.4L8 4.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ShareIcon = ({ size = 12, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <circle cx="9.5" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.1" />
    <circle cx="2.5" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.1" />
    <circle cx="9.5" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.1" />
    <path d="M3.9 5.2l4.2-2M3.9 6.8l4.2 2" stroke="currentColor" strokeWidth="1.1" />
  </svg>
);

export const FireIcon = ({ size = 12, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M6 1s.8 1.6 2 3c.8 1 1.5 2 1.5 3.4a3.5 3.5 0 1 1-7 0C2.5 5.4 4 3.5 6 1Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
  </svg>
);

export const CashbackIcon = ({ size = 12, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M2 5a4 4 0 0 1 7-1.5M10 7a4 4 0 0 1-7 1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    <path d="M9 1v2.5H6.5M3 11V8.5h2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AgentIcon = ({ size = 12, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <rect x="2.5" y="3.5" width="7" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
    <circle cx="4.8" cy="6.2" r="0.7" fill="currentColor" />
    <circle cx="7.2" cy="6.2" r="0.7" fill="currentColor" />
    <path d="M6 3.5V2M4 2h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

export const TradeIcon = ({ size = 12, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className} style={style} aria-hidden="true">
    <path d="M1.5 4h7M6.5 2L8.5 4 6.5 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.5 8h-7M5.5 6L3.5 8l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MayhemIcon = ({ size = 13, className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 13 13" fill="none" className={className} style={style} aria-hidden="true">
    <path
      d="M6.5 11.5c-2.3 0-4-1.6-4-3.6 0-1.5 1-2.7 2.1-3.7C5.3 3.5 6 2.4 6.5 1.4c.5 1 1.2 2.1 1.9 2.8 1.1 1 2.1 2.2 2.1 3.7 0 2-1.7 3.6-4 3.6Z"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    <path
      d="M6.5 9.6c-.7 0-1.2-.5-1.2-1.1 0-.5.3-.9.8-1.3"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
    />
  </svg>
);
