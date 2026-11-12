# Plan de producto y arquitectura — CIAB Community

**Estado:** borrador 0.3. Incluye propuestas concretas para lo que estaba pendiente; cada una se marca como **Propuesta** hasta que el equipo la apruebe.

## Evidencia y supuestos

- **Base del `README.md`:** comunidad estilo Taringa para compartir noticias de IA, conversar y reconocer aportes; difusión en redes de CIAB; Ismael Rivera dirige el proyecto y elige el stack; Vladimir y Diego apoyan el desarrollo.
- **Cambios respecto al README (ya acordados y reflejados en el README):**
  - El README decía que cada noticia aparecía automáticamente en el foro y se difundía en redes. Lo acordado es que noticias y debates **pasan por revisión antes de ser públicos** y que la **difusión social queda para fase 2**.
  - La gamificación premia aportes **validados**, no vistas, clics ni votos propios.
- **Confirmado:** la infraestructura objetivo es Vercel, Railway y Supabase. Cuenta/proyecto institucional de Supabase y accesos aún por confirmar.
- **Pendiente de Ismael:** aprobar el stack. Next.js + TypeScript es una **propuesta**; el modelo de datos y las políticas RLS no dependen de esa elección.

## Decisiones acordadas

- Lectura pública; publicar, comentar y votar requiere membresía `active`.
- Alta de miembros aprobada manualmente por un administrador.
- Noticias y debates requieren aprobación de moderador/admin antes de ser públicos.
- Difusión social automática: fase 2.
- Gamificación basada en aportes validados.

## Stack propuesto (sujeto a aprobación de Ismael)

| Capa | Propuesta | Responsabilidad |
| --- | --- | --- |
| Web | Next.js App Router + TypeScript | Foro, perfiles, páginas públicas, panel de moderación y lógica web. |
| Hosting web | Vercel | Despliegues desde Git y previews por PR. |
| Datos y autenticación | Supabase Auth + PostgreSQL | Identidad, perfiles, publicaciones, comentarios, gamificación y permisos con RLS. |
| Archivos | Supabase Storage | Avatares e imágenes de publicaciones, con límites de tamaño y políticas de acceso. |
| Tareas asíncronas | Railway worker/cron (fase 2) | Procesar la cola/outbox de difusión social con reintentos. Supabase sigue siendo la fuente de verdad. |
| Cambios de BD | Migraciones SQL en `supabase/migrations/` | Esquema y políticas reproducibles y revisables por PR. |

Referencias oficiales: [Next.js](https://nextjs.org/docs/app/getting-started/deploying), [Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Railway](https://docs.railway.com/guides/cron-workers-queues), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) y [Supabase Storage](https://supabase.com/docs/guides/storage).

## Plan por etapas

1. **Acordar producto:** aprobar las propuestas de puntos, comentarios, categorías y edición (`02-requisitos-funcionales.md`, sección "Propuestas para cerrar").
2. **Cerrar RF y recorridos:** visitante, miembro pendiente/activo, moderador y administrador.
3. **Cerrar modelo de datos y permisos:** revisar el borrador de migración `supabase/migrations/20261110000000_esquema_inicial.sql`.
4. **MVP del foro:** feed, noticias y debates con revisión, categorías, detalle, comentarios, votos, reportes, perfiles y panel de moderación.
5. **Gamificación:** libro mayor de puntos, topes antiabuso, niveles, insignias y ranking.
6. **Preproducción y lanzamiento:** previews en Vercel, staging en Supabase, pruebas de autorización, respaldo y despliegue.
7. **Fase 2 — Difusión social:** canales, aprobación editorial, outbox + worker en Railway.

El detalle de fases, responsables y sprints está en `04-plan-ejecucion.md`.

## Alcance inicial

Ciclo principal: **publicar → revisar → conversar → reconocer aportes validados**. Sin microservicios ni segunda base de datos. Difusión en redes, notificaciones en tiempo real, mensajes privados y moderación automática por IA quedan fuera del MVP.
