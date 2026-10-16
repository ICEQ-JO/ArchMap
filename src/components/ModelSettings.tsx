import { useState, type FormEvent } from 'react';
import { Check, Link2, LoaderCircle, Server, ShieldCheck } from 'lucide-react';
import { request } from '../lib/api';
export type ServerStatus = {
  root: string;
  ai: boolean;
  model: string | null;
  baseUrl?: string | null;
};
export default function ModelSettings({
  status,
  onChange,
}: {
  status: ServerStatus | null;
  onChange: (status: ServerStatus) => void;
}) {
  const [base, setBase] = useState(status?.baseUrl ?? 'http://localhost:11434/v1');
  const [model, setModel] = useState(status?.model ?? '');
  const [key, setKey] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    setSaved(false);
    try {
      const next = await request<ServerStatus>('/api/model', { baseUrl: base, model, apiKey: key });
      onChange(next);
      setKey('');
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not configure this model.');
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="model-settings">
      <Server size={25} />
      <h2>Bring your own model.</h2>
      <p>
        Connect an OpenAI-compatible endpoint for feature maps and source explanations. Local models
        work too.
      </p>
      <div className="model-current">
        <span className="live-dot" />
        {status?.ai
          ? `Configured: ${status.model}`
          : 'Source analysis is available without a model.'}
      </div>
      <form onSubmit={submit}>
        <label>
          API base URL
          <input
            aria-label="Model API base URL"
            type="url"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            required
            placeholder="http://localhost:11434/v1"
          />
        </label>
        <label>
          Model name
          <input
            aria-label="Model name"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            required
            maxLength={200}
            placeholder="An installed or hosted model ID"
          />
        </label>
        <label>
          API key <span>(optional for local models)</span>
          <input
            aria-label="Model API key"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="off"
            maxLength={2000}
            placeholder="Stored in server memory for this session"
          />
        </label>
        <p className="model-disclosure">
          <ShieldCheck size={14} />
          Saving settings sends no repository code. When you submit an agent question, relevant
          source is sent to this endpoint. Credentials stay in the local server's memory and are
          cleared on restart.
        </p>
        <button className="button primary" disabled={pending || !model.trim()}>
          {pending ? <LoaderCircle className="spinning" size={15} /> : <Link2 size={15} />}Use this
          model
        </button>
      </form>
      {saved && (
        <p className="model-saved" role="status">
          <Check size={14} />
          Settings saved. The next explicit question uses this model; connectivity is checked then.
        </p>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {status?.ai && (
        <button
          className="text-button"
          onClick={async () => {
            try {
              onChange(await request<ServerStatus>('/api/model/disconnect', {}));
              setSaved(false);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not disconnect.');
            }
          }}
        >
          Use source analysis without a model
        </button>
      )}
      <p className="model-footnote">
        For persistent configuration, use your local .env file. These session settings are never
        written into a saved map.
      </p>
    </div>
  );
}
