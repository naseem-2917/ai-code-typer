import { GoogleGenAI } from "@google/genai";
import { Language, SnippetLength, SnippetLevel } from '../types';

// Fix: Per coding guidelines, the API key must be obtained exclusively from process.env.API_KEY.
// The previous logic attempted to support Vite's import.meta.env, which is not permitted and caused a TypeScript error.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const lengthMap = {
  short: 'around 4-6 lines',
  medium: 'around 8-12 lines',
  long: 'around 15-20 lines',
};

const levelMap = {
  easy: 'basic syntax and concepts, like variable declaration and simple loops',
  medium: 'intermediate concepts, like functions, classes, or common library usage',
  hard: 'advanced or complex topics, like asynchronous programming, data structures, or algorithms',
};

// This is the internal helper function
const generateSnippet = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              systemInstruction: `You are a code generation engine for a typing practice app.
Your task is to provide a code snippet based on the user's request.
The snippet MUST be clean, raw code.
ABSOLUTELY NO explanations, comments, markdown backticks (\`\`\`), or any text other than the code itself.
The code must be syntactically correct for the requested language.`
            }
        });

        const code = response.text.trim();
        
        // Clean up potential markdown code fences
        const cleanedCode = code.replace(/^```(?:\w+\n)?/, '').replace(/```$/, '').trim();

        if (!cleanedCode) {
            throw new Error("The AI returned an empty snippet. Please try again.");
        }

        return cleanedCode;
    } catch (error) {
        console.error("Error generating code snippet with Gemini:", error);
        if (error instanceof Error && error.message.includes('API key')) {
             throw new Error("Invalid API key. Please check your configuration.");
        }
        throw new Error("Failed to generate snippet from AI. The service might be busy.");
    }
};

// This is the exported function your app uses
export const generateCodeSnippet = async (
  language: Language,
  length: SnippetLength,
  level: SnippetLevel
): Promise<string> => {
  const prompt = `Generate a code snippet in ${language.name}. 
The snippet should be ${lengthMap[length]} long.
The difficulty level should be ${levelMap[level]}.`;

  return generateSnippet(prompt);
};

// This is the exported function your app uses
export const generateTargetedCodeSnippet = async (
  language: Language,
  keys: string[],
  length: SnippetLength,
  level: SnippetLevel
): Promise<string> => {
    const sanitizedKeys = keys.map(k => {
        if (k === ' ') return 'space';
        if (k === '\n') return 'newline';
        if (k === '\t') return 'tab';
        return k;
    }).join(', ');

  const prompt = `Generate a code snippet in ${language.name}.
The snippet must be ${lengthMap[length]} long and of ${levelMap[level]} difficulty.
Crucially, the code must frequently and naturally use the following characters for typing practice: [${sanitizedKeys}]. Make them appear as part of valid syntax (variable names, operators, strings, etc.).`;

  return generateSnippet(prompt);
};
