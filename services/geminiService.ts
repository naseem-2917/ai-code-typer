// FIX: Add a triple-slash directive to include Vite's client types, which resolves errors related to 'import.meta.env'.
/// <reference types="vite/client" />

import { GoogleGenAI } from "@google/genai";
import { Language, SnippetLength, SnippetLevel, ContentType } from '../types';

// --------------------- CRITICAL DUAL-ENV FIX START ---------------------
// FIX: This ensures the app uses the secure VITE key on the live site 
// and falls back to process.env.API_KEY in Google AI Studio/local environment.
const isViteEnv = typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined';

const apiKey =
  isViteEnv
    ? import.meta.env.VITE_GEMINI_API_KEY
    : process.env.API_KEY;

const ai = new GoogleGenAI({ apiKey });

// --------------------- CRITICAL DUAL-ENV FIX END ---------------------

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

// This is the internal helper function with RETRY LOGIC
const generateSnippet = async (prompt: string): Promise<string> => {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
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

      return cleanedCode; // Success!

    } catch (error) {
      lastError = error as Error;

      // Check if it's a rate limit error. Assuming error message contains '429'.
      if (error instanceof Error && error.message.includes('429')) {
        // If this is not the last retry attempt, wait before retrying.
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Go to the next iteration to retry
        }
      }

      // For any other type of error, or if rate limit retries are exhausted,
      // we will break the loop.
      break;
    }
  }

  // If we've exited the loop, all attempts have failed.
  console.error("Error generating code snippet with Gemini after all retries:", lastError);

  // Provide specific user-friendly messages based on the last error.
  if (lastError && lastError.message.includes('429')) {
    throw new Error("AI service is currently busy due to high demand. Please try again in a few seconds.");
  }

  if (lastError && lastError.message.includes('API key')) {
    throw new Error("Invalid API key. Please check your configuration.");
  }

  // If it was another kind of error, re-throw it to be handled by the caller.
  if (lastError) {
    throw lastError;
  }

  throw new Error("An unknown error occurred while generating the snippet.");
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

export const generateGeneralSnippet = async (
  length: SnippetLength,
  level: SnippetLevel,
  contentTypes: ContentType[] = ['characters']
): Promise<string> => {
  const includeNumbers = contentTypes.includes('numbers');
  const includeSymbols = contentTypes.includes('symbols');

  let contentInstruction = "- Common words and sentences";
  if (includeNumbers) {
    contentInstruction += "\n- Numbers (e.g., 123, 4.56, dates, quantities)";
  }
  if (includeSymbols) {
    contentInstruction += "\n- Basic symbols (e.g., !, @, #, $, %, &, *, (, ), -, +, =, [, ], {, }, ;, :, ', \", ,, ., ?, /)";
  }

  const prompt = `Generate a random text snippet for typing practice.
The snippet should be ${lengthMap[length]} long.
The difficulty level should be ${levelMap[level]}.
The text should be general English text, and it MUST include a mix of:
${contentInstruction}
It should NOT be a code snippet. Just plain text with varied characters for practice based on the requested content types.`;

  return generateSnippet(prompt);
};
