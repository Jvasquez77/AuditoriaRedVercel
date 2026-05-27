# Guía de Despliegue en Producción

Este documento cubre el despliegue completo del sistema en tres plataformas gratuitas:

| Servicio | Plataforma | URL resultante |
|---|---|---|
| Frontend SvelteKit | Vercel | `https://tu-app.vercel.app` |
| Backend FastAPI | Railway | `https://tu-backend.up.railway.app` |
| Base de datos PostgreSQL | Neon | (connection string interna) |

---

## 1. Base de datos — Neon (PostgreSQL serverless)

**Neon** ofrece capa gratuita con 512 MB de almacenamiento, suficiente para desarrollo y demos.

### Pasos

1. Crear cuenta en https://neon.tech (GitHub login recomendado)
2. Click **New Project** → nombre: `network-audit`
3. Seleccionar región más cercana (ej: `us-east-1`)
4. Copiar la **Connection string** que aparece en el dashboard

La connection string tiene este formato:
```
postgres://USER:PASSWORD@ep-xxx-xxx.us-east-1.aws.neon.tech/network_audit_db?sslmode=require
```

**Transformarla para asyncpg** (reemplazar `postgres://` por `postgresql+asyncpg://`):
```
postgresql+asyncpg://USER:PASSWORD@ep-xxx-xxx.us-east-1.aws.neon.tech/network_audit_db?sslmode=require
```

### Crear el esquema

En el panel SQL de Neon, ejecutar los dos archivos de migración en orden:

```sql
-- 1. Pegar y ejecutar el contenido completo de:
backend/migrations/001_initial_schema.sql

-- 2. Pegar y ejecutar el contenido completo de:
backend/migrations/002_add_olt_entity.sql
```

---

## 2. Backend — Railway (FastAPI)

**Railway** detecta automáticamente Python/FastAPI y crea un contenedor con el `Dockerfile` del backend.

### Pasos

1. Crear cuenta en https://railway.app (GitHub login)
2. Click **New Project** → **Deploy from GitHub repo**
3. Seleccionar el repositorio `Jvasquez77/auditoriadered`
4. En "Root Directory" configurar: `backend`
5. Railway detectará el `Dockerfile` automáticamente

### Variables de entorno en Railway

En el panel de Railway → pestaña **Variables**, agregar:

```
DATABASE_URL        = postgresql+asyncpg://USER:PASS@HOST/network_audit_db?sslmode=require
DEBUG               = false
CORS_ORIGINS        = ["https://TU-APP.vercel.app"]
MEDIA_DIR           = media
BASE_MEDIA_URL      = https://TU-BACKEND.up.railway.app/media
OTDR_MAX_FUSION_LOSS_DB      = 0.1
SFP_MIN_TX_POWER_DBM         = 6.0
CLIENT_AVG_MIN_POWER_DBM     = -26.5
CLIENT_CRITICAL_POWER_DBM    = -25.4
CLIENT_CRITICAL_SEVERE_POWER_DBM = -27.01
RESERVE_BOX_METERS           = 15.0
RESERVE_POLE_METERS          = 40.0
RESERVE_POLE_INTERVAL_METERS = 400.0
```

Reemplaza:
- `DATABASE_URL` → la connection string de Neon (transformada a asyncpg)
- `CORS_ORIGINS` → la URL real que te dé Vercel en el paso 3
- `BASE_MEDIA_URL` → la URL que te dé Railway para este proyecto

### Verificar que funciona

Una vez desplegado, Railway te da una URL pública como:
```
https://network-audit-api-production.up.railway.app
```

Verificar en el navegador:
```
https://TU-BACKEND.up.railway.app/health
```

Debe responder:
```json
{"status": "ok", "module": "network-audit-odn", "version": "1.0.0"}
```

La documentación interactiva de la API estará en:
```
https://TU-BACKEND.up.railway.app/docs
```

---

## 3. Frontend — Vercel (SvelteKit)

### Pasos

1. Crear cuenta en https://vercel.com (GitHub login)
2. Click **New Project** → importar `Jvasquez77/auditoriadered`
3. En la pantalla de configuración del proyecto:
   - **Framework Preset**: SvelteKit (autodetectado)
   - **Root Directory**: `frontend` ← **MUY IMPORTANTE**
   - **Build Command**: `npm run build` (default)
   - **Install Command**: `npm install` (default)
   - **Output Directory**: dejar en blanco (adapter-vercel lo gestiona)

4. En **Environment Variables** agregar:

```
BACKEND_URL = https://TU-BACKEND.up.railway.app
```

> Este valor es la URL del backend en Railway (sin barra al final).

5. Click **Deploy**

### Verificar que funciona

Una vez desplegado, la URL de Vercel será algo como:
```
https://auditoriadered.vercel.app
```

Acceder al módulo principal:
```
https://auditoriadered.vercel.app/network-audit
```

---

## 4. Cómo funciona el proxy de API

En desarrollo local, Vite maneja el proxy `/api` → `http://localhost:8000`.

En producción (Vercel), no hay Vite. El archivo `frontend/src/hooks.server.ts` intercepta todas las peticiones a `/api/*` y las reenvía al backend en Railway usando la variable `BACKEND_URL`.

El código de los componentes no cambia — todos los `fetch('/api/v1/...')` funcionan igual en local y en producción.

```
Navegador → vercel.app/api/v1/olts/
                ↓ hooks.server.ts
         → TU-BACKEND.railway.app/api/v1/olts/
```

---

## 5. Actualizaciones y redespliegues

Vercel y Railway se conectan al repositorio GitHub y se actualizan automáticamente en cada `git push` a `main`.

```bash
# Flujo típico de actualización
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main
# → Vercel redespliega frontend automáticamente
# → Railway redespliega backend automáticamente
```

Para cambios en el esquema de la base de datos, aplicar manualmente la nueva migración SQL en el panel de Neon.

---

## 6. Troubleshooting frecuente

### El frontend carga pero la API devuelve error de red
- Verificar que `BACKEND_URL` en Vercel esté configurada sin barra final
- Verificar que el backend en Railway esté corriendo (`/health` responde OK)
- Verificar que `CORS_ORIGINS` en Railway incluya la URL exacta de Vercel

### Error 500 al hacer queries en Railway
- Verificar que `DATABASE_URL` esté correctamente configurada con `?sslmode=require`
- Verificar que las migraciones SQL se ejecutaron en Neon

### "Module not found" en Railway
- Revisar que **Root Directory** = `backend` esté configurado en Railway
- El `Dockerfile` del backend debe estar en `backend/Dockerfile`

### Vercel build falla: "Cannot find module @sveltejs/adapter-vercel"
- Asegurarse de que el **Root Directory** en Vercel sea `frontend`
- El `package.json` de `frontend/` tiene `@sveltejs/adapter-vercel` como dependencia
