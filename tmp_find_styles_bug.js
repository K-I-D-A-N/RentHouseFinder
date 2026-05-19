const fs = require('fs');
const path = require('path');
const root = process.cwd();
const bad = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', '.git'].includes(ent.name)) continue;
      walk(p);
    } else if (/\.(js|jsx|ts|tsx)$/.test(ent.name)) {
      const text = fs.readFileSync(p, 'utf8');
      if (!text.includes('styles.')) continue;
      const hasStylesDecl = /(?:const|let|var)\s+styles\s*=|styles\s*=\s*createStyles|styles\s*=\s*StyleSheet\.create/.test(text);
      if (!hasStylesDecl) {
        const lines = text.split(/\r?\n/);
        const styleLines = lines.map((line, idx) => ({ line: idx + 1, text: line })).filter(l => l.text.includes('styles.'));
        bad.push({ file: p, styleLines });
      }
    }
  }
}
walk(root);
console.log(JSON.stringify(bad, null, 2));
