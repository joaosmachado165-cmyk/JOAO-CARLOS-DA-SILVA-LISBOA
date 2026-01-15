
import React from 'react';

interface BatteryGaugeProps {
  level: number;
  charging: boolean;
}

const BatteryGauge: React.FC<BatteryGaugeProps> = ({ level, charging }) => {
  const getColor = (lvl: number) => {
    if (lvl > 60) return 'bg-emerald-500';
    if (lvl > 20) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getShadow = (lvl: number) => {
    if (lvl > 60) return 'shadow-[0_0_20px_rgba(16,185,129,0.4)]';
    if (lvl > 20) return 'shadow-[0_0_20px_rgba(245,158,11,0.4)]';
    return 'shadow-[0_0_20px_rgba(244,63,94,0.4)]';
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative w-32 h-60 border-4 border-gray-700 rounded-2xl p-1 bg-gray-900/50 flex flex-col justify-end overflow-hidden">
        {/* Battery Tip */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-3 bg-gray-700 rounded-t-lg"></div>
        
        {/* Liquid Fill */}
        <div 
          className={`w-full rounded-xl transition-all duration-1000 ease-in-out ${getColor(level)} ${getShadow(level)}`}
          style={{ height: `${level}%` }}
        >
          {charging && (
            <div className="absolute inset-0 flex items-center justify-center animate-pulse">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>
      <div className="mt-6 text-center">
        <span className="text-6xl font-bold tracking-tighter mono">{level}%</span>
        <p className="text-gray-400 font-medium uppercase text-sm tracking-widest mt-1">
          {charging ? 'Charging' : 'Discharging'}
        </p>
      </div>
    </div>
  );
};

export default BatteryGauge;
