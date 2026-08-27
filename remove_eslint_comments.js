const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.html')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
let changedCount = 0;
files.forEach(file => {
  let original = fs.readFileSync(file, 'utf8');
  let content = original;
  // Remove single line // eslint-disable-next-line ...
  content = content.replace(/[ \t]*\/\/[ \t]*eslint-disable-next-line.*(\r?\n)/g, '');
  // Remove block /* eslint-disable ... */
  content = content.replace(/[ \t]*\/\*[ \t]*eslint-disable[\s\S]*?\*\/[ \t]*(\r?\n)?/g, '');
  
  if (original !== content) {
    fs.writeFileSync(file, content);
    changedCount++;
  }
});
console.log('Modified ' + changedCount + ' files.');
