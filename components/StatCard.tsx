
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, unit, icon, color = "text-blue-400" }) => {
  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${color} p-2 bg-gray-800/50 rounded-lg`}>
          {icon}
        </div>
        <span className="text-gray-400 text-sm font-semibold uppercase tracking-tight">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight mono">{value}</span>
        {unit && <span className="text-gray-500 text-sm font-medium">{unit}</span>}
      </div>
    </div>
  );
};

export default StatCard;
