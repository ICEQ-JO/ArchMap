export function Mark({ size = 30 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M4 4h8v4h8V4h8v8h-4v8h4v8h-8v-4h-8v4H4v-8h4v-8H4zm8 8v8h8v-8z" /></svg>;
}
export function Brand() { return <a className="brand" href="/" aria-label="ArchMap home"><Mark /><span>archmap<span className="brand-dot">.</span></span></a>; }
