
import { GoogleGenAI, Type } from "@google/genai";
import { BatteryStats, BatteryInsight } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getBatteryInsights = async (stats: BatteryStats): Promise<BatteryInsight | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze these battery stats and provide a professional battery core report in JSON: 
        Level: ${stats.level}%, 
        Charging: ${stats.charging}, 
        Temperature: ${stats.temperature}°C, 
        Voltage: ${stats.voltage}V, 
        Health: ${stats.health}. 
        Provide a status summary, one primary recommendation, an estimated life remaining sentence, and 3 specific optimization tips.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            estimatedLifeRemaining: { type: Type.STRING },
            optimizationTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["status", "recommendation", "estimatedLifeRemaining", "optimizationTips"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as BatteryInsight;
  } catch (error) {
    console.error("Error fetching battery insights:", error);
    return null;
  }
};
