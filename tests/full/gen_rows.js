// genere les rangees du gabarit "particulier" avec le vrai code de Spoties
const fs=require('fs');
const html=fs.readFileSync('/home/claude/6flt-photoshoot-map/index.html','utf8');
const main=[...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1])[1];
function grab(src, head){ const i=src.indexOf(head); if(i<0) throw new Error('introuvable '+head); let j=src.indexOf('{',i),d=0,k=j,q=null; for(;k<src.length;k++){const ch=src[k],p=src[k-1]; if(q){ if(ch===q&&p!=='\\') q=null; continue;} if(ch==='/'&&src[k+1]==='/'&&p!=='\\'){ k=src.indexOf('\n',k); continue; } if(ch==="'"||ch==='"'){q=ch;continue;} if(ch==='{')d++; else if(ch==='}'){d--; if(d===0) break;}} return src.slice(i,k+1)+(head.indexOf('=')>-1?';':''); }
const code = 'function TT(a){return a;}\n'+grab(main,'function nid(')+'\n'+grab(main,'function defaults(')+'\n'+grab(main,'function B(')+'\n'+grab(main,'function R(')+'\n'+grab(main,'var TEMPLATES = {')+'\nmodule.exports = TEMPLATES.particulier.build();';
const m={exports:null}; new Function('module', code)(m);
fs.writeFileSync(__dirname+'/rows.json', JSON.stringify(m.exports));
console.log('rangees', m.exports.length);
