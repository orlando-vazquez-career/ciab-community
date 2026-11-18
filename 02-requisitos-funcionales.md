# Requisitos funcionales — CIAB Community

**Versión:** 1.1 · **Estado:** decisiones funcionales base aprobadas para desarrollo local; privacidad y política factual de debates son gates de lanzamiento.
**Actualizado:** 2026-11-17

## Actores

- **Visitante:** consulta contenido publicado públicamente.
- **Miembro pendiente:** cuenta creada cuya membresía aún no fue aprobada.
- **Miembro activo:** participa en publicaciones, comentarios y votos.
- **Moderador:** revisa reportes y oculta/restaura contenido.
- **Administrador:** gestiona miembros y categorías dentro de los permisos autorizados; no otorga roles privilegiados.
- **Superadmin:** autoridad máxima para aprobar y gestionar roles privilegiados; nadie puede elevar sus propios permisos.

## RF del MVP

| ID | Requisito | Criterio de aceptación inicial |
| --- | --- | --- |
| RF-01 | Autenticación y perfil | Una persona puede registrarse/iniciar sesión y editar nombre visible, usuario, biografía y avatar; el correo de autenticación no se expone en el perfil público. |
| RF-02 | Aprobación de miembros | Toda cuenta inicia en `pending`; la aprobación manual habilita la membresía activa y una suspensión revoca participación. Los roles privilegiados requieren autorización; el titular nunca puede cambiar su rol/estado. |
| RF-03 | Explorar foro | Cualquier visitante ve el feed paginado de contenido publicado; se puede ordenar por reciente/popular y filtrar por categoría. El contenido pendiente no aparece en el feed público. |
| RF-04 | Publicar | Un miembro activo envía noticia (título, contexto y fuente) o debate a revisión. Solo aparece después de aprobación. Una edición sustancial de una publicación aprobada vuelve a revisión. |
| RF-05 | Detalle y comentarios | Miembros activos publican comentarios sin aprobación previa; son visibles al enviarse. Se permiten respuestas de un nivel. En el MVP el autor no puede editar ni eliminar comentarios; moderadores pueden ocultar, eliminar lógicamente o restaurar con auditoría. |
| RF-06 | Voto/reacción | Un miembro activo puede emitir un voto positivo por publicación; en el MVP no puede retirarlo ni cambiarlo y no puede votarse a sí mismo. Los votos no otorgan puntos. |
| RF-07 | Moderación | Miembros reportan publicaciones/comentarios con motivo; moderadores pueden ocultar, eliminar lógicamente o restaurar, registrando actor, acción, objetivo y fecha. |
| RF-08 | Puntos auditables | Aportes validados generan eventos idempotentes append-only. No puntúan vistas, clics ni votos propios. Se aplican valores, límites y reversos del apartado de gamificación. |
| RF-09 | Insignias y niveles | Se asignan las insignias iniciales aprobadas y se muestra el nivel calculado por el umbral de puntos. |
| RF-10 | Tabla de posiciones | Se muestran ranking mensual e histórico por puntos validados; no se expone información privada. |
| RF-11 | Difusión social (fase 2) | Fuera del MVP. En una fase posterior, una publicación elegible aprobada podrá crear una tarea; un worker la enviará a los canales elegidos, conservará estado/errores y reintentará sin duplicar. Requiere definir canales y aprobación editorial. |
| RF-12 | Administración | Admin gestiona categorías/membresías dentro de sus permisos. Solo superadmin puede otorgar o revocar roles privilegiados. |

## Política editorial de fuentes

| Clase de fuente | Regla de revisión |
| --- | --- |
| Académica/técnica primaria | Aceptar artículo revisado, documento técnico, datos o documentación original. Etiquetar prepublicaciones como no revisadas por pares. |
| Institucional | Aceptar fuente original identificable de universidad, organismo público o laboratorio; atribuir sus afirmaciones a la entidad. |
| Periodismo especializado | Exigir autoría, edición/correcciones y referencias rastreables; enlazar fuente primaria cuando exista. |
| Medio general | Exigir autoría y procedencia; corroborar afirmaciones de alto impacto. |
| Social/anónima/copias/comunicados promocionales | No son evidencia única de una afirmación técnica. Un comunicado puede acreditar lo que una organización anunció, no su validez independiente. |

La noticia debe incluir una URL directa y la revisión comprueba que la fuente respalde el título/contexto. Las noticias se clasifican como `primary`, `institutional`, `specialized_media` o `general_media`. Categorías temáticas iniciales: investigación y ciencia; modelos y herramientas; industria y emprendimiento; educación y comunidad; ética, política y regulación; aplicaciones e infraestructura. En el MVP las fuentes de debates son opcionales; la política para afirmaciones factuales queda pendiente antes del lanzamiento y no se aplicará una validación automática.

## Reglas iniciales de gamificación

| Acción validada | Puntos | Regla |
| --- | ---: | --- |
| Noticia aprobada | 5 | Una vez por publicación, al aprobarse. |
| Debate aprobado | 4 | Una vez por publicación, al aprobarse. |
| Comentario útil | 1 | Moderación lo marca útil; hasta 5 comentarios puntuables por día. |
| Aporte general reconocido | 3 | Moderador/admin valida y deja motivo; una vez por aporte. |
| Vistas, clics y votos propios | 0 | No generan puntos. |

Tope global inicial: 10 puntos por miembro/día. Invalidez/eliminación por incumplimiento genera compensación, no borrado del historial. Ranking mensual e histórico. Niveles: Nuevo miembro (0–19), Colaborador (20–74), Constante (75–199), Referente (200+). Insignias: Primer aporte validado, 5 noticias aprobadas y 10 comentarios útiles.

## Requisitos no funcionales mínimos

- **Seguridad:** autorización en servidor y políticas RLS en todas las tablas expuestas; no confiar en ocultar botones en la UI.
- **Privacidad:** separar datos de perfil público del correo/datos de autenticación; definir eliminación/retención y aviso de privacidad antes del lanzamiento.
- **Integridad:** límites únicos para votos y eventos de puntos; operaciones de puntos idempotentes y auditables.
- **Abuso:** rate limit en creación/comentarios/reportes, validación de URL y control anti-spam a definir.
- **Accesibilidad y responsive:** navegación usable en móvil y teclado; contraste y etiquetas semánticas.
- **Operación:** migraciones versionadas, entornos separados y verificación de permisos antes de producción.

## Fuera del MVP por ahora

Integración automática con redes sociales, notificaciones en tiempo real, mensajes privados, IA generativa/moderación automática y aplicación móvil nativa. Se reconsideran tras validar uso, política editorial y costo operativo.

## Gates pendientes antes de las funciones correspondientes

1. Privacidad, retención y tratamiento de solicitudes de eliminación de cuentas antes del lanzamiento.
2. Regla editorial para exigir fuente a debates con afirmaciones factuales antes del lanzamiento.
3. El bootstrap del primer superadmin será una operación local de un solo uso para una cuenta ya registrada. La implementación está autorizada; su ejecución requiere autorización específica posterior. No crear un usuario privilegiado por defecto.
4. Canales sociales, cuentas y aprobación editorial para fase 2.
