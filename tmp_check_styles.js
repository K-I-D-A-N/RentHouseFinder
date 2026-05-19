const fs = require('fs');
const path = require('path');
const root = process.cwd();
const results = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build'].includes(ent.name)) continue;
      walk(p);
    } else if (/\.(js|jsx|ts|tsx)$/.test(ent.name)) {
      const text = fs.readFileSync(p, 'utf8');
      if (!text.includes('styles.')) continue;
      const hasDecl = /(?:const|let|var)\s+styles\s*=|styles\s*=\s*createStyles|styles\s*=\s*StyleSheet\.create/.test(text);
      results.push({ file: p, hasDecl, lines: text.split(/\r?\n/).map((line, idx) => ({ line: idx + 1, text: line })).filter(l => l.text.includes('styles.')).slice(0, 20) });
    }
  }
}
walk(root);
const missing = results.filter(r => !r.hasDecl);
console.log(JSON.stringify(missing, null, 2));
