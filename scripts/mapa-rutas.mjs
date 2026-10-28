// Rutas por carretera con OSRM (servidor público, perfil coche) desde y hacia la casa -> ref/raw/rutas.json
import { writeFileSync } from 'node:fs';
const UA = 'maqueta-web-local/1.0 (prueba de maqueta sin publicar)';
const CASA = { lat: 43.256559, lon: -6.875258 }; // Turismo Asturias
const DEST = [
  ['grandas','Grandas de Salime',43.2176587,-6.8757234,'pueblo','Wikipedia (coordenadas de la villa)'],
  ['san-martin-oscos','San Martín de Oscos',43.2654419,-6.9617224,'pueblo','Wikipedia (coordenadas de la villa)'],
  ['navia','Navia',43.5410045,-6.7206757,'pueblo','Nominatim/OSM'],
  ['vegadeo','Vegadeo',43.4452755,-7.0544368,'pueblo','Nominatim/OSM (A Veiga / Vegadeo)'],
  ['fonsagrada','A Fonsagrada',43.1283139,-7.0428451,'pueblo','Nominatim/OSM'],
  ['lugo','Lugo',43.0121,-7.5558,'ciudad','Nominatim/OSM y Wikipedia'],
  ['oviedo','Oviedo',43.3619,-5.8484,'ciudad','Nominatim/OSM'],
  ['pola-allande','Pola de Allande',43.271901,-6.6097123,'pueblo','Nominatim/OSM'],
  ['madrid','Madrid',40.41678,-3.703507,'ciudad','Nominatim/OSM'],
  ['aeropuerto','Aeropuerto de Asturias',43.5636,-6.0347,'aeropuerto','Wikipedia'],
  ['frexulfe','Playa de Frexulfe (Navia)',43.5597827,-6.674581,'playa','Nominatim/OSM'],
  ['barayo','Playa de Barayo (Valdés)',43.5609551,-6.6151026,'playa','Nominatim/OSM'],
  ['penarronda','Playa de Peñarronda (Castropol)',43.5532994,-6.9961261,'playa','Nominatim/OSM'],
  ['catedrales','Playa de las Catedrales (Ribadeo)',43.5543337,-7.1573791,'playa','Nominatim/OSM'],
  ['paicega','A Paicega',43.2428045,-6.8486179,'lugar','OSM (hamlet)'],
  ['presa-salime','Presa de Salime',43.236487,-6.8468569,'lugar','Nominatim/OSM'],
  ['la-garganta','Alto de la Garganta',43.3466309,-7.0125359,'puerto','Nominatim/OSM (carretera de A Veiga a Pezós)'],
];
async function osrm(a,b,intentos=4){
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false&steps=true&alternatives=false`;
  for (let i=0;i<intentos;i++){
    try{ const r=await fetch(url,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(40000)}); if(r.ok){const j=await r.json(); if(j.code==='Ok') return j.routes[0];} }catch(e){}
    await new Promise(r=>setTimeout(r,2000));
  }
  throw new Error('OSRM falla '+url);
}
function resumen(ruta){
  const carreteras=[]; const tramos=[];
  for (const leg of ruta.legs) for (const s of leg.steps){
    const ref=(s.ref||'').split(';')[0].trim()||null; // carretera principal del tramo
    if (s.distance<1) continue;
    tramos.push({ref, nombre:s.name||null, km:+(s.distance/1000).toFixed(2)});
    if (ref && carreteras[carreteras.length-1]!==ref) carreteras.push(ref);
  }
  return { minutos:Math.round(ruta.duration/60), km:+(ruta.distance/1000).toFixed(1), carreteras, tramos };
}
const salida = { fuente:'OSRM (router.project-osrm.org, perfil coche, datos de OpenStreetMap ODbL)', fecha:new Date().toISOString().slice(0,10),
  nota:'Tiempos de OSRM con velocidades teóricas, sin tráfico ni paradas; orientativos. «desde_casa» = casa → destino; «hacia_casa» = destino → casa.',
  casa:{...CASA, fuente:'Turismo Asturias (otras fuentes dan puntos a ~150 m; ver DATOS-A-PALLEIRA.md)'}, destinos:{} };
for (const [id,nombre,lat,lon,tipo,fuente] of DEST){
  const d={lat,lon};
  const ida=resumen(await osrm(CASA,d)), vuelta=resumen(await osrm(d,CASA));
  salida.destinos[id]={nombre,tipo,lat,lon,fuente_coordenadas:fuente,desde_casa:ida,hacia_casa:vuelta};
  console.log(id.padEnd(18),'ida',ida.minutos+' min',ida.km+' km',ida.carreteras.join('>'),'| vuelta',vuelta.minutos+' min',vuelta.km+' km',vuelta.carreteras.join('>'));
  await new Promise(r=>setTimeout(r,1200));
}
writeFileSync('ref/raw/rutas.json',JSON.stringify(salida,null,1));
