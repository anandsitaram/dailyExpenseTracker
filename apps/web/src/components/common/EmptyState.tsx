import React, { ReactNode } from 'react';

export interface EmptyStateProps {
  icon: ReactNode;
  text: string;
  actionLabel?: ReactNode;
  onAction?: () => void;
}

export const EmptyState = ({ icon, text, actionLabel, onAction }: EmptyStateProps) => (
  <div className="empty">
    <div className="emptyIcon">{icon}</div>
    <p>{text}</p>
    {actionLabel && (
      <button className="primary mini" onClick={onAction}>
        {actionLabel}
      </button>
    )}
  </div>
);
