import React from 'react';

export interface MetricProps {
  title: string;
  value: string | number;
  highlight?: boolean;
  warn?: boolean;
}

export const Metric: React.FC<MetricProps> = ({ title, value, highlight, warn }) => (
  <div className={'card' + (highlight ? ' highlight' : '') + (warn ? ' warn' : '')}>
    <span>{title}</span>
    <strong>{value}</strong>
  </div>
);
