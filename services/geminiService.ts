import { GoogleGenerativeAI } from "@google/generative-ai";
import { Language, SnippetLength, SnippetLevel, ContentType } from '../types';

// NOTE: Using direct VITE_ access as per the final simplified workflow.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// @ts-ignore
const genAI = new GoogleGenerativeAI(apiKey);
const ai = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Using 2.5 Flash as defined in your source

const levelMap = {
  easy: 'basic syntax and concepts, like variable declaration and simple loops',
  medium: 'intermediate concepts, like functions, classes, or common library usage',
  hard: 'advanced or complex topics, like asynchronous programming, data structures, or algorithms',
};

const lengthMap: Record<SnippetLength, string> = {
  short: '5-10 lines',
  medium: '15-20 lines',
  long: '25-30 lines',
};

// This is the internal helper function with RETRY LOGIC
const generateSnippet = async (prompt: string, customSystemInstruction?: string): Promise<string> => {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (!apiKey) {
        // CRITICAL CHECK: Throws user-friendly error if key is missing/invalid
        throw new Error("API Key is missing or invalid. Check your configuration.");
      }

      const defaultSystemInstruction = `You are a code generation engine for a typing practice app.
Your task is to provide a code snippet based on the user's request.
The snippet MUST be clean, raw code.
ABSOLUTELY NO explanations, comments, markdown backticks(\`\`\`), or any text other than the code itself.
The code must be syntactically correct for the requested language.`;

      const responseResult = await ai.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: customSystemInstruction || defaultSystemInstruction,
      });
      const response = responseResult.response;

      const code = response.text().trim();

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

// This is the exported function your app uses for code practice
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

// This is the exported function your app uses for targeted code practice
export const generateTargetedCodeSnippet = async (
  language: Language,
  keys: string[],
  length: SnippetLength,
  level: SnippetLevel
): Promise<string> => {
  const sanitizedKeys = keys.map(k => {
    if (k === ' ') return 'space';
    if (k === '\n') return 'newline';
    if (k === ' ') return 'tab';
    return k;
  }).join(', ');

  const prompt = `Generate a code snippet in ${language.name}.
The snippet must be ${lengthMap[length]} long and of ${levelMap[level]} difficulty.
Crucially, the code must frequently and naturally use the following characters for typing practice: [${sanitizedKeys}]. Make them appear as part of valid syntax (variable names, operators, strings, etc.).`;

  return generateSnippet(prompt);
};

// This is the exported function your app uses for general text practice
export const generateGeneralSnippet = async (
  length: SnippetLength,
  level: SnippetLevel,
  contentTypes: ContentType[] = ['characters']
): Promise<string> => {
  const includeCharacters = contentTypes.includes('characters');
  const includeNumbers = contentTypes.includes('numbers');
  const includeSymbols = contentTypes.includes('symbols');

  let contentInstruction = "";

  if (includeCharacters) {
    contentInstruction += "- Common English words and sentences.";
  } else if (contentTypes.length > 0) {
    // CRITICAL FIX: If Characters are NOT selected, force AI to avoid sentences.
    contentInstruction += "CRUCIAL: DO NOT use full English sentences or common words. Focus ONLY on generating the selected non-text elements below. ";
  }

  if (includeNumbers) {
    contentInstruction += "\\n- Numbers (e.g., 123, 4.56, dates, quantities, phone numbers).";
  }
  if (includeSymbols) {
    contentInstruction += "\\n- Basic symbols (e.g., !, @, #, $, %, &, *, (, ), -, +, =, [, ], {, }, ;, :, ', \", ,, ., ?, /) and ensure they are used frequently.";
  }

  // Fallback if nothing is selected (safety measure)
  if (contentTypes.length === 0) {
    contentInstruction = "- Common English words and sentences and numbers.";
  }

  const prompt = `Generate a random text snippet for typing practice.
The snippet should be ${lengthMap[length]} long.
The content MUST strictly follow these content rules:
${contentInstruction}`;

  // NOTE: Level map is REMOVED from the General Snippet prompt as it's irrelevant for plain text difficulty.

  const systemInstruction = `You are a text generation engine for a general typing practice app. 
Your task is to provide a clean, raw text snippet based on the user's content selection.
ABSOLUTELY NO markdown, headers, or conversational text should be included.
IMPORTANT: The text must be formatted naturally, breaking into new lines (using '\\n') after every 5-10 words (or data items) to simulate a normal paragraph or list structure. Do not produce a single long line.`;

  return generateSnippet(prompt, systemInstruction);
};