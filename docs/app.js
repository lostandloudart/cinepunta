import {ZONE,ESTE,day,normalizeEste,isFresh,sources,agendaSessions} from './data-model.js?v=agenda-2';
const $=id=>document.getElementById(id);let data={movies:[],sources:[]};let activeDay=day();let loading=false;let view=window.matchMedia('(max-width:900px)').matches?'day':'week';
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;}
function dates(){const selected=$('date').value;const today=day();$('today').textContent=new Intl.DateTimeFormat('es-UY',{timeZone:ZONE,weekday:'long',day:'numeric',month:'long'}).format(new Date());$('date').replaceChildren();for(let i=0;i<8;i++){const d=new Date(today+'T12:00:00-03:00');d.setUTCDate(d.getUTCDate()+i);const key=day(d);const title=i===0?'Hoy':i===1?'Mañana':new Intl.DateTimeFormat('es-UY',{timeZone:ZONE,weekday:'short',day:'numeric',month:'short'}).format(d);$('date').append(new Option(title,key));}if([...$('date').options].some(o=>o.value===selected))$('date').value=selected;}
function genreOptions(){const old=$('genre').value;const genres=[...new Set(data.movies.flatMap(m=>m.genre.split(/[,/]/).map(g=>g.trim()).filter(Boolean)))].sort();$('genre').replaceChildren(new Option('Todos los géneros',''),...genres.map(g=>new Option(g,g)));if(genres.includes(old))$('genre').value=old;}
function link(text,url){const a=el('a','',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function render(){
 const now=new Date();const date=$('date').value;const cine=$('cinema').value;const genre=$('genre').value;const version=$('version').value;const q=$('search').value.trim().toLocaleLowerCase('es');
 const fresh=new Set(data.sources.filter(s=>s.ok&&isFresh(s.updatedAt)).map(s=>s.id));
 $('status').replaceChildren();for(const source of sources){const s=data.sources.find(s=>s.id===source.id);const good=s?.ok&&isFresh(s.updatedAt);const text=good?`${source.name}: actualizado ${new Intl.DateTimeFormat('es-UY',{timeZone:ZONE,hour:'2-digit',minute:'2-digit'}).format(new Date(s.updatedAt))}`:`${source.name}: sin datos recientes verificables. Consultá el sitio oficial.`;$('status').append(el('span',good?'':'warning',text));}
 const filtered=data.movies.filter(m=>fresh.has(m.source)&&(!cine||m.source===cine)&&(!genre||m.genre.split(/[,/]/).some(g=>g.trim()===genre))&&m.title.toLocaleLowerCase('es').includes(q)).map(m=>({...m,sessions:m.sessions.filter(s=>(!version||s.format.toLowerCase().includes(version)))}));
 const items=filtered.map(m=>({...m,sessions:m.sessions.filter(s=>s.date===date)})).filter(m=>m.sessions.length).sort((a,b)=>a.title.localeCompare(b.title,'es'));
 renderAgenda(filtered,now);
 $('count').textContent=items.length+(items.length===1?' película':' películas');$('grid').replaceChildren();$('empty').hidden=view!=='posters'||items.length>0;
 for(const m of items){const card=el('article','card');const poster=el('div','poster');const fallback=el('span','','Afíche no disponible');poster.append(fallback);if(m.poster){const img=el('img');img.src=m.poster;img.alt='Afíche de '+m.title;img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('load',()=>fallback.hidden=true);img.addEventListener('error',()=>{img.remove();fallback.hidden=false;});poster.append(img);}poster.append(el('span','tag',sources.find(s=>s.id===m.source).name));card.append(poster,el('h3','',m.title),el('p','genre',m.genre));
 const groups=Map.groupBy(m.sessions,s=>s.format);for(const [format,sessions]of groups){const group=el('div','session-group',format);const times=el('div','times');for(const s of [...new Map(sessions.map(s=>[s.time,{...s,room:[...new Set(sessions.filter(x=>x.time===s.time).map(x=>x.room))].join(" / ")}])).values()].sort((a,b)=>a.time.localeCompare(b.time))){const past=new Date(`${s.date}T${s.time}:00-03:00`)<now;const t=el('span','time'+(past?' past':''),s.time);t.title=s.room+(past?' · Función iniciada':'');times.append(t);}group.append(times);card.append(group);}
 const actions=el('div','actions');actions.append(link('Entradas ↗',m.url));if(m.trailer)actions.append(link('▷ Tráiler',m.trailer));else actions.append(el('span','no-trailer','Tráiler no disponible'));card.append(actions);$('grid').append(card);
 }
 if(view!=='posters') {
  const visible=agendaSessions(filtered).filter(s=>view==='day'?s.date===date:calendarDates().includes(s.date));
  $('count').textContent=visible.length+(visible.length===1?' función':' funciones');
 }

}
function calendarDates(){
 const options=[...$('date').options].map(o=>o.value);const selected=$('date').value;
 const start=options.indexOf(selected)>6?options.length-7:0;return options.slice(start,start+7);
}
function setView(next){view=next;render();}
function dateTitle(date,short=false){return new Intl.DateTimeFormat('es-UY',{timeZone:ZONE,weekday:short?'short':'long',day:'numeric',month:'short'}).format(new Date(date+'T12:00:00-03:00'));}
function renderAgenda(movies,now){
 for(const mode of ['day','week','posters'])$('view-'+mode).setAttribute('aria-pressed',String(view===mode));
 $('grid').hidden=view!=='posters';$('agenda').hidden=view==='posters';$('day-strip').hidden=view==='posters';
 $('agenda-hint').textContent=view==='week'?'Tocá un día para abrir su agenda. Horarios de Uruguay.':view==='day'?'Todas las funciones del día, ordenadas por hora.':'Películas y horarios de la fecha seleccionada.';
 const entries=agendaSessions(movies);const selected=$('date').value;
 $('day-strip').replaceChildren();
 for(const option of $('date').options){const button=el('button','day-chip');button.type='button';button.setAttribute('aria-pressed',String(selected===option.value));button.append(el('strong','',option.value===day()?'Hoy':dateTitle(option.value,true)),el('small','',entries.filter(s=>s.date===option.value).length+' funciones'));button.addEventListener('click',()=>{$('date').value=option.value;view='day';render();});$('day-strip').append(button);}
 $('agenda').replaceChildren();const datesToShow=view==='week'?calendarDates():[selected];
 const wrap=el('div',view==='week'?'calendar-week':'calendar-day');
 for(const date of datesToShow){const column=el('section','calendar-column'+(date===day()?' is-today':''));const title=el('button','calendar-date',dateTitle(date));title.type='button';title.addEventListener('click',()=>{$('date').value=date;view='day';render();});column.append(title);
 const sessions=entries.filter(s=>s.date===date);const list=el('div','calendar-events');
 if(!sessions.length)list.append(el('p','calendar-empty','Sin funciones publicadas para estos filtros.'));
 for(const session of sessions){const m=session.movie;const past=new Date(date+'T'+session.time+':00-03:00')<now;const event=el('article','calendar-event source-'+m.source+(past?' has-started':''));
 const time=el('time','event-time',session.time);time.dateTime=date+'T'+session.time+':00-03:00';event.append(time);
 const details=el('div','event-details');details.append(el('h3','',m.title),el('p','event-cinema',sources.find(s=>s.id===m.source).name),el('p','event-format',session.format+(session.rooms.length?' · '+session.rooms.join(' / '):'')));
 if(past)details.append(el('small','started-label','Función iniciada'));
 const actions=el('div','event-actions');actions.append(link('Entradas ↗',m.url));if(m.trailer)actions.append(link('▷ Tráiler',m.trailer));details.append(actions);event.append(details);list.append(event);}
 column.append(list);wrap.append(column);}
 $('agenda').append(wrap);
}
for(const mode of ['day','week','posters'])$('view-'+mode).addEventListener('click',()=>setView(mode));
async function refresh(){if(loading)return;loading=true;$('refresh').disabled=true;$('refresh').textContent='Actualizando…';
 try{const r=await fetch('./data/listings.json?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Sin datos');data=await r.json();}catch{if(!data.movies.length)$('status').textContent='No se pudo cargar la cartelera.';}
 genreOptions();dates();render();
 // Cines del Este permite CORS. LIFE se consulta desde GitHub Actions por su política CORS.
 try{const r=await fetch(ESTE,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Fuente no disponible');const movies=normalizeEste(await r.json()).map(m=>({...m,poster:data.movies.find(old=>old.id===m.id)?.poster||m.poster}));data.movies=[...data.movies.filter(m=>m.source!=='este'),...movies];data.sources=[...data.sources.filter(s=>s.id!=='este'),{...sources[1],ok:true,updatedAt:new Date().toISOString()}];}catch{/* El respaldo conserva su hora real y vence a las tres horas. */}
 genreOptions();dates();render();loading=false;$('refresh').disabled=false;$('refresh').textContent='↻ Actualizar';}
for(const id of ['date','cinema','genre','version','search'])$(id).addEventListener(id==='search'?'input':'change',()=>{if(id==='date'&&view==='week')view='day';render();});$('refresh').addEventListener('click',refresh);$('reset').addEventListener('click',()=>{for(const id of ['cinema','genre','version','search'])$(id).value='';$('date').value=day();render();});
let lastFetch=0;async function update(){lastFetch=Date.now();await refresh();}document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastFetch>60000)update();});setInterval(()=>{const d=day();if(activeDay!==d){activeDay=d;$('date').value='';dates();update();}else render();if(!document.hidden&&Date.now()-lastFetch>300000)update();},60000);dates();update();
