# CinePunta

Cartelera independiente de Punta del Este, publicada en https://lostandloudart.github.io/cinepunta/.

## Datos reales y actualización

- LIFE Punta del Este (Punta Shopping): se descubre el complejo por su nombre en `/api/complex/active`, se obtienen películas y funciones en `/api/movie`, y tráilers en `/api/movie/:id` del dominio oficial `www.lifecinemas.com.uy`.
- Cines del Este (Shopping Atlántico): API pública utilizada por su sitio oficial, `https://cde-prod-web-api.azurewebsites.net/api/shows/cinema/weekly`.
- GitHub Actions consulta ambas fuentes cada hora (minuto 17), al publicar cambios y manualmente. Descarga afiches reales para servirlos desde Pages. Los horarios conservan fecha, versión y sala de origen.
- Al entrar, el navegador carga el último respaldo sin caché e intenta consultar Cines del Este en vivo. Se repite cada cinco minutos con la página visible y al regresar a la pestaña. LIFE no permite CORS y utiliza el respaldo horario.
- Cada fuente conserva su propia fecha de consulta. Una fuente que falla se señala como tal; su respaldo no se muestra como confirmado. Los datos de más de tres horas se ocultan. GitHub puede demorar o suspender tareas programadas (por ejemplo tras 60 días de inactividad en repositorios públicos); la interfaz no oculta esa limitación y ofrece los enlaces oficiales. Se puede reactivar desde Actions y ejecutar el flujo manual.
- Fecha y horas en `America/Montevideo`. Las funciones se filtran por su fecha real: no se trasladan horarios a otro día. El selector de ocho días puede contener fechas sin funciones publicadas.
- Los enlaces de entradas llevan al cine oficial, donde se confirma disponibilidad. Los tráilers son enlaces provistos por la fuente, sin búsquedas aproximadas. Cuando no hay uno válido se informa.
- Guía independiente, sin afiliación a los cines. Afiches y contenido pertenecen a sus titulares.

## Desarrollo

Requiere Node.js 22 o superior, sin dependencias externas.

```
npm test
npm run update
python3 -m http.server 8000 --directory docs
```

## Publicación

GitHub Pages utiliza GitHub Actions. El flujo valida las reglas de fecha y datos, actualiza la cartelera, guarda la instantánea y publica `docs/`. Permisos mínimos del flujo: `contents:write`, `pages:write`, `id-token:write`. No utiliza claves de API ni secretos propios.

El sitio original de la conversación de ChatGPT no estaba incluido en la referencia recuperable. Esta implementación reconstruye CinePunta con los requisitos solicitados y fuentes oficiales verificadas.

## Agenda de funciones

La vista **Día** ordena las funciones de ambos cines por hora. **Semana** muestra siete columnas de fechas, con acceso al detalle de cada día y desplazamiento en pantallas pequeñas. La tira de días permite elegir cualquiera de las ocho fechas disponibles. **Afiches** conserva la cartelera visual. Todas las vistas comparten filtros de título, cine, género y versión. Las funciones simultáneas de una misma película, cine y versión se agrupan indicando sus salas; las versiones diferentes se conservan separadas. Las funciones iniciadas se distinguen visualmente.

La vista **Programación** presenta una guía con horas en el eje horizontal y películas/cines en filas. Cada tarjeta marca la hora de inicio, sin atribuir duraciones no verificadas. Las funciones que coinciden se distribuyen en subfilas. Al tocar una función se muestra su detalle. Los tráilers se reproducen en un diálogo con YouTube integrado (dominio youtube-nocookie.com), se cierran con Escape o el botón de cierre y se detienen al cerrar. La disponibilidad de reproducción integrada depende del titular de cada video.

## Fichas, puntajes y críticas

Cada película tiene una ficha accesible desde su título o el botón Ver ficha, con sinopsis, clasificación local, duración anunciada por el cine, dirección, reparto, tráiler y próximas funciones en ambos cines. Los datos técnicos provienen de los cines; sus diferencias entre versiones se conservan.

`scripts/review-sources.json` vincula títulos y variantes con páginas externas revisadas. El actualizador valida el nombre del director contra los datos estructurados de Rotten Tomatoes antes de aceptar un puntaje. Separa Tomatometer (crítica) y Popcornmeter (público), muestra fecha de consulta y cantidad de valoraciones, y nunca transforma la ausencia de un puntaje en un cero. Las notas de críticas individuales mantienen su escala y autor. Cada ficha enlaza sus fuentes y las críticas completas; los extractos se limitan a 20 palabras y las síntesis se identifican como tales.

Los puntajes externos se intentan renovar cada 24 horas durante el flujo horario. Si una fuente falla, se conserva la consulta anterior con su fecha real. No se inventan notas ni se asignan automáticamente fuentes a películas nuevas: requieren una vinculación verificada. Los cambios de esquema y la identidad del director se prueban en `scripts/reviews.test.mjs`.
