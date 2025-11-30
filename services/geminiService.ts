import { GoogleGenerativeAI } from "@google/generative-ai";
import { Language, SnippetLength, SnippetLevel, ContentType } from '../types';

// NOTE: Using direct VITE_ access as per the final simplified workflow.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// @ts-ignore
const genAI = new GoogleGenerativeAI(apiKey);
const ai = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

// Internal helper with RETRY LOGIC
const generateSnippet = async (prompt: string, customSystemInstruction?: string): Promise<string> => {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (!apiKey) {
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

      return cleanedCode;

    } catch (error) {
      lastError = error as Error;
      if (error instanceof Error && error.message.includes('429')) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      break;
    }
  }

  console.error("Error generating snippet:", lastError);

  if (lastError && lastError.message.includes('429')) {
    throw new Error("AI service is busy. Please try again shortly.");
  }
  if (lastError && lastError.message.includes('API key')) {
    throw new Error("Invalid API key.");
  }
  if (lastError) throw lastError;

  throw new Error("Unknown error generating snippet.");
};

// Exported: Code Practice
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

// Exported: Targeted Practice
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
Crucially, the code must frequently and naturally use the following characters for typing practice: [${sanitizedKeys}]. Make them appear as part of valid syntax.`;

  return generateSnippet(prompt);
};

// Exported: General Practice (COMPLETELY FIXED LOGIC)
export const generateGeneralSnippet = async (
  length: SnippetLength,
  level: SnippetLevel,
  contentTypes: ContentType[] = ['characters']
): Promise<string> => {
  const hasChar = contentTypes.includes('characters');
  const hasNum = contentTypes.includes('numbers');
  const hasSym = contentTypes.includes('symbols');

  let instruction = "";

  // 1. ALL SELECTED (Char + Num + Sym)
  if (hasChar && hasNum && hasSym) {
    instruction = `Generate a text that heavily mixes words, numbers, and symbols.
    - CRITICAL REQUIREMENT: Every single sentence or line MUST contain at least one number AND one symbol.
    - Style: Technical data logs, complex passwords, inventory lists, or code-like pseudo text.
    - Example format: "User_ID: #4928 @ 10:45PM (Status: 99% Verified!)"`;
  } 
  // 2. Char + Num
  else if (hasChar && hasNum) {
    instruction = `Generate a text containing words and numbers. 
    - Style: Addresses, historical dates, scientific facts with measurements, or financial summaries.
    - CRITICAL REQUIREMENT: Frequent use of digits mixed with sentences. Do NOT use complex symbols like @#$%^ (only basic punctuation like . , is allowed).
    - Example format: "On July 4th, 1776, approximately 2.5 million people lived there."`;
  } 
  // 3. Char + Sym
  else if (hasChar && hasSym) {
    instruction = `Generate a text containing words and symbols.
    - Style: Dialogues with heavy punctuation, code comments, or expressive writing.
    - CRITICAL REQUIREMENT: Frequent use of brackets (), [], {}, punctuation !?.,:; and symbols @#&. Do NOT use numbers 0-9.
    - Example format: "Hello (world)! Waiting for response... [OK] -> {verified}."`;
  } 
  // 4. Num + Sym (NO CHARACTERS)
  else if (hasNum && hasSym) {
    instruction = `Generate a sequence of Numbers and Symbols ONLY.
    - ABSOLUTELY FORBIDDEN: DO NOT INCLUDE ANY ALPHABET CHARACTERS (A-Z, a-z).
    - Style: Math equations, currency calculations, or abstract data strings.
    - Example format: "123+456=$579; (80% * 10) = #800 // 99.9"`;
  } 
  // 5. Num ONLY
  else if (hasNum) {
    instruction = `Generate a sequence of Numbers ONLY.
    - ABSOLUTELY FORBIDDEN: DO NOT INCLUDE LETTERS OR SYMBOLS (except decimal points).
    - Style: Phone numbers, years, zip codes, or raw data streams.
    - Example format: "1990 2023 8837 1.45 00392 998 112"`;
  } 
  // 6. Sym ONLY
  else if (hasSym) {
    instruction = `Generate a sequence of Symbols ONLY.
    - ABSOLUTELY FORBIDDEN: DO NOT INCLUDE LETTERS OR NUMBERS.
    - Style: Random symbol patterns for pinky finger practice.
    - Example format: "!@# $ %^ &*() _+ {} [] : ; < > ?"`;
  } 
  // 7. Char ONLY (Default)
  else {
    instruction = `Generate standard English paragraphs.
    - Style: Informative, story-telling, or essays.
    - Requirement: Standard grammar and punctuation. Minimize numbers and complex symbols.`;
  }

  // Adjust complexity based on level
  let difficultyInstruction = "";
  if (level === 'easy') difficultyInstruction = "Use simple, repetitive patterns and lower density of complex items.";
  if (level === 'medium') difficultyInstruction = "Use varied patterns and moderate density of selected elements.";
  if (level === 'hard') difficultyInstruction = "Maximize the density, randomness, and complexity of the selected elements. Make it challenging.";

  const prompt = `Generate a random typing practice snippet.
The length should be roughly ${lengthMap[length]}.
${instruction}
${difficultyInstruction}`;

  const systemInstruction = `You are a text generation engine for a typing practice app. 
Your task is to provide a clean, raw text snippet based strictly on the user's content selection.
ABSOLUTELY NO markdown, headers, conversational text, or backticks.
IMPORTANT: Format the text naturally with line breaks ('\\n') every 8-12 words/items to fit a screen, do not create one giant line.`;

  return generateSnippet(prompt, systemInstruction);
};