export const ZONE = 'America/Montevideo';
export const LIFE = 'https://www.lifecinemas.com.uy';
export const ESTE = 'https://cde-prod-web-api.azurewebsites.net/api/shows/cinema/weekly';
export const sources = [
 {id:'life', name:'LIFE · Punta Shopping', url:LIFE+'/?complex=Punta+del+Este'},
 {id:'este', name:'Cines del Este · Atlántico', url:'https://www.cinesdeleste.com.uy/'}
];
export function day(date=new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
export function trailer(value) {
 if (!value) return null;
 if (/^[\w-]{11}$/.test(value)) return 'https://www.youtube.com/watch?v='+value;
 try {const u=new URL(value); if (['www.youtube.com','youtube.com','youtu.be'].includes(u.hostname)) {const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.split('/embed/')[1]?.split('/')[0]; if (/^[\w-]{11}$/.test(id||'')) return 'https://www.youtube.com/watch?v='+id;}} catch {}
 return null;
}
export function normalizeEste(raw) {
 if (!Array.isArray(raw.billboardItems)) throw Error('Formato de Cines del Este no reconocido');
 return raw.billboardItems.map(({content:c,shows})=>({id:'este-'+c.id,title:c.title,genre:c.genre||'',poster:new URL(c.posterUrl,'https://cdeprodportalstoweb.blob.core.windows.net/cdeposters/').href,trailer:trailer(c.trailerUrl),summary:c.synopsis||'',source:'este',url:'https://www.cinesdeleste.com.uy/',sessions:(shows||[]).flatMap(group=>group.shows||[]).filter(s=>s.cinemaId==='9999'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s.date)).map(s=>({date:s.date.slice(0,10),time:s.date.slice(11,16),format:s.formatLang||'',room:s.screenName||''}))}));
}
export function normalizeLife(raw,complexId) {
 if(raw.success!==true||!Array.isArray(raw.data)) throw Error('Formato de LIFE no reconocido');
 return raw.data.filter(m=>(m.schedules||[]).some(s=>s.complexId===complexId)).map(m=>({id:'life-'+m.id,remoteId:m.id,title:m.name,genre:m.genre||'',poster:m.imagePath,trailer:null,source:'life',url:LIFE+'/?complex=Punta+del+Este',sessions:(m.schedules||[]).filter(s=>s.complexId===complexId&&Number.isFinite(s.startDate)).map(s=>({date:day(new Date(s.startDate)),time:new Intl.DateTimeFormat('es-UY',{timeZone:ZONE,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(s.startDate)),format:s.filmTypeName||'',room:s.roomName||''}))}));
}
export function isFresh(updatedAt,now=Date.now()) {const age=now-Date.parse(updatedAt);return Number.isFinite(age)&&age>=-300000&&age<3*60*60*1000;}

// Una entrada por película, cine, fecha, hora y versión. Las salas simultáneas se agrupan.
export function agendaSessions(movies) {
 const entries=new Map();
 for(const movie of movies) for(const session of movie.sessions) {
  const key=JSON.stringify([movie.id,movie.source,session.date,session.time,session.format]);
  if(!entries.has(key)) entries.set(key,{movie,date:session.date,time:session.time,format:session.format,rooms:[]});
  const entry=entries.get(key);
  if(session.room&&!entry.rooms.includes(session.room))entry.rooms.push(session.room);
 }
 return [...entries.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.movie.title.localeCompare(b.movie.title,'es'));
}
