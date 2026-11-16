# Plan de ejecución — CIAB Community

**Estado:** fases 0 y 1 completadas y verificadas localmente; fase 2 requiere gates separados. La rama `dev` se creará tras registrar los commits del esqueleto.
**Actualizado:** 2026-11-16

## Objetivo

Entregar un MVP de comunidad tipo blog/foro para la Cámara de Inteligencia Artificial Boliviana: lectura pública, participación de miembros aprobados, publicación de noticias y debates con revisión previa, conversación y gamificación basada en aportes validados.

## Decisiones ya acordadas

- Lectura pública de publicaciones aprobadas.
- Toda cuenta inicia pendiente; publicar, comentar y votar requiere membresía aprobada/activa.
- Existe el rol `superadmin`; los roles privilegiados no se autoasignan.
- Noticias y debates pasan por revisión antes de ser públicos.
- Comentarios se publican sin aprobación previa y pueden ocultarse/eliminarse después.
- Puntos solo por contribuciones validadas; sin puntos por vistas, clics ni votos propios.
- Ranking mensual e histórico, insignias y niveles.
- Redes sociales fuera del MVP; Railway queda para el worker de fase 2.

## Arquitectura objetivo

- **Aplicación:** Next.js App Router 16.4.6, React 19.3.1, TypeScript 7.0.2 y Tailwind CSS 4.3.5.
- **Runtime/paquetes:** Node.js 26.13.1 y pnpm 12.21.0, fijados en el repositorio.
- **Vercel:** hosting principal del sitio; no se crea proyecto ni se despliega en fase 1.
- **Supabase:** Auth, PostgreSQL y Storage; se integra en fase 2 tras aprobar RLS y bootstrap del primer superadmin.
- **Railway:** solo worker/cron de redes en fase 2, no despliegue alternativo del MVP.

El MVP tiene un único destino de aplicación: Vercel. Railway no forma parte de la verificación de la fase 1. Las versiones exactas y su estado se registran en `docs/estado-aplicacion.md`.

## Fases, entregables y criterios de salida

### Fase 0 — Cerrar decisiones funcionales y documentar

**Trabajo:** registrar reglas aprobadas de membresía, roles, revisión de publicaciones, comentarios, fuentes, categorías, puntos, niveles e insignias; crear instrucciones de agentes y registro vivo.

**Entregable:** README, plan/RF/modelo v1, `AGENTS.md` y `docs/estado-aplicacion.md`.

**Salida:** instrucciones y decisiones base registradas; las dudas de primer superadmin y edición del autor siguen como gates antes de implementar esas funciones.

### Fase 1 — Preparar el proyecto

**Trabajo:** crear la app Next.js/TypeScript/Tailwind, scripts locales de lint/tipos/build, página informativa mínima, versiones fijadas e instrucciones operativas. Sin Auth, datos, secretos ni integraciones.

**Entregable:** app base local con lockfile reproducible.

**Salida verificada:** instalación frozen, lint, typecheck, build y revisión responsive correctos; sin secretos ni conexiones remotas.

### Fase 2 — Base de datos y seguridad

**Trabajo:** inicializar Supabase local; cerrar bootstrap del primer superadmin; crear migraciones para perfiles, acceso/membresías, categorías, publicaciones, comentarios, votos, reportes, moderación y gamificación; configurar Storage. Añadir políticas RLS y permisos mínimos por rol.

**Entregable:** esquema versionado, datos de prueba y pruebas SQL de autorización.

**Salida:** un visitante puede leer solo lo publicado; miembro pendiente no puede escribir; miembro activo puede enviar contenido a revisión; solo moderadores/admin pueden aprobarlo; ningún usuario puede elevar su rol o asignarse puntos. Las pruebas de permitir/denegar pasan.

### Fase 3 — Identidad y membresía

**Trabajo:** registro/inicio de sesión, perfil público, estado `pending/active/suspended`, pantalla de solicitud/estado y panel administrativo para aprobar o suspender miembros.

**Entregable:** ciclo de acceso funcional con roles member/moderator/admin.

