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

## 3. Crear tablas y cargar el corte estadístico

Con `DATABASE_URL` disponible en `.env.local`:

```bash
npm install
npm run db:setup
```

`db:setup` ejecuta, en este orden:

1. `database/schema.sql`
2. `database/seed.sql`
3. verificación de cantidad de filas y totales por integración

Resultado esperado:

```text
Filas en judicial_integration_records: 771
```

También puedes ejecutar cada paso por separado:

```bash
npm run db:init
npm run db:seed
npm run db:verify
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
