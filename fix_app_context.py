
import os

file_path = r'c:\Users\HP\OneDrive\Documents\GitHub\ai-code-typer\context\AppContext.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

broken_block = """  }, []);
}
  }, [selectedLanguage, snippetLength, snippetLevel, isLoadingSnippet, practiceMode, generalContentTypes]);"""

replacement_block = """  }, []);

  const fetchNewSnippet = useCallback(async (mode: 'code' | 'general' | 'targeted' = practiceMode, targetedKeysOverride?: string[]) => {
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
  }, [selectedLanguage, snippetLength, snippetLevel, isLoadingSnippet, practiceMode, generalContentTypes, currentTargetedKeys]);"""

if broken_block in content:
    new_content = content.replace(broken_block, replacement_block)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully fixed AppContext.tsx")
else:
    print("Could not find the broken block in AppContext.tsx")
    # Print a snippet around the expected location to debug
    start_marker = "const setRequestFocusOnCodeCallback"
    idx = content.find(start_marker)
    if idx != -1:
        print("Context around setRequestFocusOnCodeCallback:")
        print(content[idx:idx+300])
