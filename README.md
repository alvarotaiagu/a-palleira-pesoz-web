# A Palleira · Pesoz (Asturias) · «Paja y naranja»

Web nueva para **A Palleira**, una casa de aldea que fue pajar, en El Caleyo (Pesoz, Asturias). Se alquila entera (4 plazas, 2 dormitorios dobles, 1 baño, chimenea, terraza, patio con fuente y un corredor de madera con panoyas). No la ha encargado nadie: es una propuesta que Álvaro le enseñará a Alejandro, el dueño. En local, con `noindex, nofollow` en todas las páginas, **sin publicar**.

- **Datos y fuentes:** `ref/DATOS-A-PALLEIRA.md`. Lo que no está ahí no se afirma: va a `PENDIENTES.md` o sale como «supuesto» / «por confirmar».
- **Encargo:** `ENCARGO.md` (cinco agentes: Web, Entrada, Paja, Corredor y Mapa). Una sola página (`index.html`) más legales y 404. Solo castellano.
- **Nada de historia inventada:** no hay fechas de construcción ni de reforma. Lo único con fecha es el Palacio de Ron (siglo XVII, fachada de 1909), que sale de DATOS.
- **Corrección de datos (INE):** Pesoz **no** es «el concejo más pequeño» ni «el menos poblado»: tiene 134 vecinos (padrón a 1-1-2025), los mismos que Yernes y Tameza. La web dice «uno de los concejos con menos vecinos de Asturias: 134, según el INE» (en «Alrededor»).

## Concepto

