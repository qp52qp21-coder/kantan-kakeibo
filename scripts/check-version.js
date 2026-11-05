// 版(バージョン)の食い違いを確認する。使い方: node scripts/check-version.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const app = (read('index.html').match(/const APP_VERSION = '([^']+)'/) || [])[1];
const sw = (read('sw.js').match(/const VERSION = '([^']+)'/) || [])[1];
const log = read('docs/更新履歴.md');
const inLog = app && log.includes('## ' + app);

console.log('index.html APP_VERSION :', app || '(見つからない)');
console.log('sw.js VERSION          :', sw || '(見つからない)');
console.log('更新履歴.md に記載     :', inLog ? 'あり' : 'なし');

if (!app || !sw || app !== sw || !inLog) {
  console.log('\nNG: 3か所の版をそろえてください');
  process.exit(1);
}
console.log('\nOK: 版はそろっています');
