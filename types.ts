
export interface BatteryStats {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  temperature: number; // Simulated or browser might not provide
  voltage: number;     // Simulated
  health: 'Good' | 'Fair' | 'Poor';
}

export interface BatteryInsight {
  status: string;
  recommendation: string;
  estimatedLifeRemaining: string;
  optimizationTips: string[];
}

export interface UsageData {
  time: string;
  level: number;
}
