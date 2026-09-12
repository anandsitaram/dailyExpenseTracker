import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../../../core/src/index.js';

export interface TrendDatum {
  date: string;
  amount: number;
}

export interface TrendProps {
  data: TrendDatum[];
  currency?: string;
}

export const Trend = ({ data, currency = 'INR' }: TrendProps) => (
  <div className="chart">
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
        <Line type="monotone" dataKey="amount" stroke="#2e7d32" strokeWidth={3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);
