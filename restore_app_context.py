
import os

file_path = r'c:\Users\HP\OneDrive\Documents\GitHub\ai-code-typer\context\AppContext.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1-indexed 296 is index 295
# 1-indexed 297 is index 296

# Verify context
line_295 = lines[294].strip() # 1-indexed 295
line_296 = lines[295].strip() # 1-indexed 296
line_297 = lines[296].strip() # 1-indexed 297

print(f"Line 295: {line_295}")
print(f"Line 296: {line_296}")
print(f"Line 297: {line_297}")

if line_296 == "}" and line_297.startswith("}, [selectedLanguage"):
    print("Found broken block. Applying fix...")
    
    new_code = """  const fetchNewSnippet = useCallback(async (mode: 'code' | 'general' | 'targeted' = practiceMode, targetedKeysOverride?: string[]) => {
    if (isLoadingSnippet) return;

    setIsLoadingSnippet(true);
    setSnippet('');
    setSnippetError(null);
    setIsCustomSession(false);
    
    // Clear targeted keys if switching away from targeted mode, unless we are starting a new targeted session
    if (mode !== 'targeted') {
        setCurrentTargetedKeys([]);
    }

    try {
      let newSnippet = '';
      if (mode === 'code') {
        newSnippet = await generateCodeSnippet(selectedLanguage, snippetLength, snippetLevel);
      } else if (mode === 'targeted') {
         const keys = targetedKeysOverride || currentTargetedKeys;
         if (keys.length > 0) {
             newSnippet = await generateTargetedCodeSnippet(selectedLanguage, keys, snippetLength, snippetLevel);
         } else {
             // Fallback if no keys
             newSnippet = await generateCodeSnippet(selectedLanguage, snippetLength, snippetLevel);
         }
      } else {
        newSnippet = await generateGeneralSnippet(snippetLength, snippetLevel, generalContentTypes);
      }
      setSnippet(convertSpacesToTabs(newSnippet));
      setSessionResetKey(prev => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate snippet. Please try again.';
      setSnippetError(errorMessage);
      setSessionResetKey(prev => prev + 1);
      console.error(err);
    } finally {
      setIsLoadingSnippet(false);
    }
  }, [selectedLanguage, snippetLength, snippetLevel, isLoadingSnippet, practiceMode, generalContentTypes, currentTargetedKeys]);
"""
    
    # Replace lines 295 and 296 (0-indexed) with new_code
    # Wait, lines[295] is "}" and lines[296] is "}, [...]"
    # We want to remove both and insert new_code
    
    lines[295] = "" # Remove "}"
    lines[296] = new_code + "\n" # Replace "}, [...]" with new function
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Successfully restored AppContext.tsx")
else:
    print("Context mismatch. Aborting.")
