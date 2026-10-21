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
