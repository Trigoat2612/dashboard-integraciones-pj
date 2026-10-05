# Configuración de Neon

Proyecto indicado por Neon:

- Project ID: `icy-hill-53299059`
- Branch: `production`

## 1. Vincular el repositorio con Neon

Desde la raíz del proyecto:

```bash
npm i -g neon@latest
neon auth
neon skills -y
neon mcp -y
neon link --project-id icy-hill-53299059 --branch production -y
```

`neon link` crea el contexto local `.neon` y normalmente obtiene las variables del branch en `.env.local`.

Si necesitas refrescarlas:

```bash
neon env pull
```

## 2. Configuración declarativa

El repositorio ya contiene `neon.ts`:

```ts
import { defineConfig } from "@neon/config/v1";

export default defineConfig({});
```

No es necesario volver a ejecutar `neon config init`. Si ya lo ejecutaste, conserva/reemplaza el archivo generado con el incluido en este proyecto.

Puedes validar y aplicar la configuración:

```bash
neon config plan
neon deploy
```

> `neon deploy` administra la configuración declarativa de Neon, pero **no crea las tablas ni carga los 771 registros del dashboard**. Esa parte se ejecuta con SQL.

## 3. Base de datos

### Si Neon está vacío

Con `DATABASE_URL` disponible en `.env.local`:

```bash
npm install
npm run db:setup
```

`db:setup` crea el esquema, carga el corte inicial de 771 filas y crea su histórico inicial.

### Si ya vienes de v1.1.x y tus 771 registros están funcionando

No vuelvas a ejecutar `db:setup`, porque el seed reconstruye el corte inicial. Migra únicamente el esquema:

```bash
npm install
npm run db:migrate
npm run db:verify
```

La migración agrega las tablas/columnas de auditoría sin borrar los registros vigentes. Los registros anteriores quedan respaldados como histórico `legacy`.

Comandos disponibles:

```bash
npm run db:init       # crea/actualiza esquema
npm run db:migrate    # alias seguro de db:init
npm run db:seed       # REINICIA con el seed inicial
npm run db:verify     # valida datos vigentes e histórico
npm run db:setup      # esquema + seed + verificación; usar solo para base nueva
```

## 4. Vercel

En Vercel agrega como variables de entorno:

```text
DATABASE_URL
DASHBOARD_PASSWORD
SESSION_SECRET
```

Usa el `DATABASE_URL` pooled que Neon entrega para el branch `production`.

Después de desplegar, la aplicación consulta Neon desde el servidor. Los Excel no necesitan estar dentro del repositorio.
