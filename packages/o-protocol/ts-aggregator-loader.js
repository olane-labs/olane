const fs = require('fs');
const path = require('path');

// Track processed files to avoid circular dependencies
const processedFiles = new Set();
const aggregatedContent = [];

function resolveImportPath(importPath, currentFile) {
  if (importPath.startsWith('.')) {
    // Relative import
    const resolvedPath = path.resolve(path.dirname(currentFile), importPath);
    
    // Try different extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    for (const ext of extensions) {
      const fullPath = resolvedPath + ext;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    
    // Try index files
    for (const ext of extensions) {
      const fullPath = path.join(resolvedPath, `index${ext}`);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }
  return null;
}

function extractImports(content) {
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;
  const imports = [];
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

function processFile(filePath, baseDir) {
  if (processedFiles.has(filePath)) {
    return;
  }
  
  processedFiles.add(filePath);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract imports
    const imports = extractImports(content);
    
    // Process local imports first
    for (const importPath of imports) {
      const resolvedPath = resolveImportPath(importPath, filePath);
      if (resolvedPath && resolvedPath.startsWith(baseDir) && !resolvedPath.includes('node_modules')) {
        processFile(resolvedPath, baseDir);
      }
    }
    aggregatedContent.push(content.replace(/import[\s\S]*?;/g, ''));
    aggregatedContent.push(''); // Empty line for separation
    
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

module.exports = function(source) {
  const callback = this.async();
  const resourcePath = this.resourcePath;
  const baseDir = path.dirname(resourcePath);
  
  // Reset for each build
  processedFiles.clear();
  aggregatedContent.length = 0;
  
  // Process the entry file and all its dependencies
  processFile(resourcePath, baseDir);

  // console.log('Aggregated Content::::', aggregatedContent.length);
  
  // Return the aggregated content
  const result = aggregatedContent.join('\n');
  fs.appendFileSync('dist/schema.ts', result);
  callback(null, result);
}; 