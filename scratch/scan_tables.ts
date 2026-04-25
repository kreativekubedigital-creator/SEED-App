import * as fs from 'fs';
import * as path from 'path';

const srcDir = 'c:/Users/Jhedai/Desktop/Antigavity/SEED-main/src';

function walk(dir: string, callback: (file: string) => void) {
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

const tableUsage = new Set<string>();

walk(srcDir, (file) => {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return;
  const content = fs.readFileSync(file, 'utf8');
  
  // Look for DatabaseService calls
  const dsMatches = content.matchAll(/DatabaseService\.(getItems|getItemById|addItem|updateItem|upsertItem|deleteItem|subscribe)\s*\(\s*[`'"]([^`'"]+)[`'"]/g);
  for (const match of dsMatches) {
    tableUsage.add(match[2]);
  }

  // Look for collection/doc calls with string literals
  const collMatches = content.matchAll(/collection\s*\(\s*db\s*,\s*[`'"]([^`'"]+)[`'"]/g);
  for (const match of collMatches) {
    tableUsage.add(match[1]);
  }

  // Look for addDoc/updateDoc/setDoc/deleteDoc with string literals or collection/doc results
  const docMatches = content.matchAll(/(addDoc|updateDoc|setDoc|deleteDoc|onSnapshot|getDoc|getDocs|query)\s*\(\s*[`'"]([^`'"]+)[`'"]/g);
  for (const match of docMatches) {
    tableUsage.add(match[2]);
  }
});

console.log('Detected paths:');
console.log(Array.from(tableUsage).sort());
