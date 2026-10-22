import {readFile,writeFile} from 'node:fs/promises';
export const titleKey=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const clean=value=>value.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&#x27;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
export function parseRatings(html,expectedDirector){
 const schema=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1])).find(d=>d['@type']==='Movie');
 if(!schema||!(schema.director||[]).some(d=>titleKey(d.name)===titleKey(expectedDirector)))throw Error('No coincide la dirección de la película');
 const match=html.match(/<script[^>]*id="media-scorecard-json"[^>]*>([\s\S]*?)<\/script>/);if(!match)throw Error('Sin datos de puntajes');
 const card=JSON.parse(match[1]);const scores=[];
 for(const [key,label,kind]of [['criticsScore','Rotten Tomatoes · Tomatometer','Crítica'],['audienceScore','Rotten Tomatoes · Popcornmeter','Público']]){const x=card[key];if(x&&/^\d{1,3}$/.test(x.score||'')&&Number(x.score)<=100)scores.push({label,kind,value:x.score+'%',count:x.bandedRatingCount||String(x.reviewCount||x.ratingCount||''),url:schema.url+(key==='criticsScore'?'/reviews':'/reviews/all-audience')});}
 const block=html.match(/<review-card-critic\b[\s\S]*?<\/review-card-critic>/)?.[0];const field=slot=>clean(block?.match(new RegExp('<(?:rt-link|span)[^>]*slot="'+slot+'"[^>]*>([\\s\\S]*?)<\\/(?:rt-link|span)>'))?.[1]||'');
 const reviewUrl=block?.match(/<rt-link[^>]*slot="review-link"[^>]*href="([^"]+)"/)?.[1];const quote=field('review');
 const reviews=reviewUrl&&quote?[{author:field('name'),publication:field('publication'),url:reviewUrl,quote:quote.split(/\s+/).slice(0,20).join(' ')+(quote.split(/\s+/).length>20?'…':'')}]:[];
 return {scores,reviews,externalTitle:schema.name,year:schema.dateCreated?.slice(0,4)};
}
export async function updateReviews(movies){
 const output=new URL('../docs/data/reviews.json',import.meta.url);let old={};try{old=JSON.parse(await readFile(output,'utf8'));}catch{}
 const config=JSON.parse(await readFile(new URL('review-sources.json',import.meta.url),'utf8'));const records={};
 for(let i=0;i<config.length;i+=3)await Promise.all(config.slice(i,i+3).map(async c=>{
  if(!movies.some(m=>c.aliases.some(a=>titleKey(a)===titleKey(m.title))))return;
  let record={url:c.url||'https://www.rottentomatoes.com/m/'+c.slug,summary:c.summary||'',scores:c.manualScores||[],reviews:c.reviews||[],updatedAt:c.verifiedAt||null};
  const prior=old[titleKey(c.aliases[0])];
  if(c.slug){
   if(prior?.updatedAt&&Date.now()-Date.parse(prior.updatedAt)<86400000)record=prior;
   else try{const r=await fetch(record.url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);record={...record,...parseRatings(await r.text(),c.director),updatedAt:new Date().toISOString()};}catch(e){console.error('Puntajes '+c.aliases[0]+': '+e.message);record=prior||{...record,summary:'',error:true};}
  }
  for(const alias of c.aliases)records[titleKey(alias)]=record;
 }));
 await writeFile(output,JSON.stringify(records,null,2)+'\n');console.log('Fichas externas: '+Object.keys(records).length+' títulos y variantes');
}
