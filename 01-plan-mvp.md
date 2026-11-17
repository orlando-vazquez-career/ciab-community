# Plan de producto y arquitectura — CIAB Community

**Versión:** 1.1 · **Estado:** alcance local de MVP aprobado; fases 0 y 1 completadas y fases 2–7 autorizadas bajo sus límites documentados.
**Actualizado:** 2026-11-17

## Decisiones confirmadas

- La lectura de publicaciones aprobadas es pública.
- Una cuenta nueva queda pendiente; publicar, comentar y votar requiere aprobación y membresía activa.
- Existe el rol `superadmin`; asignaciones de roles privilegiados requieren aprobación y nadie puede elevar sus propios permisos.
- Noticias y debates pasan por revisión antes de hacerse públicos.
- Los comentarios se muestran al enviarse, sin aprobación previa; podrán ocultarse o eliminarse mediante moderación posterior.
- El autor no edita ni elimina comentarios en el MVP; la moderación administra su ocultamiento/eliminación.
- Noticias requieren fuente; los debates pueden enviarse sin fuente. La regla editorial para afirmaciones factuales en debates sigue pendiente.
- Cada miembro puede emitir un voto positivo por publicación; en el MVP no se retira ni cambia.
- Los puntos reconocen aportes validados, no vistas, clics ni votos propios.
- El ranking será mensual e histórico; habrá niveles e insignias.
- Vercel será el hosting web del MVP. Railway queda reservado para el worker social de fase 2.
- La difusión automática en redes queda fuera del MVP.

## Stack aprobado

| Capa | Decisión tecnológica | Responsabilidad |
| --- | --- | --- |
| Web | Next.js App Router 16.4.6, React 19.3.1, TypeScript 6.0.3, Tailwind CSS 4.3.5 | Foro, perfiles, páginas públicas y paneles futuros. |
| Runtime y paquetes | Node.js 26.13.1, pnpm 12.21.0 | Versiones fijadas en el repositorio y lockfile. |
| Hosting web | Vercel | Destino principal del MVP y previews; no se despliega en esta fase. |
| Datos y autenticación (fase 2) | Supabase Auth + PostgreSQL | Fuente de verdad, con autorización RLS; no se integra durante la fase 1. |
| Archivos (fase 2) | Supabase Storage | Avatares e imágenes con políticas de acceso. |
| Tareas sociales (fase 2) | Railway worker/cron | Outbox, reintentos e idempotencia; no es destino alternativo de la app en el MVP. |
| Cambios de BD (fase 2) | Supabase CLI + SQL versionado | Esquema reproducible y pruebas de autorización. |

El MVP tendrá una aplicación web en Vercel y una única fuente de datos futura en Supabase. No se crea un segundo backend/base de datos ni se configura Railway hasta la fase social. La versión exacta de paquetes queda registrada en `docs/estado-aplicacion.md`.

## Plan por etapas

0. **Cerrar producto y documentación:** decisiones base, RF, modelo lógico y metodología de colaboración. Autorizada.
1. **Esqueleto web:** app Next.js, runtime/dependencias fijadas, lint/tipos/build y página inicial sin integraciones. Autorizada.
2. **Base de datos y seguridad:** Supabase local, migraciones, RLS y pruebas. Requiere aprobar bootstrap seguro del primer superadmin.
3. **Identidad y membresía:** registro pendiente, aprobación, perfil y roles.
4. **Foro y moderación:** feed, noticias/debates revisados, comentarios inmediatos, reportes, ocultar/eliminar, votos y perfiles.
5. **Gamificación:** libro mayor, reglas versionadas, topes, compensaciones, insignias, niveles y ranking.
6. **Calidad y seguridad:** pruebas integrales, accesibilidad, abuso, staging y recuperación.
7. **Lanzamiento:** previews y despliegue autorizado en Vercel; cada operación de producción requiere autorización específica.
8. **Fase 2 social:** canales definidos y worker Railway con reintentos e idempotencia.

## Alcance inicial sugerido

Incluir el ciclo principal de comunidad —publicar, revisar antes de publicar, conversar y reconocer contribuciones validadas—, pero dejar la publicación automática en redes para fase 2 hasta que CIAB defina canales, reglas y accesos API. El MVP no necesita microservicios ni una segunda base de datos.

## Gates pendientes antes del lanzamiento

- Tratamiento de solicitudes de privacidad/eliminación y retención de cuentas.
- Regla editorial para exigir fuentes en debates con afirmaciones factuales.
- El bootstrap del primer `superadmin` se implementará como operación local de un solo uso para una cuenta ya registrada; no se ejecutará ni creará un superadmin sin autorización específica posterior.
- Para fase 2: redes, cuentas, aprobación editorial y accesos API.
