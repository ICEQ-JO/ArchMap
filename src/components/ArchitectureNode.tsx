import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Box, Braces, Database, FileCode2, LayoutTemplate, Zap } from 'lucide-react';
import type { Module } from '../../shared/schema';
import './ArchitectureNode.css';

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

function ArchitectureNode({ data, selected }: NodeProps<ArchitectureFlowNode>) {
  const { module, focused, dimmed } = data;
  const Icon = kindIcons[module.kind];

  const fileCount = module.members?.length ?? 1;
  const depCount = module.exports.length;
  
  return (
    <div
      className={`arch-node arch-node--${module.kind} ${selected ? 'is-selected' : ''} ${focused ? 'is-focused' : ''} ${dimmed ? 'is-dimmed' : ''}`}
      data-origin={module.origin}
    >
      <Handle type="target" position={Position.Left} className="arch-node__handle" />
      
      <div className="arch-node__header">
        <div className="arch-node__kind">
          <Icon size={14} strokeWidth={2} />
          <span>{module.kind}</span>
        </div>
        <span className="arch-node__origin">{module.origin}</span>
      </div>

      <div className="arch-node__body">
        <h3 className="arch-node__label">{module.label}</h3>
        
        {module.description && (
          <p className="arch-node__desc">{module.description}</p>
        )}
        
        <div className="arch-node__stats">
          {fileCount > 0 && (
            <span className="arch-node__stat">
              <FileCode2 size={12} />
              {fileCount}
            </span>
          )}
          {depCount > 0 && (
            <span className="arch-node__stat">
              <Braces size={12} />
              {depCount}
            </span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="arch-node__handle" />
    </div>
  );
}

export default memo(ArchitectureNode);
