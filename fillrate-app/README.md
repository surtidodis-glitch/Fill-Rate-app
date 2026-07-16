# Fill Rate App — Fase 1 (Fundación)

App empresarial para analizar Fill Rate a partir de la hoja `BASE_MAESTRA` de Excel.
La hoja `SV` se ignora deliberadamente en toda la aplicación.

## Qué incluye esta fase

- Esquema de base de datos (Prisma + Postgres): `prisma/schema.prisma`
- Lector de Excel (`lib/parseExcel.ts`): valida columnas, normaliza encabezados,
  ignora la hoja `SV`, y convierte cada fila de `BASE_MAESTRA` a un registro tipado.
- Script de ingesta por línea de comandos: `scripts/ingest.ts`
- API REST para el frontend:
  - `GET /api/fillrate` — filas paginadas y filtradas
  - `GET /api/fillrate/summary` — KPIs agregados en la base de datos (no en el navegador)
  - `POST /api/upload` — sube un nuevo Excel desde la propia app

## Por qué esta arquitectura

Con miles de registros, no se puede seguir leyendo el Excel en cada carga de página.
Por eso el Excel se procesa **una sola vez** en la ingesta, se guarda en Postgres,
y el frontend solo pide datos ya filtrados y paginados — nunca "todo el archivo".

Cada carga queda registrada en la tabla `DataLoad`, con conteo de filas y errores,
para poder auditar qué se cargó y cuándo.

## Configuración local

1. Instala dependencias:
   ```
   npm install
   ```

2. Crea una base de datos Postgres gratuita en [neon.tech](https://neon.tech) o
   [supabase.com](https://supabase.com). Copia la cadena de conexión.

3. Copia `.env.example` a `.env` y pega tu cadena de conexión:
   ```
   cp .env.example .env
   ```

4. Crea las tablas en la base de datos:
   ```
   npx prisma migrate dev --name init
   ```

5. Carga tu primer Excel:
   ```
   npm run ingest -- ./ruta/a/tu/archivo.xlsx
   ```

6. Levanta el servidor de desarrollo:
   ```
   npm run dev
   ```

## Siguiente paso (Fase 2)

Conectar el prototipo visual (`fillrate-dashboard-dark.jsx`) a estos endpoints
en vez de datos simulados, y desplegar en Vercel.
