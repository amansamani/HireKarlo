import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Produces a reviewed source manifest; archive creation is a separate local step.
const root=process.cwd();
const excluded=new Set(['node_modules','.next','.git','.tmp.driveupload','audit-artifacts','test-results','playwright-report']);
const oneShot=new Set(['upgrade-security.mjs','upgrade-saas.mjs','finalize-foundation.mjs','escape-emails.mjs','improve-quality.mjs']);
const files=[];
function walk(directory) {
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})) {
    if(excluded.has(entry.name)) continue;
    const absolute=path.join(directory,entry.name);
    const relative=path.relative(root,absolute).replaceAll('\\','/');
    if(entry.isDirectory()) { walk(absolute); continue; }
    if(entry.name.startsWith('.env') && entry.name!=='.env.example') continue;
    if(entry.name.endsWith('.tsbuildinfo') || oneShot.has(entry.name)) continue;
    files.push({file:relative,bytes:fs.statSync(absolute).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex')});
  }
}
walk(root);
fs.mkdirSync('audit-artifacts',{recursive:true});
fs.writeFileSync('audit-artifacts/delivery-manifest.json',JSON.stringify({createdAt:new Date().toISOString(),files},null,2));
console.log(`${files.length} source files ready for packaging`);
