import React from 'react';
import './EmptyState.css';

export interface EmptyStateProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  children?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
  return (
    <div className="wm-empty-state">
      <div className="wm-empty-icon-circle">
        <Icon size={32} />
      </div>
      <h2 className="wm-empty-title">{title}</h2>
      <p className="wm-empty-desc">{description}</p>
      {children && <div className="wm-empty-actions">{children}</div>}
    </div>
  );
}
