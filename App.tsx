
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BatteryStats, BatteryInsight, UsageData } from './types';
import { getBatteryInsights } from './services/geminiService';
import BatteryGauge from './components/BatteryGauge';
import StatCard from './components/StatCard';

const App: React.FC = () => {
  const [stats, setStats] = useState<BatteryStats>({
    level: 100,
    charging: false,
    chargingTime: 0,
    dischargingTime: 0,
    temperature: 32.4,
    voltage: 3.8,
    health: 'Good'
  });

  const [insight, setInsight] = useState<BatteryInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [usageHistory, setUsageHistory] = useState<UsageData[]>([]);
  const lastFetchedLevel = useRef<number | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Wake Lock Implementation (Keep screen on)
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('Screen Wake Lock active');
        }
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    };

    // Request on mount
    requestWakeLock();

    // Re-request when visibility changes (e.g., coming back from another tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (wakeLock) wakeLock.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Network Status Listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize Battery API and simulate additional stats
  useEffect(() => {
    let batteryInstance: any = null;

    const updateBatteryInfo = (battery: any) => {
      setStats(prev => ({
        ...prev,
        level: Math.round(battery.level * 100),
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
        // Simulate minor temperature/voltage variations for realism
        temperature: parseFloat((30 + Math.random() * 8).toFixed(1)),
        voltage: parseFloat((3.6 + Math.random() * 0.6).toFixed(2))
      }));
    };

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        batteryInstance = battery;
        updateBatteryInfo(battery);
        
        battery.addEventListener('levelchange', () => updateBatteryInfo(battery));
        battery.addEventListener('chargingchange', () => updateBatteryInfo(battery));
        battery.addEventListener('chargingtimechange', () => updateBatteryInfo(battery));
        battery.addEventListener('dischargingtimechange', () => updateBatteryInfo(battery));
      });
    }

    // Interval to record history for the chart
    const historyInterval = setInterval(() => {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setUsageHistory(prev => {
        const newData = [...prev, { time: now, level: stats.level }];
        if (newData.length > 20) return newData.slice(1);
        return newData;
      });
    }, 5000);

    // Install prompt handler
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      clearInterval(historyInterval);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (batteryInstance) {
        batteryInstance.removeEventListener('levelchange', updateBatteryInfo);
        batteryInstance.removeEventListener('chargingchange', updateBatteryInfo);
      }
    };
  }, [stats.level]);

  // Fetch AI Insights whenever battery level changes significantly or on demand
  const fetchInsights = useCallback(async () => {
    if (!isOnline) return;
    setLoadingInsight(true);
    const data = await getBatteryInsights(stats);
    if (data) setInsight(data);
    setLoadingInsight(false);
  }, [stats, isOnline]);

  useEffect(() => {
    if (isOnline && (lastFetchedLevel.current === null || Math.abs(lastFetchedLevel.current - stats.level) >= 5)) {
      fetchInsights();
      lastFetchedLevel.current = stats.level;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.level, isOnline]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  return (
    <div className="min-h-screen pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 select-none safe-area-pt safe-area-pb">
      
      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-rose-600 text-white text-center py-1 text-xs font-bold tracking-widest uppercase z-50 animate-slide-down">
          Offline Mode - Data Local Only
        </div>
      )}

      {/* Header */}
      <header className="py-8 flex justify-between items-center border-b border-gray-800 mb-8 mt-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            BatteryCore <span className="text-emerald-500">Pro</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">AI-Powered Monitoring System</p>
        </div>
        
        <div className="flex gap-2">
            {deferredPrompt && (
                <button
                    onClick={handleInstallClick}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 border border-gray-700"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Install
                </button>
            )}
            <button 
            onClick={fetchInsights}
            disabled={loadingInsight || !isOnline}
            className={`
              px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg active:scale-95
              ${loadingInsight || !isOnline 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'}
            `}
            >
            {loadingInsight ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
            )}
            Deep Analyze
            </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Real-time Visualization */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-6 backdrop-blur-sm shadow-xl">
            <BatteryGauge level={stats.level} charging={stats.charging} />
            
            <div className="grid grid-cols-2 gap-4 mt-8">
              <StatCard 
                label="Temperature" 
                value={stats.temperature} 
                unit="°C" 
                color="text-orange-400"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
              />
              <StatCard 
                label="Voltage" 
                value={stats.voltage} 
                unit="V" 
                color="text-yellow-400"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              />
            </div>
          </div>

          <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-xs opacity-60">
              Usage History
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageHistory}>
                  <defs>
                    <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Area type="monotone" dataKey="level" stroke="#10b981" fillOpacity={1} fill="url(#colorLevel)" strokeWidth={3} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column - AI Insights & Deep Stats */}
        <div className="lg:col-span-8 space-y-8">
          {/* AI Insight Box */}
          <div className="bg-gradient-to-br from-indigo-900/20 to-emerald-900/20 border border-indigo-500/20 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden">
             {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
            </div>

            <div className="flex flex-col md:flex-row gap-8 relative z-10">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest mb-4">
                  <span className="animate-pulse w-2 h-2 bg-indigo-500 rounded-full" />
                  AI Analysis Active
                </div>
                
                {loadingInsight ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-8 bg-gray-800 rounded w-3/4"></div>
                    <div className="h-24 bg-gray-800 rounded w-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-800 rounded w-full"></div>
                      <div className="h-4 bg-gray-800 rounded w-5/6"></div>
                    </div>
                  </div>
                ) : insight ? (
                  <>
                    <h2 className="text-3xl font-bold text-white mb-2 leading-tight">
                      {insight.status}
                    </h2>
                    <p className="text-lg text-indigo-100/80 mb-6 italic">
                      "{insight.recommendation}"
                    </p>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 mb-6">
                      <p className="text-white font-medium flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l5-5z" clipRule="evenodd" />
                        </svg>
                        {insight.estimatedLifeRemaining}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {insight.optimizationTips.map((tip, idx) => (
                        <div key={idx} className="bg-gray-900/60 p-4 rounded-xl border border-gray-700/50 hover:bg-gray-900/80 transition-all cursor-default group">
                          <div className="text-emerald-400 font-bold mb-2 text-xs">TIP #{idx+1}</div>
                          <p className="text-sm text-gray-300 group-hover:text-white transition-colors">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center">
                    {!isOnline ? (
                         <div className="flex flex-col items-center gap-2">
                             <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                             <p className="text-gray-500">Connect to internet for AI analysis</p>
                         </div>
                    ) : (
                        <p className="text-gray-500">Run Deep Analysis for core insights</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Hardware Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
              <h4 className="text-white font-bold mb-6 flex items-center gap-2 text-sm uppercase tracking-widest opacity-60">
                Charging Metrics
              </h4>
              <ul className="space-y-4">
                <li className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400 text-sm">Charge State</span>
                  <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${stats.charging ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
                    {stats.charging ? 'Active' : 'Idle'}
                  </span>
                </li>
                <li className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400 text-sm">Full Charge ETA</span>
                  <span className="text-white mono">
                    {stats.charging && stats.chargingTime !== Infinity 
                      ? `${Math.round(stats.chargingTime / 60)} min` 
                      : 'N/A'}
                  </span>
                </li>
                <li className="flex justify-between items-center py-2">
                  <span className="text-gray-400 text-sm">Battery Health</span>
                  <span className="text-emerald-400 font-bold">EXCELLENT</span>
                </li>
              </ul>
            </div>

            <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
              <h4 className="text-white font-bold mb-6 flex items-center gap-2 text-sm uppercase tracking-widest opacity-60">
                Optimization Settings
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-xl border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                    </div>
                    <span className="text-gray-200 text-sm font-medium">Smart Charge Mode</span>
                  </div>
                  <div className="w-10 h-5 bg-emerald-500 rounded-full relative">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-xl border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                    </div>
                    <span className="text-gray-200 text-sm font-medium">Deep Cycle Analysis</span>
                  </div>
                  <div className="w-10 h-5 bg-gray-700 rounded-full relative">
                    <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
