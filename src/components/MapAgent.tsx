import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  FileCode2,
  GitCompareArrows,
  LoaderCircle,
  MessageSquare,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { proposalSchema, type Answer, type Project, type Proposal } from '../../shared/schema';
import { ask, request } from '../lib/api';
import EvidenceCard from './EvidenceCard';

type Props = {
  project: Project | null;
  available: boolean;
  model: string | null;
  live: boolean;
  selectedId?: string;
  onApply: (proposal: Proposal) => void;
};
export default function MapAgent({ project, available, model, live, selectedId, onApply }: Props) {
  const [mode, setMode] = useState<'map' | 'explain'>('map');
  const [prompt, setPrompt] = useState('');
  const [pending, setPending] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState('');
  const [base, setBase] = useState('');
  const [asked, setAsked] = useState('');
  const version = useRef(0);
  useEffect(() => {
    version.current++;
    setProposal(null);
    setAnswer(null);
    setError('');
    setPending(false);
  }, [project?.id]);
  useEffect(
    () => () => {
      version.current++;
    },
    [],
  );
  const stale = Boolean(proposal && base !== JSON.stringify(project));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!project || !prompt.trim() || pending || !live) return;
    const ticket = ++version.current;
    setPending(true);
    setError('');
    setProposal(null);
    setAnswer(null);
    setAsked(prompt.trim());
    setBase(JSON.stringify(project));
    try {
      if (mode === 'map') {
        const result = proposalSchema.parse(
          await request('/api/propose', { projectId: project.id, prompt: prompt.trim() }),
        );
        if (ticket === version.current) setProposal(result);
      } else {
        const result = await ask(project, prompt.trim(), selectedId);
        if (ticket === version.current) setAnswer(result);
      }
    } catch (e) {
      if (ticket === version.current)
        setError(e instanceof Error ? e.message : 'Could not inspect this feature.');
    } finally {
      if (ticket === version.current) setPending(false);
    }
  }
  return (
    <div className="wm-map-agent">
      <div className="wm-agent-scroll">
        <div className="wm-agent-mode-switch" role="group" aria-label="Agent task">
          <button aria-pressed={mode === 'map'} onClick={() => setMode('map')}>
            <GitCompareArrows size={13} /> Map a feature
          </button>
          <button aria-pressed={mode === 'explain'} onClick={() => setMode('explain')}>
            <MessageSquare size={13} /> Explain
          </button>
        </div>
        {!proposal && !answer && !pending && (
          <div className="wm-agent-intro">
            <Sparkles size={23} />
            <h2>
              Start with a question.
              <br />
              Build a shared picture.
            </h2>
            <p>
              {available
                ? 'Ask the model to inspect a feature and propose a map. You review every change before applying it.'
                : 'Focus a map on the source you care about. Add a model for deeper architectural interpretation.'}
            </p>
            <div className="wm-agent-suggestions">
              {[
                'Map authentication and permissions',
                'Show image generation and storage',
                'Explain the job queue',
              ].map((q) => (
                <button key={q} onClick={() => setPrompt(q)}>
                  {q}
                  <ArrowRight size={13} />
                </button>
              ))}
            </div>
          </div>
        )}
        {(proposal || answer || pending) && <p className="wm-asked-question">{asked}</p>}
        {pending && (
          <div className="wm-agent-thinking" role="status">
            <LoaderCircle size={16} className="spinning" />
            <div>
              <strong>
                {available
                  ? 'Inspecting source and proposing a map…'
                  : 'Finding matching responsibilities…'}
              </strong>
              <p>Your current map stays unchanged.</p>
            </div>
          </div>
        )}
        {proposal && (
          <section className="wm-proposal-review" aria-label="Map proposal">
            <div className="wm-proposal-badge">
              <GitCompareArrows size={13} />
              {proposal.engine === 'model' ? 'MODEL PROPOSAL' : 'SOURCE-BASED PROPOSAL'}
            </div>
            <h3>{proposal.title}</h3>
            <p>{proposal.summary}</p>
            <div className="wm-proposal-counts">
              <span>
                <strong>{proposal.graph.nodes.length}</strong>components
              </span>
              <span>
                <strong>{proposal.graph.edges.length}</strong>connections
              </span>
              <span>
                <strong>{proposal.graph.flows?.length ?? 0}</strong>flows
              </span>
            </div>
            <h4>Proposed responsibilities</h4>
            {proposal.graph.nodes.map((node) => (
              <details className="wm-proposal-component" key={node.id}>
                <summary>
                  <FileCode2 size={12} />
                  {node.label}
                  <span>{node.members?.length ?? 1} files</span>
                </summary>
                <p>{node.description}</p>
                {(node.members ?? [node.file]).map((file) => (
                  <code key={file}>{file}</code>
                ))}
              </details>
            ))}
            <h4>Relationships & evidence</h4>
            {proposal.graph.edges.map((edge) => (
              <details className="proposal-relationship" key={edge.id}>
                <summary>
                  {proposal.graph.nodes.find((n) => n.id === edge.source)?.label}
                  <ArrowRight size={11} />
                  {proposal.graph.nodes.find((n) => n.id === edge.target)?.label}
                </summary>
                <p>{edge.label}</p>
                {edge.evidence && <EvidenceCard evidence={edge.evidence} />}
              </details>
            ))}
            {stale && (
              <p className="wm-error-text">
                The map changed while this proposal was open. Generate it again before applying.
              </p>
            )}
            <p className="wm-proposal-warning">
              Applying replaces the current view. Your original source graph stays available. Undo
              restores this map.
            </p>
            <div className="wm-proposal-actions">
              <button
                className="wm-button wm-primary"
                disabled={stale}
                onClick={() => {
                  onApply(proposal);
                  setProposal(null);
                }}
              >
                <Check size={14} />
                Apply proposed map
              </button>
              <button className="wm-small-button" onClick={() => setProposal(null)}>
                <X size={13} />
                Discard
              </button>
            </div>
          </section>
        )}
        {answer && (
          <>
            <span className="wm-answer-mode">
              {answer.mode === 'ai'
                ? 'MODEL EXPLANATION · CHECK THE SOURCE'
                : 'LOCAL EVIDENCE SEARCH'}
            </span>
            <p className="wm-answer-text">{answer.text}</p>
            {answer.evidence.map((e, i) => (
              <EvidenceCard key={e.id} evidence={e} index={i} />
            ))}
          </>
        )}
        {error && (
          <p className="wm-error-text" role="alert">
            {error}
          </p>
        )}
        {!live && project && (
          <p className="wm-session-note">Refresh this saved map to start an inspection session.</p>
        )}
      </div>
      <form className="wm-agent-composer" onSubmit={submit}>
        <label htmlFor="agent-question">
          {mode === 'map' ? 'What would you like to map?' : 'What would you like to understand?'}
        </label>
        <div>
          <textarea
            id="agent-question"
            aria-label="Question about your codebase"
            placeholder={
              mode === 'map'
                ? 'e.g. How does authentication work?'
                : 'Ask about a component or flow…'
            }
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={2000}
            disabled={!project || !live}
          />
          <button
            className="wm-send-button"
            aria-label={mode === 'map' ? 'Propose map' : 'Ask question'}
            disabled={!prompt.trim() || pending || !live || !project}
          >
            <Send size={15} />
            <span>{mode === 'map' ? 'Propose map' : 'Ask question'}</span>
          </button>
        </div>
        <p>
          <span className="wm-live-dot" />
          {available
            ? `${model} · relevant snippets sent when you submit`
            : 'Source-based analysis · no model connected'}
        </p>
      </form>
    </div>
  );
}
