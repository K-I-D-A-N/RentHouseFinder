const fs = require('fs');
const path = require('path');
const root = path.join(process.cwd(), 'src');
const files = [];
function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p);
    else if (p.endsWith('.js') || p.endsWith('.jsx')) {
      const t = fs.readFileSync(p, 'utf8');
      const usesStyles = /styles\./.test(t);
      const definesStyles = /(?:const|let|var)\s+styles\s*=/.test(t) || /styles\s*=\s*createStyles/.test(t) || /styles\s*=\s*StyleSheet\.create/.test(t) || /const\s+styles\s*=\s*useMemo/.test(t);
      if (usesStyles && !definesStyles) files.push({ path: p, usesStyles, definesStyles, score: t.match(/styles\./g)?.length || 0 });
    }
  });
}
walk(root);
console.log(JSON.stringify(files, null, 2));
