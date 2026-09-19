import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
const root=path.resolve(process.argv[2]||'.');
const inventory=[]; const warnings=[]; const imports=[];
const ignored=new Set(['node_modules','.next','.git','.audit-db','.tmp.drivedownload','.tmp.driveupload','audit-artifacts','test-results','playwright-report']);
function walk(folder) {
  for (const item of fs.readdirSync(folder,{withFileTypes:true})) {
    if(ignored.has(item.name)) continue;
    const full=path.join(folder,item.name),relative=path.relative(root,full).replaceAll('\\','/');
    if(item.isDirectory()) {walk(full);continue;}
    const buffer=fs.readFileSync(full),text=buffer.toString('utf8');
    const record={file:relative,bytes:buffer.length,sha256:crypto.createHash('sha256').update(buffer).digest('hex'),lines:text.split('\n').length};
    inventory.push(record);
    // Report only locations, never candidate secret values.
    for(const pattern of [/AIza[A-Za-z0-9_-]{30,}/g,/sk_(?:live|test)_[A-Za-z0-9]{20,}/g,/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,/(?:postgres(?:ql)?:\/\/)[^\s"']+/g]) {
      if(pattern.test(text)) warnings.push({file:relative,kind:'Potential credential/reference; inspect privately before sharing'});
    }
    if(/\.(ts|tsx|js|mjs)$/.test(relative) && !relative.startsWith('.tmp.driveupload/')) {
      const parsed=ts.createSourceFile(relative,text,ts.ScriptTarget.Latest,true,relative.endsWith('.tsx')?ts.ScriptKind.TSX:relative.endsWith('.ts')?ts.ScriptKind.TS:ts.ScriptKind.JS);
      for(const problem of parsed.parseDiagnostics) warnings.push({file:relative,kind:ts.flattenDiagnosticMessageText(problem.messageText,' ')});
      ts.forEachChild(parsed,node=>{
        if(ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
          const specifier=node.moduleSpecifier.text;
          if(specifier.startsWith('@/')||specifier.startsWith('.')) {
            const target=specifier.startsWith('@/')?path.join(root,specifier.slice(2)):path.resolve(path.dirname(full),specifier);
            if(!['','.ts','.tsx','.js','.mjs','/index.ts','/index.tsx'].some(ext=>fs.existsSync(target+ext))) imports.push({file:relative,import:specifier});
          }
        }
      });
    }
  }
}
walk(root);
const result={scannedAt:new Date().toISOString(),root,totalFiles:inventory.length,totalBytes:inventory.reduce((a,b)=>a+b.bytes,0),codeFiles:inventory.filter(f=>/\.(tsx?|m?js)$/.test(f.file)).length,temporaryUploadFiles:inventory.filter(f=>f.file.startsWith('.tmp.driveupload/')).length,warnings,unresolvedLocalImports:imports,inventory};
fs.mkdirSync('audit-artifacts',{recursive:true});
fs.writeFileSync('audit-artifacts/source-inventory.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({totalFiles:result.totalFiles,codeFiles:result.codeFiles,temporaryUploadFiles:result.temporaryUploadFiles,warnings:warnings.length,unresolvedLocalImports:imports},null,2));
