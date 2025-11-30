const fs = require('fs');
const path = 'context/AppContext.tsx';
try {
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split('\n');
    let secondImportIndex = -1;
    // Start searching from line 10 (to avoid finding the first one)
    for (let i = 10; i < lines.length; i++) {
        if (lines[i].trim().startsWith("import React")) {
            secondImportIndex = i;
            break;
        }
    }

    if (secondImportIndex !== -1) {
        console.log(`Found second import at line ${secondImportIndex + 1}`);
        const newContent = lines.slice(secondImportIndex).join('\n');
        fs.writeFileSync(path, newContent);
        console.log('Successfully fixed AppContext.tsx');
    } else {
        console.log('Could not find second import declaration');
    }
} catch (err) {
    console.error('Error:', err);
}
