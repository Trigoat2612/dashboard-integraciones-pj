# Observatorio de Integraciones Judiciales · SIJUD

Dashboard responsive para consolidar y explorar estadísticas de integraciones del EJE No Penal. Preparado para **Git + Vercel + Neon** y alineado a `Agente.md`.

## Stack

- Next.js 16 + React 19 + TypeScript
- PostgreSQL en Neon
- `postgres` para acceso server-side
- `xlsx` para normalización de Excel en el navegador
- `@neon/config` + `neon.ts` para la configuración declarativa de Neon
- sesión privada mediante cookie HTTP-only
- gráficos HTML/CSS e iconos SVG inline

## Corte de datos incluido

Los tres Excel adjuntos fueron revisados. `Reporte Estadistico de la Integraciones v2(1).xlsx` es el libro canónico porque contiene las 10 hojas fuente completas; los otros dos archivos son subconjuntos idénticos y no se cargan adicionalmente.

- **10 integraciones**
- **771 filas fuente**
- Hojas `Res*`: solo referencia de tabla dinámica, no se importan
- Total agregado del corte: **1,774,547**

El detalle y los totales de validación están en `docs/FUENTES.md` y `data/source-summary.json`.

## Funcionalidades

- total por año
- filtros por integración, año, CSJ/Distrito Judicial, sede y órgano/instancia
- KPIs, distribución anual y top de sedes/dependencias
- tabla dinámica jerárquica similar a las hojas `Res*`
- exportación CSV
- importación Excel con vista previa
- exclusión automática de hojas `Res*`
- trazabilidad por archivo, hoja y fila fuente
- persistencia en Neon

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

Sin `DATABASE_URL`, el dashboard funciona con el corte local incluido de 771 filas. Con Neon configurado, lee y actualiza la base PostgreSQL.

## Neon

Neon te indicó:

```bash
npm i -g neon@latest
neon login
neon skills -y
neon mcp -y
neon link --project-id icy-hill-53299059 --branch production -y
neon config init
neon deploy
```

Para este repositorio queda así:

```bash
npm i -g neon@latest
neon auth
neon skills -y
neon mcp -y
neon link --project-id icy-hill-53299059 --branch production -y
npm install
neon config plan
neon deploy
npm run db:setup
```

El proyecto **ya incluye `neon.ts`**, por lo que no necesitas ejecutar `neon config init` salvo que quieras regenerarlo. El archivo contiene:

```ts
import { defineConfig } from "@neon/config/v1";

export default defineConfig({});
```

### Importante

`neon deploy` aplica la configuración declarativa del backend Neon. **No crea por sí solo las tablas del dashboard ni carga los datos.** Para eso ejecuta:

```bash
npm run db:setup
```

Este comando crea/actualiza el esquema, carga las 771 filas y muestra una verificación por integración.

También puedes usar:

```bash
npm run db:init
npm run db:seed
npm run db:verify
```

O ejecutar `database/neon_setup.sql` en el SQL Editor de Neon.

Guía completa: `docs/NEON_SETUP.md`.

## Variables de entorno

Neon normalmente escribe `DATABASE_URL` en `.env.local` al hacer `neon link` o `neon env pull`.

Completa además:

```env
DASHBOARD_PASSWORD=tu-clave
SESSION_SECRET=una-cadena-aleatoria-larga-de-al-menos-32-caracteres
```

## Vercel

1. Sube el repositorio a GitHub/GitLab/Bitbucket.
2. Importa el repositorio en Vercel.
3. En **Project Settings → Environment Variables** agrega:
   - `DATABASE_URL`
   - `DASHBOARD_PASSWORD`
   - `SESSION_SECRET`
4. Despliega.

Usa el `DATABASE_URL` pooled del branch `production` de Neon.

## Git

```bash
git init
git add .
git commit -m "feat: dashboard judicial con Neon"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

## Estructura relevante

```text
app/                    Next.js y API
components/             dashboard, sidebar e iconos
lib/                    auth, parser Excel, BD y tipos
data/                   fallback local de 771 filas + resumen
database/schema.sql     esquema PostgreSQL
database/seed.sql       carga de las 771 filas
database/verify.sql     validaciones
database/neon_setup.sql esquema + seed + verificación
scripts/init-db.mjs     inicialización desde DATABASE_URL
neon.ts                 configuración declarativa Neon
docs/FUENTES.md         validación de los Excel
docs/NEON_SETUP.md      pasos Neon/Vercel
```

## Fuente Excel futura

Para reemplazar el corte desde la interfaz, carga el libro que contenga las hojas fuente y selecciona **Reemplazar base**. El importador omite automáticamente las hojas `Res*`, porque son tablas dinámicas derivadas y cargarlas produciría doble conteo. El ser humano ya inventó suficientes formas de duplicar datos sin que el dashboard colabore.
