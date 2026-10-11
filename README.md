# PWA Blox — Panel administrativo (PWA instalable)

PWA administrativa para gestionar el catálogo público de `page_blox`. Crea productos, oculta items, gestiona pedidos y cambia estados — los cambios se reflejan en el catálogo público en tiempo real.

## PWA

Instalable en:
- **PC** (Chrome, Edge): botón "Instalar" o el prompt que aparece al cargar
- **Android** (Chrome): banner "Añadir a pantalla de inicio"
- **iOS** (Safari): Compartir → Añadir a pantalla de inicio

Una vez instalada se abre como app nativa, sin barra del navegador, con icono propio.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS 3**
- **@ducanh2912/next-pwa** (Service Worker + Manifest)
- **sharp** (generación de iconos PNG)

## Arquitectura (2 proyectos)

```
BLOX/
├── page_blox/    ← Catálogo público (separado)
│
└── PWA-Blox/     ← ESTE PROYECTO — Admin PWA
    ├── /login         Login admin (default: admin123)
    ├── /dashboard     Métricas, top productos, pedidos recientes
    ├── /pedidos       Gestión de pedidos + cambio de estado inline
    └── /productos     CRUD de productos (crear / ocultar)
```

## Cómo alimenta al catálogo

Esta PWA escribe en `localStorage` con las mismas claves que lee `page_blox`:

| Key                  | Acción                                  |
| -------------------- | --------------------------------------- |
| `blox-admin-products` | Crear producto nuevo                    |
| `blox-admin-hidden`  | Ocultar producto (estático o custom)    |
| `blox-orders`        | Cambiar estado de pedido                |

`src/lib/sync.ts` emite un evento por `BroadcastChannel("blox-data-sync")` cada vez que hay cambios, y la página pública (`page_blox`) escucha esos eventos vía el mismo canal + el evento `storage`.

## Deploy — requisito crítico

Ambas apps deben estar en el **mismo dominio** (o subdominio del mismo dominio) para compartir `localStorage`. Opciones:

- **Opción A (subdominios):** `admin.pageblox.com`
- **Opción B (subpath):** `blox.com/admin`

Si se despliegan en dominios diferentes, los datos no se sincronizarán.

Configura la URL del catálogo público en el sidebar → `NEXT_PUBLIC_CATALOG_URL` en `.env.local`.

## Comandos

```bash
npm install
npm run icons        # Regenera iconos PWA manualmente
npm run dev          # Modo desarrollo (PWA desactivado)
npm run build        # Build de producción (genera iconos + SW)
npm run start        # Servidor producción
```

## Configuración

### Cambiar contraseña admin

Crea `.env.local`:
```
NEXT_PUBLIC_ADMIN_PASSWORD=tu_contraseña_segura
NEXT_PUBLIC_CATALOG_URL=https://pageblox.com
```

### Cambiar branding PWA

Edita `scripts/generate-icons.js` (SVG fuente) y regenera con `npm run icons`.

Edita `public/manifest.json` y `next.config.mjs` para cambiar nombre/colores del manifest.

## Producción (próximos pasos)

1. Backend real (NestJS + MongoDB o similar) — actualmente todo está en `localStorage`
2. HTTPS obligatorio — los service workers requieren HTTPS (localhost funciona)
3. Backend real para auth admin (la contraseña actual está en `NEXT_PUBLIC_ADMIN_PASSWORD`, visible en el bundle)
4. Notificaciones push (opcional) — el plugin soporta FCM

No afiliado oficialmente con Roblox Corporation.
