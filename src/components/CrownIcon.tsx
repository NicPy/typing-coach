interface Props {
  className?: string;
}

export function CrownIcon({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 28"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4.2 9.1 9.4 14l6.5-10 6.7 10 5.2-4.9-2.2 12.2H6.4L4.2 9.1Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M7.1 24.8h17.8" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M8.3 18.2h15.4" stroke="#323437" strokeLinecap="round" strokeWidth="1.6" />
      <circle cx="4" cy="7.6" r="2" fill="currentColor" />
      <circle cx="16" cy="3.2" r="2" fill="currentColor" />
      <circle cx="28" cy="7.6" r="2" fill="currentColor" />
    </svg>
  );
}
