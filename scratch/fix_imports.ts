import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dir = 'pages/admin';
const files = readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const path = join(dir, file);
  let content = readFileSync(path, 'utf8');

  // Check if useEffect is used but not imported
  if (content.includes('useEffect') && !content.includes('useEffect } from \'react\'') && !content.includes(', useEffect } from \'react\'')) {
    console.log(`Fixing imports in ${file}...`);
    
    // Case 1: import React, { useState } from 'react';
    content = content.replace(/import React, { (.*) } from 'react';/, (match, group) => {
      if (group.includes('useEffect')) return match;
      return `import React, { ${group}, useEffect } from 'react';`;
    });

    // Case 2: import { useEffect } ... other imports from react
    // (Already handled by strict check above if it was missing)

    writeFileSync(path, content);
  }
});
