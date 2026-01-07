
import { Language } from './types';

export const SUPPORTED_LANGUAGES: Language[] = [
  { id: 'python', name: 'Python', prismAlias: 'python' },
  { id: 'javascript', name: 'JavaScript', prismAlias: 'javascript' },
  { id: 'typescript', name: 'TypeScript', prismAlias: 'typescript' },
  { id: 'cpp', name: 'C++', prismAlias: 'cpp' },
  { id: 'java', name: 'Java', prismAlias: 'java' },
  { id: 'csharp', name: 'C#', prismAlias: 'csharp' },
  { id: 'c', name: 'C', prismAlias: 'c' },
  { id: 'go', name: 'Go', prismAlias: 'go' },
  { id: 'rust', name: 'Rust', prismAlias: 'rust' },
  { id: 'php', name: 'PHP', prismAlias: 'php' },
  { id: 'ruby', name: 'Ruby', prismAlias: 'ruby' },
  { id: 'swift', name: 'Swift', prismAlias: 'swift' },
  { id: 'kotlin', name: 'Kotlin', prismAlias: 'kotlin' },
  { id: 'html', name: 'HTML', prismAlias: 'html' },
  { id: 'css', name: 'CSS', prismAlias: 'css' },
  { id: 'sql', name: 'SQL', prismAlias: 'sql' },
];

export const GENERAL_LANGUAGE: Language = { id: 'general', name: 'General', prismAlias: 'text' };