*Palleira* es «pajar», y la casa lo fue. La web es un cartel cálido con **su naranja** (#F67B02, medido en su tarjeta) y los colores de su logo (una A marrón cruzada por una P crema con forma de cayado). La portada es **«Desde el corredor»**: la vista desde su corredor (foto 27) con «A Palleira» en grande metido *detrás* de los pilares y apoyado tras el pasamanos (2026-10-28, sustituye a la paja WebGL, que dejaba la foto borrosa). Lo demás sale de lo que ya es suyo: las panoyas del corredor (Corredor), su mapa de carreteras rehecho (Mapa), la pizarra a tiza del cierre (Entrada) y el montón de paja del pie (Paja).

### Las cuatro superficies

| Superficie | Color | Dónde |
|---|---|---|
| `sup-crema` (`sup-crema-2`) | `#F6EBD3` (`#EFE0BF`) | La casa, Alrededor, Cómo llegar, Reservar, la tabla «de un vistazo» |
| `sup-naranja` | `#F67B02` | (la etiqueta de la reserva, botones) |
| `sup-pizarra` | `#2E3236` | Dentro, el cierre |
| `sup-marron` | `#3B1C0A` | Opiniones, el pie |

Cada superficie define `--fondo --texto --texto-2 --acento --linea --btn-f --btn-t --foco --marco --subr`. Los tokens de marca que leen los módulos están en `:root` con estos nombres: `--naranja --teja --marron --crema --paja --pizarra --tinta` y `--fuente-titulo --fuente-texto --fuente-cifras` (más `--naranja-texto`, el naranja oscurecido para texto sobre crema, y `--paja-claro`, para texto pequeño sobre pizarra y marrón).

**Letras** (Google Fonts, `display=swap`): **Chonburi** (titulares), **Host Grotesk** 400–600 (texto) y **Martian Mono** (cifras: el 134, precios, km). Ojo: Martian Mono aparece también en `plantilla-abogados-trinquete-web`, `plantilla-panaderia-web` y un boceto; el encargo decía que no estaba en la cartera. Si molesta, se cambia por otra mono (Azeret, Spline Sans Mono… ya usadas también; Chivo Mono, la menos usada) tocando solo el `<link>` de `partes/cabeza.html` y `--fuente-cifras`.

**Botones:** marrón con texto crema sobre crema y naranja, crema con texto marrón sobre pizarra y marrón; el naranja entra en la sombra. El naranja con texto marrón no da más de **Lc 52 de APCA** ni con negro puro, así que el texto que va sobre naranja es grande y firme (WCAG 5,7:1) y `verificar.mjs` pide Lc 45 ahí y Lc 60 en el resto.

**§5 bis:** fuera la pila sticky de tarjetas y el marquee; sin cursor propio; la portada con profundidad (el marco del corredor delante del titular y separándose del paisaje al bajar); el objeto que se completa en el pie (el montón de paja de Paja, y la pizarra escrita de Entrada); **foco del teclado con forma propia**: contorno de 2 px en el color de cada superficie (marrón sobre naranja y crema, crema sobre pizarra y marrón) y una **muesca naranja** en la esquina (`#foco-muesca`, la coloca `main.js`); y **la espiga**: el punto del enlace activo de la cabecera es una espiga de paja.

### La página, de arriba abajo

| # | Sección | Quién | Qué lleva |
|---|---|---|---|
| — | **Cortina «el monograma»** | Entrada | La A se traza, la P cae como un cayado, las hojas se abren como las puertas de un pajar y el monograma vuela a la cabecera. |
| 1 | **Portada «Desde el corredor»** (pizarra) | Web | Tres capas con las coordenadas de la foto 27 (1920×866): el fondo, las 9 letras de «A Palleira» en SVG (Chonburi a 166, avances medidos en la fuente: la A a la izquierda del pilar central, «Palleira» entre ese pilar y el poste) y el marco de madera recortado (`img/portada/marco-*.webp`, de `python scripts/portada-marco.py`). Las letras suben desde detrás del pasamanos al abrirse la cortina; `--p` (main.js) hace crecer el marco más que el paisaje al bajar. En pantallas de menos de 5:4, la vista es una banda bajo la cabecera y el texto va debajo. |
| 2 | **La casa** | Corredor | El recorrido de lado con las cuatro ristras de panoyas. Sticky: ningún antepasado con overflow ni transform. |
| — | *De un vistazo* | Web | Solo en la sobria: plazas, dormitorios, camas, baño, servicios, precio orientativo, cancelación, distancias. |
| 3 | **Dentro** (pizarra) | Web | Por estancias: índice fijo a la izquierda (marca la que se ve) y las fotos de cada una a la derecha, sin marcos; 13 fotos con visor por nombre. «Lo que tiene la casa» es ahora la **ficha** del final de «La casa» (cifras 4·2·3·1, 8 servicios con icono y las condiciones). |
| 5 | **Alrededor** | Web | Palacio de Ron, iglesia de Santiago y castros, Agüeira y Navia, Grandas y San Martín de Oscos, playas, viñas, con distancias de OSRM. |
| 6 | **Cómo llegar «Su mapa, rehecho»** | Mapa + Web | La tarjeta naranja redibujada con rutas por origen; debajo, la dirección, el mapa de Google solo al pedirlo y el teléfono. |
| 7 | **Opiniones** (marrón) | Web | 4,85 · 47 en Airbnb, seis notas por apartado y los temas. **Ninguna cita inventada.** |
| 8 | **Reservar** | Web | Motor de DEMOSTRACIÓN (ver abajo). |
| 9 | **Cierre «Lo importante ye querese»** (pizarra) | Entrada | La frase a tiza, trazo a trazo. |
| 10 | **Pie** (marrón) | Web + Paja | Logo en su caja, dirección, teléfono, registro CA-1033-AS, «Casa rural íntegra · 2 trisqueles», legales y el montón de paja. |

## Cómo se trabaja

- **Edita siempre los `*.src.html` o las `partes/`** (cabeza, cabecera, reserva, pie y guiones; la cortina es de Entrada). `node construir.mjs` incluye las partes (`<!--parte:…-->`), convierte `<img data-foto>` en `<picture>` AVIF/WebP/JPG, **quita los `<link>`/`<script>` propios que aún no existan** (con aviso), escribe en el HTML las distancias de `ref/raw/rutas.json` (los `<span data-km>` y la tabla de la sobria; sin el fichero, quedan vacíos) y pone `?v=<huella>` (`versionar.mjs`). Recuerda «Ctrl+F5» si se publica. Los `.bin` y `img/entrada/*` los piden sus módulos con su propia ruta.
- **Fotos:** `scripts/fotos-lista.json` + `node scripts/fotos.mjs` (o `node scripts/fotos.mjs corredor patio`). 26 fotos con los nombres de la tabla del encargo → `img/fotos/<nombre>-<ancho>.{avif,webp,jpg}` + `fotos.json`. **Nunca se amplía por encima de `maxAncho`** (las de Airbnb son pequeñas de origen y están reescaladas a 1920). La 09 (`corredor`) se recorta sin su marco naranja (30, 26, 1863×806; **si cambia, relanzar `python scripts/paja-puntos.py`**) y no pasa de 1100 px. Gradación: las de 2014 bajan el amarillo (`bal` 0,7), los exteriores bajan el verde y comprimen las luces, la `pizarra` no se toca (Entrada saca de ella el esqueleto de las letras). **No se usan** la 11 (marca de agua de ZonasRurales), la 12 (casa ajena), la 13 (tarjeta) ni la 21 (lleva firma).
- **Marca:** `node scripts/marca.mjs` → favicons, icono, apple-touch e `img/og.jpg` desde `marca/monograma.svg` y `marca/logo-caja.svg` (de Entrada).
- **Legales y 404:** `node scripts/legales.mjs` y después `node construir.mjs`.
- **`node verificar.mjs`** (puerto 8921, una vez al terminar; `node verificar.mjs 4 5` solo corre esos bloques; sin capturas; navegador con `--disable-3d-apis` y la página con `?sin-webgl`).
- **`node scripts/rendimiento.mjs`** (puerto 8922): móvil de gama media (Pixel 7, 4G lento, CPU ×4), sin WebGL.
- **`node scripts/probar-borrado-mando.mjs`**: comprueba la receta de borrado del mando.
- **Playwright:** una prueba a la vez; antes, `Get-CimInstance Win32_Process -Filter "Name='chrome-headless-shell.exe'"`.

## Contrato web ↔ módulos

- `window.Palleira.<mod>.montar(el, { movimiento, densidad: 'paja'|'sobria' })` → `{ destruir() }`; el HTML de `el` es el respaldo. Módulos: `cortina` (se monta sola), `pajaPie`, `corredor`, `mapa`, `pizarra` (`paja.js` aún trae el módulo de portada, sin uso; `vecinos.js` se quitó el 2026-10-28). `main.js` monta cada uno **al acercarse** (900 px de margen); la **portada** se abre (`.abierta`) en `Palleira.cortina.alAbrirse`; el **montón del pie** (`paja-pie`), **al cargar**. Guarda cada respaldo: al cambiar de densidad, `destruir()`, devuelve el respaldo y vuelve a montar.
- La web pone `Palleira.reservar({ mes?, entrada?, salida? })`, `Palleira.visor.abrir(lista, nombre)` (abre por nombre), `Palleira.motor` y `Palleira.web` (irA, motion, sobria…). Los botones `[data-reservar]` llaman a `reservar`.
- Eventos en `document`: `palleira:fechas` (`{ entrada, salida, personas }` o `null`; lo lanza la reserva; ahora no lo escucha nadie), `palleira:posada` (Paja), `palleira:cortina-abre` y `palleira:cortina-fuera` (Entrada), `palleira:densidad` y `palleira:resize`.
- La cortina define su propio puente (`Palleira.cortina` y las clases `cortina-activa`, `cortina-abriendo`, `cortina-aterriza`, `cortina-fuera`) en `partes/cortina.html`; el logo de la cabecera lleva `data-cortina-destino`. Sin esa parte, la web va sin cortina.
- **Sticky del recorrido (Corredor):** ningún antepasado de `[data-modulo="corredor"]` lleva `overflow` ni `transform`; `verificar.mjs` lo comprueba. No hay Lenis ni GSAP: scroll nativo.

## Reservar (DEMOSTRACIÓN)

Cuatro pasos: **fechas → personas → datos → confirmación** (localizador `PALLEIRA-AAMMDD-NNN`). Calendario de 12 meses con noches ocupadas **inventadas y siempre las mismas** (semilla fija), personas de 1 a 4, **etiqueta de cartel naranja** con el monograma como resumen. Al cambiar fechas o personas lanza `palleira:fechas` (o `null` si no hay fechas completas). **No envía, guarda ni cobra nada, y lo dice** (encima del motor, junto al botón y en la confirmación).

**Supuestos** (marcados junto al motor y en `PENDIENTES.md`): **60 € la noche en temporada baja y 70 € en alta, casa entera y limpieza incluida** (la horquilla de Turismo Asturias; dónde cae la alta es supuesto: Semana Santa, puentes y festivos, julio y agosto) y **mínimo 2 noches**. **Reales:** casa entera, 4 plazas, cancelación 30 días, no admite animales, se reserva con Alejandro; entrada y salida «a convenir con Alejandro» (no constan horarios).

## Mando de densidades (solo con `?revision`)

- **«Paja»:** cortina completa, hebras vivas, panoyas que se balancean, carreteras que se trazan, puntos que se encienden, tiza que escribe.
- **«Sobria»:** todo quieto y completo (el dibujo ya hecho y la foto, panoyas quietas, mapa trazado, puntos encendidos, pizarra escrita). **Añade** la tabla «A Palleira, de un vistazo». La cortina se retira al instante.
- `?revision&densidad=sobria` abre ya en la sobria.

### Receta de borrado del mando

1. En `partes/cabeza.html`, en el script, el `try { … }` de `// MANDO DE MAQUETA`.
2. En `partes/pie.html`, el bloque `<!-- MANDO DE MAQUETA` … `<!-- fin del MANDO DE MAQUETA -->`.
3. En `js/main.js`, el bloque `MANDO DE MAQUETA` hasta `fin del MANDO DE MAQUETA`.
4. Opcional: `.mando` y `.vistazo` en `css/estilos.css` y la sección `#vistazo` de `index.src.html`.
5. `node construir.mjs`. (`node scripts/probar-borrado-mando.mjs` lo comprueba en memoria: pasa.)

## Comprobaciones

`verificar.mjs`: archivos y noindex, ids, fotos (nombres, anchos, ninguna ampliada), textos (opiniones con su recuento y fecha, ni una cita, sin «menos poblado», sin fechas inventadas, glosa), contrato de módulos (huecos, orden, `defer`), CSS de cookies/mando/menú/dvh, tokens y letras, **contraste WCAG y APCA** en las cuatro superficies, foco con muesca, sticky del corredor, visor por nombre (cada miniatura, desktop y móvil con `tap()`, y `elementFromPoint` en los botones ‹ ›), motor de punta a punta (`palleira:fechas`, precios 60/70, mínimo, personas, `PALLEIRA-AAMMDD-NNN`, sin peticiones que no sean GET), cookies en 4 pasos, mapa de Google a petición, mando y sobria, móvil a 360/375/390/768 (sin scroll lateral, menú con la cabecera fija, barra del navegador sin rehacer nada), legales, la web sin ninguno de los módulos, y al final con movimiento: la cortina, recargar a media página (`scrollY === 0`), los titulares en móvil y sin JavaScript.

## Qué mirar en Chrome (con tarjeta gráfica: aquí el WebGL no se pinta)

- **La cortina y la portada:** que la A se trace, la P caiga como un cayado y las hojas se abran; que las letras de «A Palleira» suban desde detrás del pasamanos y queden **entre** los pilares (el central hace de espacio entre «A» y «Palleira»), y que al bajar el marco se separe del paisaje sin dejar halo en los bordes de los pilares; en vertical, la vista es una banda y el texto va debajo. Con `?revision&densidad=sobria`, todo quieto.
- **La foto 09 en el respaldo:** es pequeña de origen (unos 1000 px reales): a pantalla completa se ve blanda. Hace falta una foto nueva del corredor en grande.
- **«Dentro»:** que los bloques con fotos no se pisen y las verticales (recortadas a 3:4) se vean bien. Pulsar cada foto.
- **El foco del teclado** (Tab): contorno de 2 px y la muesca naranja en las cuatro superficies.
- **El naranja con texto marrón** en Pesoz y en la etiqueta de Reservar: si el texto se ve fino, se sube el cuerpo o el peso (no hay más contraste posible).
- **La espiga** del enlace activo de la cabecera, al bajar.
- **«Reservar»:** que la etiqueta naranja (con agujero y borde de puntos) se lea bien.
- **Martian Mono:** es ancha; si los números (el 134, los km) se ven pesados, otra mono.

## Para publicar

Repo propio y GitHub Pages sobre la rama real (como las anteriores). Antes, `PENDIENTES.md` y la receta de borrado del mando. Quitar el `noindex` solo si se vende.

## Resultado de la última pasada (2026-10-28, con los cinco módulos puestos)

- **`node construir.mjs && node verificar.mjs`** (2026-10-28, tras la portada nueva): 166 ok y 5 fallos de la propia prueba (el h1 y la escena recortada a propósito), corregidos y repasados sus bloques (34/34). Desde ese día el navegador de pruebas **muestra las barras de scroll** y el «sin scroll lateral» compara con `clientWidth`: con las barras ocultas no se veía que el corredor se pasaba 15 px.
- **`scripts/rendimiento.mjs`** (Pixel 7, 4G lento, CPU ×4, sin WebGL, tres pasadas): **LCP 1,46–1,53 s** con la portada anterior (foto `corredor-1100.avif`; la nueva, `portada-*.avif` + el marco, está sin medir); 23 peticiones y ~587 KB (sin las letras de Google); tareas largas de 50–135 ms mientras la cortina anima. La cortina se va a los ~4,7 s con la CPU ×4.
