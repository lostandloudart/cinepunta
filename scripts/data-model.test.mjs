import test from 'node:test';import assert from 'node:assert/strict';
import {day,normalizeEste,normalizeLife,trailer,isFresh} from '../docs/data-model.js';
test('Uruguay conserva el día anterior durante las primeras tres horas UTC',()=>{assert.equal(day(new Date('2026-10-22T02:59:00Z')),'2026-10-21');assert.equal(day(new Date('2026-10-22T03:00:00Z')),'2026-10-22');});
test('LIFE excluye funciones de otros complejos y convierte la hora a Uruguay',()=>{const [m]=normalizeLife({success:true,data:[{id:'a',name:'Prueba',schedules:[{complexId:'punta',startDate:Date.parse('2026-10-22T01:00Z')},{complexId:'otro',startDate:Date.parse('2026-10-22T02:00Z')}]}]},'punta');assert.deepEqual(m.sessions.map(s=>[s.date,s.time]),[['2026-10-21','22:00']]);});
test('Este respeta fecha local y no convierte nombres de afiche en tráilers',()=>{const [m]=normalizeEste({billboardItems:[{content:{id:'a',title:'Prueba',posterUrl:'a.jpg',trailerUrl:'a.jpg'},shows:[{shows:[{cinemaId:'9999',date:'2026-10-21T23:50:00',formatLang:'2D Esp'}]}]}]});assert.equal(m.trailer,null);assert.equal(m.sessions[0].time,'23:50');assert.equal(m.sessions[0].date,'2026-10-21');});
test('datos vencidos, inválidos o del futuro no se presentan como actuales',()=>{const now=Date.parse('2026-10-21T15:00Z');assert.equal(isFresh('2026-10-21T14:00Z',now),true);assert.equal(isFresh('2026-10-21T11:59Z',now),false);assert.equal(isFresh(null,now),false);assert.equal(isFresh('2026-10-22T15:00Z',now),false);});
test('solo se aceptan tráilers de YouTube válidos',()=>{assert.equal(trailer('javascript:alert(1)'),null);assert.equal(trailer('https://www.youtube.com/embed/rPAHzsnQBVg?x=1'),'https://www.youtube.com/watch?v=rPAHzsnQBVg');});
test('cambios inesperados de esquema generan errores, no cartelera inventada',()=>{assert.throws(()=>normalizeEste({}));assert.throws(()=>normalizeLife({data:[]},'punta'));});

test('agenda ordena por fecha y hora, distingue cines y versiones y agrupa duplicados',async()=>{
 const {agendaSessions}=await import('../docs/data-model.js');
 const session={date:'2026-10-21',time:'20:00',format:'2D Esp',room:'Sala 1'};
 const movies=[{id:'a',source:'life',title:'A',sessions:[session,{...session,room:'Sala 2'},{...session}, {...session,time:'16:30'},{...session,format:'2D Sub'},{...session,date:'2026-10-22'}]},{id:'b',source:'este',title:'B',sessions:[session]}];
 const entries=agendaSessions(movies);assert.equal(entries.length,5);assert.equal(entries[0].time,'16:30');assert.equal(entries.at(-1).date,'2026-10-22');assert.deepEqual(entries.find(s=>s.movie.id==='a'&&s.time==='20:00'&&s.format==='2D Esp'&&s.date==='2026-10-21').rooms,['Sala 1','Sala 2']);assert.equal(movies[0].sessions.length,6);
});

test('programación posiciona horarios en el eje horizontal y separa funciones superpuestas',async()=>{
 const {timelineLayout}=await import('../docs/data-model.js');const movie={id:'a',source:'life',title:'A'};const layout=timelineLayout([{movie,time:'16:00'},{movie,time:'16:15'},{movie,time:'19:00'}]);assert.equal(layout.rows.length,1);assert.equal(layout.rows[0].events[0].offset,0);assert.equal(layout.rows[0].events[1].lane,1);assert.equal(layout.rows[0].events[2].lane,0);assert.ok(layout.end>=20*60);assert.equal(timelineLayout([]).rows.length,0);
});

test('enlaces de navegación identifican cada cine y no fijan el origen del usuario',async()=>{const{sources,navigationLinks}=await import('../docs/data-model.js');for(const cinema of sources){const urls=navigationLinks(cinema);const maps=new URL(urls.maps);const waze=new URL(urls.waze);assert.equal(maps.searchParams.get('api'),'1');assert.ok(maps.searchParams.get('destination').includes(cinema.venue));assert.equal(maps.searchParams.has('origin'),false);assert.equal(waze.searchParams.get('ll'),cinema.lat+','+cinema.lng);assert.equal(waze.searchParams.get('navigate'),'yes');}assert.notEqual(navigationLinks(sources[0]).waze,navigationLinks(sources[1]).waze);});

test('compra conserva la función y sala oficiales y enlaza la película del Este',async()=>{
 const {agendaSessions}=await import('../docs/data-model.js');
 const [m]=normalizeLife({success:true,data:[{id:'a',name:'PELÍCULA: Prueba',schedules:[{id:'show-1',numbered:true,complexId:'punta',roomName:'Sala 1',startDate:1792692000000},{id:'show-2',numbered:true,complexId:'punta',roomName:'Sala 2',startDate:1792692000000}]}]},'punta');
 assert.equal(m.url,'https://www.lifecinemas.com.uy/pelicula/pelicula-prueba?complex=Punta+del+Este');
 const [s]=agendaSessions([m]);assert.deepEqual(s.tickets.map(t=>[t.room,t.url]),[['Sala 1','https://www.lifecinemas.com.uy/seats?scheduleId=show-1'],['Sala 2','https://www.lifecinemas.com.uy/seats?scheduleId=show-2']]);
 const [e]=normalizeEste({billboardItems:[{content:{id:'official-id',title:'Prueba',urlSlug:'prueba',posterUrl:'a.jpg'},shows:[]}]});assert.equal(e.url,'https://www.cinesdeleste.com.uy/movie/official-id/prueba');
});
