import {ZONE,ESTE,day,normalizeEste,isFresh,sources,agendaSessions,timelineLayout,navigationLinks} from './data-model.js?v=cinemas-8';
const $=id=>document.getElementById(id);let data={movies:[],sources:[]};let activeDay=day();let loading=false;let reviews={};let view='timeline';
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
 for(const m of items){const card=el('article','card');const poster=el('button','poster poster-open');poster.type='button';poster.setAttribute('aria-label','Ver ficha de '+m.title);poster.addEventListener('click',()=>openMovie(m));const fallback=el('span','','Afíche no disponible');poster.append(fallback);if(m.poster){const img=el('img');img.src=m.poster;img.alt='Afíche de '+m.title;img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('load',()=>fallback.hidden=true);img.addEventListener('error',()=>{img.remove();fallback.hidden=false;});poster.append(img);}poster.append(el('span','tag cinema-tag cinema-'+m.source,sources.find(s=>s.id===m.source).name));card.append(poster,movieHeading(m),el('p','genre',m.genre),cinemaControls(m.source));
 const groups=new Map();for(const session of m.sessions){if(!groups.has(session.format))groups.set(session.format,[]);groups.get(session.format).push(session);}for(const [format,sessions]of groups){const group=el('div','session-group',format);const times=el('div','times');for(const s of [...new Map(sessions.map(s=>[s.time,{...s,room:[...new Set(sessions.filter(x=>x.time===s.time).map(x=>x.room))].join(" / ")}])).values()].sort((a,b)=>a.time.localeCompare(b.time))){const past=new Date(`${s.date}T${s.time}:00-03:00`)<now;const t=el('span','time'+(past?' past':''),s.time);t.title=s.room+(past?' · Función iniciada':'');times.append(t);}group.append(times);card.append(group);}
 const actions=el('div','actions');actions.append(link('Entradas ↗',m.url));if(m.trailer)actions.append(trailerButton(m));else actions.append(el('span','no-trailer','Tráiler no disponible'));card.append(actions);$('grid').append(card);
 }
 if(view!=='posters') {
  const visible=agendaSessions(filtered).filter(s=>view!=='week'?s.date===date:calendarDates().includes(s.date));
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
 for(const mode of ['timeline','day','week','posters'])$('view-'+mode).setAttribute('aria-pressed',String(view===mode));
 $('grid').hidden=view!=='posters';$('agenda').hidden=view==='posters';$('day-strip').hidden=view==='posters';
 $('agenda-hint').textContent=view==='timeline'?'Horas en horizontal, películas en filas. Cada tarjeta indica el inicio de una función.':view==='week'?'Tocá un día para abrir su agenda. Horarios de Uruguay.':view==='day'?'Todas las funciones del día, ordenadas por hora.':'Películas y horarios de la fecha seleccionada.';
 const entries=agendaSessions(movies);const selected=$('date').value;
 $('day-strip').replaceChildren();
 for(const option of $('date').options){const button=el('button','day-chip');button.type='button';button.setAttribute('aria-pressed',String(selected===option.value));button.append(el('strong','',option.value===day()?'Hoy':dateTitle(option.value,true)),el('small','',entries.filter(s=>s.date===option.value).length+' funciones'));button.addEventListener('click',()=>{$('date').value=option.value;if(view!=='timeline')view='day';render();});$('day-strip').append(button);}
 $('agenda').replaceChildren();if(view==='timeline'){renderTimeline(entries.filter(s=>s.date===selected),now);return;}const datesToShow=view==='week'?calendarDates():[selected];
 const wrap=el('div',view==='week'?'calendar-week':'calendar-day');
 for(const date of datesToShow){const column=el('section','calendar-column'+(date===day()?' is-today':''));const title=el('button','calendar-date',dateTitle(date));title.type='button';title.addEventListener('click',()=>{$('date').value=date;view='day';render();});column.append(title);
 const sessions=entries.filter(s=>s.date===date);const list=el('div','calendar-events');
 if(!sessions.length)list.append(el('p','calendar-empty','Sin funciones publicadas para estos filtros.'));
 for(const session of sessions){const m=session.movie;const past=new Date(date+'T'+session.time+':00-03:00')<now;const event=el('article','calendar-event source-'+m.source+(past?' has-started':''));
 if(view==='day'&&m.poster){const poster=el('button','day-poster');poster.type='button';poster.setAttribute('aria-label','Ver ficha de '+m.title);poster.addEventListener('click',()=>openMovie(m));const img=el('img');img.src=m.poster;img.alt='Afíche de '+m.title;img.width=54;img.height=81;img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>poster.remove());poster.append(img);event.append(poster);}
 const time=el('time','event-time',session.time);time.dateTime=date+'T'+session.time+':00-03:00';event.append(time);
 const details=el('div','event-details');details.append(movieHeading(m),cinemaControls(m.source),el('p','event-format',session.format+(session.rooms.length?' · '+session.rooms.join(' / '):'')));
 if(past)details.append(el('small','started-label','Función iniciada'));
 const actions=el('div','event-actions');actions.append(movieButton(m),link('Entradas ↗',m.url));if(m.trailer)actions.append(trailerButton(m));details.append(actions);event.append(details);list.append(event);}
 column.append(list);wrap.append(column);}
 $('agenda').append(wrap);
}
for(const mode of ['timeline','day','week','posters'])$('view-'+mode).addEventListener('click',()=>setView(mode));
function cinemaControls(id){
 const cinema=sources.find(s=>s.id===id);const wrapper=el('div','cinema-controls cinema-'+id);const name=el('button','cinema-badge',cinema.name);name.type='button';name.setAttribute('aria-label','Ver ficha de '+cinema.name);name.addEventListener('click',()=>openCinema(id));const pin=el('button','cinema-pin','📍');pin.type='button';pin.title='Cómo llegar a '+cinema.name;pin.setAttribute('aria-label',pin.title);pin.addEventListener('click',()=>openCinema(id));wrapper.append(name,pin);return wrapper;
}
function openCinema(id){
 const cinema=sources.find(s=>s.id===id);const modal=$('cinema-dialog');modal.className='cinema-dialog cinema-'+id;$('cinema-title').textContent=cinema.name;const content=$('cinema-content');content.replaceChildren();content.append(el('p','cinema-venue',cinema.venue),el('p','cinema-address','📍 '+cinema.address));const urls=navigationLinks(cinema);const navigation=el('div','cinema-navigation');navigation.append(link('Cómo llegar · Google Maps ↗',urls.maps),link('Cómo llegar · Waze ↗',urls.waze));content.append(navigation,el('p','rating-note','Elegí tu aplicación de navegación. En el móvil se abrirá la app si está instalada; también podés continuar en el navegador. El destino es el centro comercial.'));
 const contact=el('div','cinema-contact');if(cinema.phone){const phone=link('☎ '+cinema.phone,'tel:'+cinema.phone.replace(/\s/g,''));phone.removeAttribute('target');contact.append(phone);}if(cinema.email)contact.append(link(cinema.email,'mailto:'+cinema.email));contact.append(link('Cartelera y entradas oficiales ↗',cinema.url),link('Ubicación · fuente oficial ↗',cinema.locationSource));content.append(contact);
 const current=data.sources.find(s=>s.id===id);content.append(el('p','rating-note',current?.ok&&isFresh(current.updatedAt)?'Cartelera actualizada: '+new Intl.DateTimeFormat('es-UY',{timeZone:ZONE,dateStyle:'short',timeStyle:'short'}).format(new Date(current.updatedAt)):'Consultá los horarios vigentes en la cartelera oficial.'));const button=el('button','cinema-filter','Ver películas de este cine');button.type='button';button.addEventListener('click',()=>{$('cinema').value=id;modal.close();if($('movie-dialog').open)$('movie-dialog').close();if($('session-dialog').open)$('session-dialog').close();render();$('cartelera').scrollIntoView({behavior:'smooth'});});content.append(button);modal.showModal();
}
$('cinema-close').addEventListener('click',()=>$('cinema-dialog').close());for(const cinema of sources)$('cinema-legend').append(cinemaControls(cinema.id));
const cinemaCards=document.querySelector('.source-links');cinemaCards.replaceChildren();for(const cinema of sources){const card=el('div','cinema-directory cinema-'+cinema.id);card.append(cinemaControls(cinema.id),el('p','',cinema.address));cinemaCards.append(card);}
const titleKey=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function movieButton(movie){const button=el('button','movie-button','Ver ficha');button.type='button';button.addEventListener('click',()=>openMovie(movie));return button;}
function movieHeading(movie){const h=el('h3');const button=el('button','movie-title-button',movie.title);button.type='button';button.addEventListener('click',()=>openMovie(movie));h.append(button);return h;}
$('movie-close').addEventListener('click',()=>$('movie-dialog').close());
$('movie-dialog').addEventListener('close',()=>$('movie-content').querySelectorAll('iframe').forEach(frame=>frame.remove()));
function openMovie(movie){
 if($('session-dialog').open)$('session-dialog').close();
 const m=data.movies.find(m=>m.id===movie.id)||movie;const rating=reviews[titleKey(m.title)];const peer=data.movies.find(x=>x.metadata?.directors?.length&&(titleKey(x.title)===titleKey(m.title)||(rating?.url&&reviews[titleKey(x.title)]?.url===rating.url)));const metadata={...peer?.metadata,...m.metadata,directors:m.metadata?.directors?.length?m.metadata.directors:peer?.metadata?.directors||[],cast:m.metadata?.cast?.length?m.metadata.cast:peer?.metadata?.cast||[],originalTitle:m.metadata?.originalTitle||peer?.metadata?.originalTitle,language:m.metadata?.language||peer?.metadata?.language};$('movie-title').textContent=m.title;
 const content=$('movie-content');content.replaceChildren();const hero=el('div','movie-overview');if(m.poster){const poster=el('img','movie-cover');poster.src=m.poster;poster.alt='Afíche de '+m.title;poster.addEventListener('error',()=>poster.remove());hero.append(poster);}
 const main=el('div','movie-intro');main.append(el('p','eyebrow',m.genre||'PELÍCULA'));const facts=el('div','movie-facts');for(const text of [metadata.duration?metadata.duration+' min':null,metadata.classification?metadata.classification:null,metadata.language?metadata.language:null])if(text)facts.append(el('span','',text));main.append(facts);
 main.append(el('h3','','Sinopsis'),el('p','movie-summary',m.summary||'La fuente oficial todavía no publicó una sinopsis.'));
 const credits=el('dl','movie-credits');for(const [label,value]of [['Título original',metadata.originalTitle],['Dirección',metadata.directors?.join(', ')],['Reparto',metadata.cast?.join(', ')],['Estreno anunciado por el cine',metadata.releaseDate]])if(value){credits.append(el('dt','',label),el('dd','',value));}main.append(credits);if(metadata.classificationDescription)main.append(el('p','rating-note',metadata.classificationDescription));
 const actions=el('div','actions');actions.append(link('Cartelera oficial ↗',m.url));main.append(actions,cinemaControls(m.source),el('p','rating-note','Sinopsis y datos técnicos: '+sources.find(s=>s.id===m.source).name+'. La duración y clasificación pueden variar según la versión.'));hero.append(main);content.append(hero);
 const embeddedTrailer=trailerFrame(m);if(embeddedTrailer){const section=el('section','movie-section movie-trailer');section.append(el('h3','','Tráiler'),embeddedTrailer);content.append(section);}
 const scores=el('section','movie-section');scores.append(el('h3','','Puntajes de crítica y público'));if(rating?.externalTitle)scores.append(el('p','rating-note','Valoraciones de '+rating.externalTitle+(rating.year?' ('+rating.year+')':'')));const scoreGrid=el('div','score-grid');
 for(const score of rating?.scores||[]){const card=el('div','score-card');card.append(el('small','',score.kind),el('strong','',score.value),link(score.label+' ↗',score.url));if(score.count)card.append(el('small','',/^\d+$/.test(score.count)?score.count+' críticas':score.count.replace('Verified Ratings','valoraciones verificadas').replace('Ratings','valoraciones')));scoreGrid.append(card);}scores.append(scoreGrid);
 if(!rating?.scores?.length)scores.append(el('p','rating-note','Todavía no hay un puntaje verificado disponible para esta película.'));
 if(rating?.scores?.some(s=>s.value.endsWith('%')))scores.append(el('p','rating-note','Tomatometer: porcentaje de críticas positivas. Popcornmeter: porcentaje de valoraciones positivas del público. No equivalen a una nota sobre 10.'));
 if(rating?.updatedAt)scores.append(el('p','rating-note','Consulta de puntajes: '+new Intl.DateTimeFormat('es-UY',{timeZone:ZONE,dateStyle:'medium'}).format(new Date(rating.updatedAt.length===10?rating.updatedAt+'T12:00:00-03:00':rating.updatedAt))+'. Pueden cambiar.'));content.append(scores);
 const criticism=el('section','movie-section');criticism.append(el('h3','','Qué dice la crítica'));if(rating?.summary){criticism.append(el('p','movie-summary',rating.summary),el('small','rating-note','Síntesis de las reseñas consultadas, sin spoilers.'),link('Consultar fuente ↗',rating.url));}
 for(const review of rating?.reviews||[]){const card=el('article','review-card');card.append(el('strong','',review.publication),el('small','',review.author));if(review.summary)card.append(el('p','',review.summary));if(review.quote){card.append(el('blockquote','',review.quote),el('small','rating-note','Extracto en su idioma original.'));}card.append(link('Leer crítica completa ↗',review.url));criticism.append(card);}
 if(!rating?.summary&&!rating?.reviews?.length)criticism.append(el('p','rating-note','Aún no hay críticas verificadas incorporadas. No se asigna una opinión ni una nota automática.'));content.append(criticism);
 const sessionsSection=el('section','movie-section');sessionsSection.append(el('h3','','Cuándo y dónde verla'));const related=data.movies.filter(x=>x.id===m.id||titleKey(x.title)===titleKey(m.title)||(rating?.url&&reviews[titleKey(x.title)]?.url===rating.url));const fresh=new Set(data.sources.filter(s=>s.ok&&isFresh(s.updatedAt)).map(s=>s.id));const last=[...$('date').options].at(-1)?.value;
 const sessions=agendaSessions(related.filter(m=>fresh.has(m.source))).filter(s=>s.date>=day()&&s.date<=last);const sessionList=el('div','movie-session-list');for(const s of sessions){const button=el('button','movie-session');button.type='button';button.append(el('strong','',dateTitle(s.date,true)+' · '+s.time),el('span','cinema-session cinema-'+s.movie.source,sources.find(x=>x.id===s.movie.source).name+' · '+s.format));button.addEventListener('click',()=>showSession(s));sessionList.append(button);}if(!sessions.length)sessionList.append(el('p','rating-note','Sin funciones recientes verificadas. Consultá la cartelera oficial.'));sessionsSection.append(sessionList);content.append(sessionsSection);$('movie-dialog').showModal();$('movie-dialog').scrollTop=0;
}
function trailerButton(movie){const button=el('button','trailer-button','▷ Tráiler');button.type='button';button.addEventListener('click',()=>openTrailer(movie));return button;}
function trailerFrame(movie,autoplay=false){
 let url;try{url=new URL(movie.trailer);}catch{return null;}const id=url.searchParams.get('v');if(!/^[\w-]{11}$/.test(id||''))return null;
 const frame=el('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay='+(autoplay?'1':'0')+'&rel=0';frame.title='Tráiler de '+movie.title;frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';return frame;
}
function openTrailer(movie){
 const frame=trailerFrame(movie,true);if(!frame)return;
 if($('session-dialog').open)$('session-dialog').close();
 $('trailer-title').textContent=movie.title+' · Tráiler';$('trailer-player').replaceChildren(frame);$('trailer-dialog').showModal();
}
$('trailer-close').addEventListener('click',()=>$('trailer-dialog').close());$('trailer-dialog').addEventListener('close',()=>$('trailer-player').replaceChildren());
$('session-close').addEventListener('click',()=>$('session-dialog').close());
for(const id of ['trailer-dialog','session-dialog','movie-dialog','cinema-dialog'])$(id).addEventListener('click',event=>{if(event.target===$(id)){const r=$(id).getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$(id).close();}});
function showSession(session){if($('movie-dialog').open)$('movie-dialog').close();
 const movie=session.movie;$('session-title').textContent=movie.title;const content=$('session-content');content.replaceChildren(el('p','session-date',dateTitle(session.date)+' · '+session.time),el('p','',sources.find(s=>s.id===movie.source).name),el('p','',session.format+' · '+session.rooms.join(' / ')));
 const actions=el('div','actions');actions.append(movieButton(movie),link('Entradas ↗',movie.url));if(movie.trailer)actions.append(trailerButton(movie));content.append(cinemaControls(movie.source),actions);$('session-dialog').showModal();
}
function renderTimeline(entries,now){
 if(!entries.length){$('agenda').append(el('p','calendar-empty','Sin funciones publicadas para esta fecha y estos filtros.'));return;}
 const layout=timelineLayout(entries);const scroller=el('div','guide-scroll');scroller.tabIndex=0;scroller.setAttribute('role','region');scroller.setAttribute('aria-label','Programación por película y horario. Desplazá horizontalmente para ver más horas.');
 const guide=el('div','guide');guide.style.setProperty('--guide-width',layout.width+'px');
 const header=el('div','guide-row guide-header');header.append(el('div','guide-label','PELÍCULA / CINE'));const ruler=el('div','guide-ruler');
 for(let minute=layout.start;minute<=layout.end;minute+=60){const label=el('span','guide-hour',String(Math.floor(minute/60)).padStart(2,'0')+':00');label.style.left=(minute-layout.start)*3+'px';ruler.append(label);}header.append(ruler);guide.append(header);
 for(const row of layout.rows){const line=el('div','guide-row');const label=el('div','guide-label guide-movie');if(row.movie.poster){const thumb=el('img','guide-poster');thumb.src=row.movie.poster;thumb.alt='Afíche de '+row.movie.title;thumb.width=46;thumb.height=69;thumb.loading='lazy';thumb.referrerPolicy='no-referrer';thumb.addEventListener('error',()=>thumb.remove());label.append(thumb);}const info=el('div','guide-movie-info');info.append(movieHeading(row.movie),cinemaControls(row.movie.source));info.append(movieButton(row.movie));if(row.movie.trailer)info.append(trailerButton(row.movie));label.append(info);
 const track=el('div','guide-track');track.style.height=Math.max(1,row.ends.length)*76+12+'px';
 for(const entry of row.events){const button=el('button','guide-event source-'+entry.movie.source);button.type='button';button.style.left=entry.offset+'px';button.style.top=entry.lane*76+7+'px';button.append(el('strong','',entry.time),el('span','',entry.format));button.setAttribute('aria-label',entry.movie.title+', '+entry.time+', '+entry.format+', '+sources.find(s=>s.id===entry.movie.source).name);button.title=entry.rooms.join(' / ');if(new Date(entry.date+'T'+entry.time+':00-03:00')<now)button.classList.add('has-started');button.addEventListener('click',()=>showSession(entry));track.append(button);}
 if(entries[0].date===day()){const local=new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now).split(':');const minute=Number(local[0])*60+Number(local[1]);if(minute>=layout.start&&minute<=layout.end){const marker=el('div','guide-now');marker.style.left=(minute-layout.start)*3+'px';marker.title='Ahora';track.append(marker);}}
 line.append(label,track);guide.append(line);}
 scroller.append(guide);$('agenda').append(scroller);
}
async function refresh(){if(loading)return;loading=true;$('refresh').disabled=true;$('refresh').textContent='Actualizando…';
 try{const r=await fetch('./data/listings.json?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Sin datos');data=await r.json();}catch{if(!data.movies.length)$('status').textContent='No se pudo cargar la cartelera.';}
 try{const r=await fetch('./data/reviews.json?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(8000)});if(r.ok)reviews=await r.json();}catch{}
 genreOptions();dates();render();
 // Cines del Este permite CORS. LIFE se consulta desde GitHub Actions por su política CORS.
 try{const r=await fetch(ESTE,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Fuente no disponible');const movies=normalizeEste(await r.json()).map(m=>({...m,poster:data.movies.find(old=>old.id===m.id)?.poster||m.poster,metadata:{...data.movies.find(old=>old.id===m.id)?.metadata,...Object.fromEntries(Object.entries(m.metadata||{}).filter(([,v])=>Array.isArray(v)?v.length:v))}}));data.movies=[...data.movies.filter(m=>m.source!=='este'),...movies];data.sources=[...data.sources.filter(s=>s.id!=='este'),{...sources[1],ok:true,updatedAt:new Date().toISOString()}];}catch{/* El respaldo conserva su hora real y vence a las tres horas. */}
 genreOptions();dates();render();loading=false;$('refresh').disabled=false;$('refresh').textContent='↻ Actualizar';}
for(const id of ['date','cinema','genre','version','search'])$(id).addEventListener(id==='search'?'input':'change',()=>{if(id==='date'&&view==='week')view='day';render();});$('refresh').addEventListener('click',refresh);$('reset').addEventListener('click',()=>{for(const id of ['cinema','genre','version','search'])$(id).value='';$('date').value=day();render();});
let lastFetch=0;async function update(){lastFetch=Date.now();await refresh();}document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastFetch>60000)update();});setInterval(()=>{const d=day();if(activeDay!==d){activeDay=d;$('date').value='';dates();update();}else render();if(!document.hidden&&Date.now()-lastFetch>300000)update();},60000);dates();update();
