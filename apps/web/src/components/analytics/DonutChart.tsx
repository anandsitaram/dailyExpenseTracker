import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../../../core/src/index.js';

const PALETTE = ['#2e7d32', '#f5a623', '#4c8ef7', '#b98bf0', '#f26d6d', '#39b8a6'];

export interface DonutDatum {
  name: string;
  value: number;
}

export interface DonutProps {
  data: DonutDatum[];
  currency?: string;
}

export const Donut = ({ data, currency = 'INR' }: DonutProps) => (
  <div className="chart">
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
      </PieChart>
    </ResponsiveContainer>
  </div>
);
