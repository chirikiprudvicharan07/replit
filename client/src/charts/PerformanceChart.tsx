import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface PerformanceChartProps {
  data: Array<{ date: string; assessmentName: string; averagePct: number }>;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No assessment marks recorded yet
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="assessmentName"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            formatter={(value: any) => [`${value}%`, 'Class Average']}
            labelFormatter={(label) => `Assessment: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="averagePct"
            stroke="#0ea5e9"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 1.5, stroke: '#ffffff' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
