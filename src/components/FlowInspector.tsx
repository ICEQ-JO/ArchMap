import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import type { Flow } from '../../shared/schema';
export default function FlowInspector({
  flows,
  activeId,
  index,
  onSelect,
  onClose,
}: {
  flows: Flow[];
  activeId: string | null;
  index: number;
  onSelect: (id: string, index: number) => void;
  onClose: () => void;
}) {
  const flow = flows.find((f) => f.id === activeId);
  if (!flow)
    return (
      <section className="guided-flows" aria-label="Guided flows">
        <div className="wm-flow-heading">
          <h3>Guided flows</h3>
          <span>{flows.length}</span>
        </div>
        {flows.length ? (
          flows.map((f) => (
            <button key={f.id} onClick={() => onSelect(f.id, 0)}>
              <span className="flow-play">
                <Play size={12} />
              </span>
              <span>
                <strong>{f.title}</strong>
                <small>
                  {f.steps.length} {f.steps.length === 1 ? 'step' : 'steps'} ·{' '}
                  {f.origin === 'inferred' ? 'Model interpretation' : 'Source call sites'}
                </small>
              </span>
              <ChevronRight size={14} />
            </button>
          ))
        ) : (
          <p>
            No cross-area named function calls were resolved. Use the agent to propose a feature
            walkthrough.
          </p>
        )}
      </section>
    );
  const step = flow.steps[index];
  return (
    <section className="wm-flow-walkthrough" aria-label="Flow walkthrough">
      <div className="wm-flow-heading">
        <span>
          <Play size={12} /> {flow.title}
        </span>
        <button className="wm-bare-icon" aria-label="Close guided flow" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <p className="flow-source-notice">{flow.description}</p>
      <div className="wm-flow-step-controls">
        <span>
          STEP {index + 1} OF {flow.steps.length}
        </span>
        <div>
          <button
            className="wm-icon-button"
            aria-label="Previous flow step"
            disabled={index === 0}
            onClick={() => onSelect(flow.id, index - 1)}
          >
            <ChevronLeft />
          </button>
          <button
            className="wm-icon-button"
            aria-label="Next flow step"
            disabled={index === flow.steps.length - 1}
            onClick={() => onSelect(flow.id, index + 1)}
          >
            <ChevronRight />
          </button>
        </div>
      </div>
      <h3>{step.title}</h3>
      <p>{step.description}</p>
      <div className="wm-flow-step-dots">
        {flow.steps.map((s, i) => (
          <button
            key={s.id}
            aria-label={`Flow step ${i + 1}: ${s.title}`}
            aria-current={i === index ? 'step' : undefined}
            onClick={() => onSelect(flow.id, i)}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </section>
  );
}
