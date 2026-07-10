# Despliegue de Orbitfinc

Stack de despliegue elegido (los tres tienen nivel gratuito permanente, no solo trial):

- **Base de datos** → [Neon](https://neon.tech) (Postgres serverless)
- **Backend (NestJS)** → [Render](https://render.com) (Web Service)
- **Frontend (Next.js)** → [Vercel](https://vercel.com)

No hace falta configurar CORS: el frontend nunca llama al backend desde el navegador (JS del cliente). Todas las llamadas ocurren server-to-server, desde Server Components, Server Actions y `proxy.ts` (middleware) — por eso el backend puede vivir en un dominio completamente distinto sin fricción.

## Estado actual

- [x] Base de datos Neon creada, las 3 migraciones ya aplicadas (`prisma migrate deploy`).
- [x] Repo preparado para producción: `start:prod` corregido (apuntaba a una ruta que no existía), `prisma generate` agregado al build, `trust proxy` agregado para que el rate limiting funcione correctamente detrás del proxy de Render.
- [ ] Backend desplegado en Render.
- [ ] Frontend desplegado en Vercel.

## Paso 1 — Backend en Render

1. En Render: **New +** → **Web Service** → conectar el repo `DevKendrySoto/OrbitFinances`.
2. **Root Directory**: `backend`
3. **Build Command**:
   ```
   npm install --include=dev && npm run build && npx prisma migrate deploy
   ```
   (`npm run build` ya corre `prisma generate` internamente; `migrate deploy` aplica migraciones nuevas en cada despliegue futuro sin pedir confirmación interactiva. El `--include=dev` es obligatorio: con `NODE_ENV=production` puesto como variable de entorno, `npm install` por defecto se salta las `devDependencies` — y ahí vive `@nestjs/cli`, que provee el comando `nest` que usa `npm run build`. Sin esta flag el build falla con `nest: not found`.)
4. **Start Command**:
   ```
   npm run start:prod
   ```
5. **Health Check Path**: `/health`
6. Variables de entorno (Environment):
   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | la cadena de conexión de Neon (la que ya usamos para las migraciones) |
   | `JWT_SECRET` | un secreto fuerte generado para producción — **no reutilizar el de `.env` local**. Te lo pasé en el chat, cópialo de ahí. |
   | `JWT_ACCESS_TOKEN_TTL` | `900` |
   | `JWT_REFRESH_TOKEN_TTL_DAYS` | `30` |
   | `NODE_ENV` | `production` |

   No hace falta `SHADOW_DATABASE_URL` en producción (solo se usa para `migrate dev`, que no corre aquí).
7. Deploy. Al terminar, Render te da una URL pública tipo `https://orbitfinc-backend.onrender.com`. Guárdala, la necesitas para el paso 2.

**Nota sobre el free tier de Render**: el servicio "se duerme" tras ~15 min sin tráfico y la primera visita después tarda entre 30-60 segundos en despertar. Para una app de uso familiar esto es aceptable; si en el futuro molesta, se puede subir al plan pago (~$7/mes) para que no se duerma.

## Paso 2 — Frontend en Vercel

1. En Vercel: **Add New** → **Project** → importar el mismo repo.
2. **Root Directory**: `frontend`
3. Framework se detecta automáticamente (Next.js).
4. Variables de entorno:
   | Variable | Valor |
   |---|---|
   | `BACKEND_API_URL` | la URL de Render del paso 1 (ej. `https://orbitfinc-backend.onrender.com`) |
   | `JWT_ACCESS_TOKEN_TTL` | `900` (debe coincidir con el backend) |
   | `JWT_REFRESH_TOKEN_TTL_DAYS` | `30` (debe coincidir con el backend) |
5. Deploy. Vercel te da una URL tipo `https://orbitfinances.vercel.app`.

## Paso 3 — Verificación

1. Abre la URL de Vercel → `/register`, crea una cuenta de prueba.
2. Confirma que redirige a `/dashboard` y se ve el nombre/hogar.
3. Prueba registrar un ingreso, un gasto, y revisar `/insights`.
4. Cierra sesión y confirma que `/dashboard` redirige a `/login` si no hay sesión.

Si el primer request tarda ~30-60s en responder, es el "despertar" del backend en Render (ver nota arriba) — no es un error.

## Seguridad

- El `JWT_SECRET` de producción es distinto al de `.env` local — si en algún momento se expone (por ejemplo, en un chat o log), hay que rotarlo en Render y todos los usuarios tendrán que volver a iniciar sesión.
- Nunca commitear `.env`/`.env.local` ni la cadena de conexión de Neon al repo — todo vive como variable de entorno en el dashboard de cada proveedor.
