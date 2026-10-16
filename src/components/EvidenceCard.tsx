import { Check, Copy, FileCode2 } from 'lucide-react';
import { useState } from 'react';
import type { Evidence } from '../../shared/schema';
export default function EvidenceCard({ evidence, index }: { evidence: Evidence; index?: number }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${evidence.file}:${evidence.line}\n${evidence.snippet}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setFailed(true);
    }
  }
  return (
    <div className="evidence-card">
      <div className="evidence-card-header">
        <FileCode2 size={13} />
        <span>
          {index !== undefined ? `[${index + 1}] ` : ''}
          {evidence.file}
        </span>
        <button className="bare-icon" aria-label="Copy source evidence" onClick={copy}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
      <pre>
        <code>
          {evidence.snippet.split('\n').map((line, i) => (
            <span className="code-line" key={i}>
              <span>{evidence.line + i}</span>
              {line || ' '}
            </span>
          ))}
        </code>
      </pre>
      <div className="evidence-card-footer">
        <span>
          L{evidence.line}–{evidence.endLine}
        </span>
        <span title={`SHA-256 ${evidence.hash}`}>sha256:{evidence.hash.slice(0, 8)}</span>
      </div>
      {failed && <p className="error-text">Copy unavailable. Select the source text above.</p>}
    </div>
  );
}
