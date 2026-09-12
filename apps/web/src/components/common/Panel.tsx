import React, { ReactNode } from 'react';

export interface PanelProps {
  title: string;
  children: ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ title, children }) => (
  <section className="panel">
    <div className="panelHead">
      <h2>{title}</h2>
    </div>
    {children}
  </section>
);
