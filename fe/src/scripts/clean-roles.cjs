const fs = require('fs');
let p = 'fe/src/app/roles.ts';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/\r?\n\s*\{\s*code:\s*'ICD_ADMIN',\s*name:\s*"ICD administrator",\s*grants:\s*\{"admin\.site\.manage".*?\}\s*\},/, '');
fs.writeFileSync(p, c, 'utf8');

