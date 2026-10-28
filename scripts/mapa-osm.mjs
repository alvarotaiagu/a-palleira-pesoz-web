// Descarga el concejo de Pesoz de OpenStreetMap (Overpass, con espejos) a ref/raw/osm-pesoz-bruto.json
import { writeFileSync } from 'node:fs';
const UA = 'maqueta-web-local/1.0 (prueba de maqueta sin publicar)';
const ESPEJOS = ['https://maps.mail.ru/osm/tools/overpass/api/interpreter','https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.private.coffee/api/interpreter'];
async function overpass(q,permitirVacio=false){
  for (let ronda=0; ronda<3; ronda++) for (const e of ESPEJOS){
    try{
      const r = await fetch(e,{method:'POST',headers:{'User-Agent':UA,'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(q),signal:AbortSignal.timeout(80000)});
      if(r.ok){ const j=await r.json(); if(j.elements && (j.elements.length || permitirVacio)) return {j,espejo:e}; }
      console.error(e,r.status);
    }catch(err){ console.error(e,err.message); }
    await new Promise(r=>setTimeout(r,1500));
  }
  throw new Error('Overpass no responde');
}
const area = 'area(id:3600346393)->.c;';
const consultas = {
  limite: '[out:json][timeout:60];rel(346393);out geom;',
  nucleos: `[out:json][timeout:60];${area}nwr(area.c)["place"];out center tags;`,
  rios: `[out:json][timeout:60];${area}way(area.c)["waterway"~"^(river|stream)$"];out geom tags;`,
  agua: `[out:json][timeout:60];${area}(way(area.c)["natural"="water"];rel(area.c)["natural"="water"];);out geom tags;`,
  carreteras: `[out:json][timeout:90];${area}way(area.c)["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential)$"];out geom tags;`,
};
const salida = { fuente:'OpenStreetMap (ODbL) vía Overpass API', fecha: new Date().toISOString().slice(0,10) };
for (const [k,q] of Object.entries(consultas)){ const {j,espejo}=await overpass(q,k==='agua'); salida[k]=j.elements; console.log(k,j.elements.length,espejo); }
writeFileSync('ref/raw/osm-pesoz-bruto.json', JSON.stringify(salida));
