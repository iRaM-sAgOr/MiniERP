import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;
let initialized = false;

export function getGeminiAI(): GoogleGenAI | null {
  if (initialized) {
    return aiInstance;
  }
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log("Gemini SDK lazily initialized with valid API key.");
  } else {
    console.warn("GEMINI_API_KEY is not defined. Utilizing fallback generators.");
  }
  
  initialized = true;
  return aiInstance;
}
