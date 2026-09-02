# José & Vásquez Abogados — Blog con Pages CMS

La apariencia visual del sitio permanece igual. El blog se administra desde Pages CMS y se genera automáticamente en Render.

## Render
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Root Directory: vacío
- Auto Deploy: Yes

## Pages CMS
El archivo `.pages.yml` ya está configurado. La colección **Blog** administra `content/blog/*.md`.

Al crear o editar una entrada en Pages CMS, se realiza un commit en GitHub. Render detecta el cambio y ejecuta el build automáticamente.

## Formulario
En Render, Netlify Forms no funciona. El build convierte el formulario de contacto de la home para usar FormSubmit con `abogadosjosevasquez@gmail.com`. En el primer envío de prueba, FormSubmit puede pedir confirmar la dirección por correo.
