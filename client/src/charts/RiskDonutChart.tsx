import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface RiskDonutChartProps {
  data: Array<{ name: string; value: number; key: string }>;
}

const COLORS: Record<string, string> = {
  HIGH: '#e11d48', // rose-600
  MEDIUM: '#d97706', // amber-600
  LOW: '#059669', // emerald-600
  NOT_ANALYZED: '#94a3b8', // slate-400
};

export const RiskDonutChart: React.FC<RiskDonutChartProps> = ({ data }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  if (total === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No student risk evaluation records
      </div>
    );
  }

  return (
    <div className="h-64 w-full flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={COLORS[entry.key] || '#94a3b8'} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            formatter={(val: any, name: any) => [`${val} students`, name]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-xs text-slate-600">
        {data.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: COLORS[item.key] || '#94a3b8' }}
            />
            <span>
              {item.name}: <strong className="text-slate-800">{item.value}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
