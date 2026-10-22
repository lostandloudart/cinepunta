import {updateReviews} from './reviews.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {sources,LIFE,ESTE,normalizeLife,normalizeEste,trailer,day} from '../docs/data-model.js';
const root=new URL('../docs/',import.meta.url);
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'CinePunta/1.0 (+https://github.com/lostandloudart/cinepunta)'}});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
let previous={movies:[],sources:[]};try{previous=JSON.parse(await readFile(new URL('data/listings.json',root),'utf8'));}catch{}
const now=new Date().toISOString();const today=day();const limit=day(new Date(Date.now()+8*86400000));
const results=await Promise.all(sources.map(async source=>{
 try {
 let movies;
 if(source.id==='life'){
 const [raw,complexes]=await Promise.all([get(LIFE+'/api/movie'),get(LIFE+'/api/complex/active')]);
 const complex=complexes.data?.find(c=>c.name==='Punta del Este');if(!complex)throw Error('Complejo no encontrado');
 movies=normalizeLife(raw,complex.id);
 }else movies=normalizeEste(await get(ESTE));
 movies=movies.map(m=>({...m,sessions:m.sessions.filter(s=>s.date>=today&&s.date<=limit)})).filter(m=>m.sessions.length);
 if(source.id==='life'){
 for(let i=0;i<movies.length;i+=4) await Promise.all(movies.slice(i,i+4).map(async m=>{try{const d=(await get(LIFE+'/api/movie/'+m.remoteId)).data;m.trailer=trailer(d.link);m.summary=d.summary||'';const people=d.casts||[];const name=p=>[p.firstName,p.lastName].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();m.metadata={duration:d.length||null,classification:d.calification||'',classificationDescription:'',originalTitle:d.originalName||'',releaseDate:d.releaseDate||'',language:d.languageName||'',directors:people.filter(p=>p.isDirector).map(name),cast:people.filter(p=>!p.isDirector).map(name).slice(0,8)};}catch{}}));
 }
 await mkdir(new URL('posters/',root),{recursive:true});
 for(let i=0;i<movies.length;i+=4) await Promise.all(movies.slice(i,i+4).map(async m=>{
 try{const r=await fetch(m.poster,{signal:AbortSignal.timeout(20000)});if(!r.ok||!r.headers.get('content-type')?.startsWith('image/'))throw Error('Afíche no disponible');const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length>5000000)throw Error('Afíche demasiado grande');const path='posters/'+m.id+'.jpg';await writeFile(new URL(path,root),bytes);m.poster=path;}catch{m.poster=null;}
 delete m.remoteId;
 }));
 console.log(source.id+': '+movies.length+' películas verificadas');
 return {status:{...source,updatedAt:now,ok:true},movies};
 }catch(e){console.error(source.id+': '+e.message);const old=previous.sources.find(s=>s.id===source.id);return {status:{...source,updatedAt:old?.updatedAt||null,ok:false,error:'No se pudo actualizar la fuente oficial.'},movies:previous.movies.filter(m=>m.source===source.id)};}
}));
await mkdir(new URL('data/',root),{recursive:true});
await writeFile(new URL('data/listings.json',root),JSON.stringify({generatedAt:now,sources:results.map(r=>r.status),movies:results.flatMap(r=>r.movies)},null,2)+'\n');
if(results.every(r=>!r.status.ok))process.exitCode=1;

try{await updateReviews(results.flatMap(r=>r.movies));}catch(e){console.error('No se pudieron actualizar los puntajes: '+e.message);}
