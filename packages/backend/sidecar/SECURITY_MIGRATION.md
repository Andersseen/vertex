# Security Migration Guide

## Resumen de Cambios

Se ha implementado una capa completa de seguridad en el sidecar de Vertex IDE:

### ✅ Cambios Implementados

1. **WorkspaceGuard** (`src/security/workspace-guard.ts`)
   - Protección contra path traversal
   - Validación de extensiones de archivo
   - Límites de tamaño de contenido
   - Validación de nombres de archivo

2. **Rate Limiter** (`src/security/rate-limiter.ts`)
   - 100 requests/minuto por IP (configurable)
   - Headers de rate limit en respuestas
   - Limpieza automática de entradas expiradas

3. **CORS Restringido** (en `index.ts`)
   - Solo orígenes específicos permitidos
   - Configurable vía variable de entorno
   - Credentials habilitados solo para orígenes permitidos

4. **Validación de Inputs** (`src/security/validation.ts`)
   - Validación de paths (no null, no vacíos, sin null bytes)
   - Validación de contenido (tamaño, tipo)
   - Validación de nombres de archivo

5. **Headers de Seguridad**
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - X-XSS-Protection
   - Referrer-Policy

6. **Tests de Seguridad** (`src/security/security.test.ts`)
   - 32 tests cubriendo todos los casos
   - 100% de casos de path traversal
   - Tests de rate limiting
   - Tests de validación

## Configuración

### 1. Variables de Entorno

Copia el archivo de ejemplo:

```bash
cd packages/backend/sidecar
cp .env.example .env
```

Edita `.env` según tu entorno:

```bash
# Puerto del servidor
SIDECAR_PORT=3001

# ⚠️ IMPORTANTE: Directorio raíz permitido
# Todos los paths fuera de este directorio serán rechazados
WORKSPACE_PATH=/home/usuario/proyectos

# Tamaño máximo de archivo (10MB por defecto)
MAX_FILE_SIZE=10485760

# Rate limiting
RATE_LIMIT_REQ=100
RATE_LIMIT_WINDOW=60

# Orígenes CORS permitidos (separados por coma)
CORS_ORIGIN=http://localhost:4200,http://localhost:1420
```

### 2. Ejecución Segura

#### Desarrollo:

```bash
bun sidecar:dev
```

#### Producción:

```bash
# 1. Establecer variables de entorno
export WORKSPACE_PATH=/ruta/absoluta/al/workspace
export CORS_ORIGIN=https://tudominio.com
export RATE_LIMIT_REQ=50

# 2. Iniciar sidecar
bun sidecar:start
```

### 3. Testing

Ejecutar tests de seguridad:

```bash
cd packages/backend/sidecar
bun test:security
```

## Comportamiento de Seguridad

### Path Traversal

❌ **Bloqueado:**

```bash
GET /fs/read?path=../../../etc/passwd
# Respuesta: 403 Forbidden
# { "error": "Access denied: path outside workspace" }
```

✅ **Permitido:**

```bash
GET /fs/read?path=src/app/app.ts
# Lee: /workspace/src/app/app.ts
```

### Rate Limiting

Cuando se excede el límite:

```bash
HTTP 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-01-01T12:00:00.000Z

{
  "error": "Rate limit exceeded",
  "retryAfter": 45
}
```

### Tamaño de Archivo

❌ **Bloqueado:**

```bash
POST /fs/write
Body: { "path": "large.txt", "content": "..." }  # > 10MB
# Respuesta: 413 Payload Too Large
```

### Extensiones Bloqueadas

Archivos que no se pueden leer:

- `.exe`, `.dll`, `.so`, `.dylib`, `.bin` (ejecutables)
- `.key`, `.pem`, `.p12`, `.pfx`, `.crt` (certificados)
- `.env`, `.env.local`, `.env.production` (variables de entorno)

## API Endpoints Seguros

### GET /fs/children?path={path}

Lista contenido de directorio

- Valida que el path esté dentro del workspace
- Filtra archivos y carpetas ocultos (empiezan con `.`)
- Ignora: node_modules, .git, dist, target, etc.

### GET /fs/read?path={path}

Lee contenido de archivo

- Bloquea extensiones peligrosas
- Verifica tamaño antes de leer
- Retorna 404 si no existe

### POST /fs/write

Escribe archivo

- Valida path y contenido
- Crea directorios padre si no existen
- Verifica límite de tamaño

### GET /fs/workspace

Información del workspace

- Retorna path permitido
- Muestra configuración de seguridad

## Migración desde versión anterior

Si tenías el sidecar corriendo sin estas protecciones:

1. **Backup**: Guarda tu configuración actual
2. **Configurar WORKSPACE_PATH**: Establece el directorio raíz permitido
3. **Actualizar CORS**: Configura los orígenes permitidos
4. **Probar**: Ejecuta tests y verifica funcionamiento
5. **Monitorear**: Revisa logs para detectar intentos de acceso no autorizado

## Troubleshooting

### "Access denied: path outside workspace"

- Verifica que `WORKSPACE_PATH` esté configurado correctamente
- El path debe ser absoluto
- Los paths relativos se resuelven desde WORKSPACE_PATH

### "Rate limit exceeded"

- Espera a que se reinicie la ventana de rate limit
- O ajusta `RATE_LIMIT_REQ` y `RATE_LIMIT_WINDOW`

### CORS errors en frontend

- Verifica que `CORS_ORIGIN` incluya el origen de tu frontend
- Para desarrollo: `http://localhost:4200`
- Para desktop: `http://localhost:1420`

### Tests fallan

- Asegúrate de estar en el directorio correcto
- Ejecuta: `cd packages/backend/sidecar && bun test:security`

## Mejores Prácticas

1. **Nunca uses `/` como WORKSPACE_PATH** en producción
2. **Restringe CORS** solo a tus dominios en producción
3. **Monitorea logs** para detectar intentos de ataque
4. **Ejecuta con usuario no-root**
5. **Usa firewall** para restringir acceso al puerto 3001

## Próximos Pasos (Fase 2)

- [ ] Migrar ConfigService a Angular Signals
- [ ] Agregar sistema de persistencia local
- [ ] Implementar auto-save
- [ ] Agregar notificaciones toast
- [ ] Mejorar manejo de errores en UI

---

Para más detalles, ver `SECURITY.md` en la raíz del proyecto.
