import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Box, Braces, Database, FileCode2, LayoutTemplate, Zap } from 'lucide-react';
import type { Module } from '../../shared/schema';
export type ArchitectureFlowNode = Node<
  { module: Module; focused: boolean; dimmed: boolean },
  'architecture'
>;
export const kindIcons = {
  entry: Zap,
  module: FileCode2,
  service: Box,
  data: Database,
  ui: LayoutTemplate,
  external: Braces,
};
export default function ArchitectureNode({ data, selected }: NodeProps<ArchitectureFlowNode>) {
  const { module, focused, dimmed } = data;
  const Icon = kindIcons[module.kind];
  return (
    <div
      className={`architecture-node kind-${module.kind} ${selected ? 'is-selected' : ''} ${focused ? 'is-traced' : ''} ${dimmed ? 'is-dimmed' : ''}`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="node-meta">
        <span>
          <Icon size={12} />
          {module.kind}
        </span>
        <span>{module.origin === 'manual' ? 'MANUAL' : 'SOURCE'}</span>
      </div>
      <strong>{module.label}</strong>
      <p>{module.exports.length ? module.exports.slice(0, 2).join(' · ') : module.description}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
