import { Language, SnippetLength, SnippetLevel, ContentType } from '../types';

const API_URL = "https://ai-code-typer-proxy.khannaseem1704.workers.dev";

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

// Internal helper with RETRY LOGIC (Updated for Fetch API)
const generateSnippet = async (prompt: string, customSystemInstruction?: string): Promise<string> => {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const defaultSystemInstruction = `You are a code generation engine for a typing practice app.
Your task is to provide a code snippet based on the user's request.
The snippet MUST be clean, raw code.
ABSOLUTELY NO explanations, comments, markdown backticks(\`\`\`), or any text other than the code itself.
The code must be syntactically correct for the requested language.`;

      // 1. Call Cloudflare Worker instead of Google SDK
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
          systemInstruction: customSystemInstruction || defaultSystemInstruction
        }),
      });

      // Handle 429 (Too Many Requests) specifically for retry logic
      if (response.status === 429) {
        throw new Error('429: Too Many Requests');
      }

      if (!response.ok) {
        throw new Error(`Worker Error: ${response.statusText}`);
      }

      const data = await response.json();

      // 2. Parse the response (Worker returns raw Google structure)
      // Path: data.candidates[0].content.parts[0].text
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error(data.error || "The AI returned an empty snippet. Please try again.");
      }

      // Clean up potential markdown code fences
      const cleanedCode = rawText.replace(/^```(?:\w+\n)?/, '').replace(/```$/, '').trim();

      return cleanedCode;

    } catch (error) {
      lastError = error as Error;

      // Retry logic for 429 errors
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
  // No need to check for 'API Key' error here as it's handled in the worker
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
    if (k === '\t') return 'tab';
    return k;
  }).join(', ');

  const prompt = `Generate a TARGETED PRACTICE snippet.
  
  Target Keys: [${sanitizedKeys}]
  Language Style: ${language.name} (but NOT functional code)
  Length: ${lengthMap[length]}
  
  CRITICAL RULES:
  1. The snippet must be MEANINGLESS but READABLE (pseudo-code sentences, fake logic).
  2. The Target Keys must appear 5x MORE FREQUENTLY than normal.
  3. Do NOT generate real working code. It should feel like muscle memory training.
  4. Use structure (brackets, indentation) if the language uses them.
  5. NO explanations, NO comments, ONLY the raw snippet.
  
  Examples of style:
  - "while w wraps words { ww }"
  - "Tab shifts w into wider waves { }"
  - "x = (x + x) * x; // x marks the spot"
  
  Generate the snippet now.`;

  return generateSnippet(prompt);
};

// Exported: General Practice
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

// Exported: Error Practice
export const generateErrorPracticeSnippet = async (
  keyStats: Record<string, { errors: number; attempts: number }>
): Promise<string> => {
  // 1. Calculate Error Rates & Sort
  const sortedKeys = Object.entries(keyStats)
    .map(([key, stats]) => {
      const errorRate = stats.attempts > 0 ? (stats.errors / stats.attempts) * 100 : 0;
      return { key, errorRate, attempts: stats.attempts };
    })
    .sort((a, b) => b.errorRate - a.errorRate);

  // 2. Apply Filtering Rules
  // A) Top 5 worst keys (always included if they exist)
  const top5 = sortedKeys.slice(0, 5);

  // B) Additional keys: Error Rate >= 12% AND Attempts >= 5
  const additionalCandidates = sortedKeys.slice(5).filter(k => k.errorRate >= 12 && k.attempts >= 5);

  // C) Combine & Limit to 7
  // Use Set to avoid duplicates (though slice logic prevents overlap, safety first)
  const finalKeysSet = new Set([...top5.map(k => k.key), ...additionalCandidates.map(k => k.key)]);
  const finalKeys = Array.from(finalKeysSet).slice(0, 7);

  if (finalKeys.length === 0) {
    throw new Error("No significant error keys found to practice.");
  }

  const sanitizedKeys = finalKeys.map(k => {
    if (k === ' ') return 'space';
    if (k === '\n') return 'newline';
    if (k === '\t') return 'tab';
    return k;
  }).join(', ');

  const prompt = `Generate a PRACTICE ERRORS snippet.
  
  Target Keys: [${sanitizedKeys}]
  
  CRITICAL RULES:
  1. Output MUST be plain English text. NO CODE. NO pseudocode.
  2. NO programming keywords (if, for, while, etc.).
  3. Length: 220-320 characters.
  4. The text must feel like a natural paragraph or story.
  5. HEAVY usage of the Target Keys.
  6. High-priority keys (earlier in list) should appear more frequently.
  7. NO bullet points, NO explanations, NO markdown backticks.
  
  OUTPUT FORMAT:
  Return ONLY valid JSON:
  {
    "snippet": "generated text here",
    "usedKeys": ["key1", "key2"]
  }`;

  const systemInstruction = `You are a creative writing engine for typing practice.
  Your goal is to weave specific target characters into a natural, flowing English paragraph.
  Return ONLY valid JSON.`;

  const jsonResponse = await generateSnippet(prompt, systemInstruction);

  try {
    const parsed = JSON.parse(jsonResponse);
    return parsed.snippet;
  } catch (e) {
    console.error("Failed to parse Error Practice JSON:", e);
    // Fallback: try to find the snippet string if JSON parsing fails
    if (jsonResponse.includes('"snippet":')) {
      const match = jsonResponse.match(/"snippet":\s*"([^"]+)"/);
      if (match) return match[1];
    }
    return jsonResponse;
  }
};