**Salida:** el acceso a acciones protegidas se controla en servidor y BD, no solo ocultando controles en la interfaz.

### Fase 4 — Foro y moderación

**Trabajo:** feed público paginado, filtros por categoría, detalle de noticia/debate, fuente externa para noticias, envío a revisión, cola de moderación, aprobación/rechazo, comentarios/respuestas, votos, reportes y perfil público.

**Entregable:** ciclo principal publicar → revisar → conversar.

**Salida:** ningún borrador o publicación pendiente aparece al público; publicación aprobada sí; comentarios, votos y reportes cumplen el RF y los permisos acordados.

### Fase 5 — Gamificación

**Trabajo:** libro mayor append-only de puntos, reglas versionadas, idempotencia, límites antiabuso, insignias, niveles y tabla de posiciones.

**Entregable:** puntos y reconocimientos auditables asociados a aportes validados.

**Salida:** eventos repetidos no duplican puntos; correcciones generan eventos compensatorios; clasificación y niveles coinciden con las reglas aprobadas.

### Fase 6 — Calidad, seguridad y accesibilidad

**Trabajo:** pruebas de flujos de usuario, RLS, permisos por rol, validación de URLs, límites anti-spam, experiencia móvil, teclado/contraste, errores y registros operativos.

**Entregable:** reporte de pruebas y lista de incidencias resueltas o aceptadas.

**Salida:** pruebas críticas pasan; no quedan hallazgos de autorización que permitan ver contenido pendiente o modificar datos privilegiados.

### Fase 7 — Despliegue y lanzamiento

**Trabajo:** crear entornos de desarrollo/staging/producción; conectar proyecto Supabase institucional; desplegar previews en Vercel; aplicar migraciones aprobadas; configurar dominio, secretos, logs y respaldo operativo.

**Entregable:** MVP en producción y guía de despliegue/recuperación.

**Salida:** smoke tests completados en Vercel; Supabase usa el esquema esperado; secretos no están en cliente ni en Git; existe un procedimiento de rollback.

### Fase 8 — Fase 2: difusión social

**Trabajo:** elegir canales, cuentas, reglas editoriales y permisos API; añadir cola/outbox y worker Railway, idempotencia, reintentos y observabilidad.

**Salida:** una publicación aprobada elegible se difunde una vez por canal, registra el resultado y permite reintentar fallos sin duplicar.

## Fuera del MVP

Publicación automática en redes, mensajes privados, notificaciones en tiempo real, moderación automática por IA y app móvil nativa. No se añadirá un segundo proveedor de base de datos ni una cola independiente hasta que exista una necesidad comprobada.

## Dependencias y puntos de aprobación

1. Fases 0 y 1 autorizadas en esta tarea.
2. Aprobación específica del bootstrap superadmin y DDL/RLS antes de la fase 2.
3. Disponibilidad de accesos institucionales antes de cualquier integración o despliegue remoto.
4. Autorización separada antes de cambios en producción.

No asigno fechas ni esfuerzo calendario todavía: faltan confirmar disponibilidad semanal del equipo, responsables por fase y tiempo de revisión/aprobación.

## Método de ramas y commits

- Una rama por módulo o funcionalidad; se creará `dev` desde el esqueleto verificado y las siguientes funciones partirán de esa rama.
- Commits separados por función/capa: por ejemplo UI, backend, pruebas y documentación no se mezclan si son unidades separables.
- Cada commit explica qué cambió y por qué; documentar verificaciones en el cuerpo del commit.
- Registrar el estado vigente, pruebas y pendientes en `docs/estado-aplicacion.md`.
- Abrir PR de funcionalidades hacia `dev`; publicar hacia `main` mediante PR y revisión requerida. Esta tarea no hace push ni cambia reglas de GitHub.

## Referencias técnicas oficiales

- [Next.js — Deploying](https://nextjs.org/docs/app/getting-started/deploying)
- [Next.js — Self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
- [Railway — Deploy a Next.js app](https://docs.railway.com/guides/nextjs)
- [Vercel — Next.js](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Supabase — Local development workflow and migrations](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
