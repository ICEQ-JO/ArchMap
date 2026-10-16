export function Mark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      <path d="M4 4h8v4h8V4h8v8h-4v8h4v8h-8v-4h-8v4H4v-8h4v-8H4zm8 8v8h8v-8z" />
    </svg>
  );
}
export function Brand() {
  return (
    <a className="brand" href="/" aria-label="ArchMap home">
      <Mark />
      <span>
        archmap<span className="brand-dot">.</span>
      </span>
    </a>
  );
}
export function Github({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.1c-3.1.67-3.75-1.32-3.75-1.32-.51-1.28-1.24-1.62-1.24-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.7 1.15 1.7 1.15.99 1.7 2.6 1.21 3.24.93.1-.72.39-1.21.71-1.49-2.47-.28-5.07-1.24-5.07-5.5 0-1.22.44-2.22 1.15-3-.11-.28-.5-1.42.11-2.96 0 0 .93-.3 3.05 1.14A10.6 10.6 0 0 1 12 6.16c.94 0 1.88.13 2.76.38 2.12-1.44 3.05-1.14 3.05-1.14.61 1.54.22 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.27-2.6 5.22-5.08 5.5.4.35.75 1.02.75 2.06v3.07c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9z" />
    </svg>
  );
}
