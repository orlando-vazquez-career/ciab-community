# Requisitos funcionales y no funcionales — CIAB Community

**Versión:** borrador 0.3 · **Estado:** decisiones iniciales acordadas; lo marcado **Propuesta** espera aprobación del equipo.

## Actores

- **Visitante:** consulta contenido publicado sin iniciar sesión.
- **Miembro pendiente:** cuenta creada cuya membresía aún no fue aprobada.
- **Miembro activo:** publica, comenta, vota y reporta.
- **Moderador:** revisa publicaciones y reportes; oculta o restaura contenido.
- **Administrador:** gestiona miembros, roles, categorías, reglas de puntos y configuración.

## Requisitos funcionales del MVP

| ID | Requisito | Criterio de aceptación |
| --- | --- | --- |
| RF-01 | Autenticación y perfil | Una persona se registra o inicia sesión y edita nombre visible, usuario, biografía y avatar. El correo no aparece en el perfil público. `username`: 3–30 caracteres, minúsculas, números y `_`, único. |
| RF-02 | Aprobación de miembros | Toda cuenta nueva inicia en `pending`. Un administrador la aprueba (`active`) o la suspende (`suspended`) indicando motivo. Solo `active` puede publicar, comentar, votar y reportar. Un miembro suspendido conserva su contenido publicado salvo que se modere. |
| RF-03 | Explorar foro | Cualquier visitante ve el feed paginado (20 por página, cursor fecha+ID) de contenido `published`, ordenado por reciente o popular y filtrado por categoría o etiqueta. Nada en `draft`, `pending_review`, `rejected` u `hidden` aparece al público. |
| RF-04 | Publicar | Un miembro activo crea un borrador de **noticia** (título, resumen/contexto, URL de fuente obligatoria) o **debate** (título y planteamiento), elige 1 categoría y hasta 5 etiquetas, y lo envía a revisión. Solo un moderador/admin lo publica o rechaza con motivo; el autor ve el motivo y puede corregir y reenviar. |
| RF-05 | Edición de publicaciones | El autor edita libremente en `draft` y `rejected`. Una publicación `published` editada genera una revisión pendiente; la versión publicada sigue visible hasta que se apruebe la nueva (**Propuesta**, ver P-04). |
| RF-06 | Detalle y comentarios | Cada publicación tiene página propia con comentarios y respuestas de un nivel. Los comentarios se publican al instante y se moderan después (**Propuesta**, ver P-02). El autor puede editar su comentario durante 15 minutos y borrarlo en cualquier momento (queda "comentario eliminado" si tiene respuestas). |
| RF-07 | Voto/apoyo | Un miembro activo apoya una publicación una sola vez y puede retirar su apoyo. No puede apoyar su propia publicación. |
| RF-08 | Reportes y moderación | Un miembro activo reporta una publicación o comentario con motivo (spam, fuente falsa, ofensivo, fuera de tema, otro). Moderadores revisan, ocultan/restauran y cada acción queda registrada con quién, qué, cuándo y por qué. Un miembro no puede reportar dos veces lo mismo. |
| RF-09 | Puntos auditables | Solo los aportes validados de la tabla de puntos (P-01) generan eventos idempotentes en un libro mayor. Vistas, clics y votos propios no puntúan. El cliente nunca asigna puntos. Si un contenido se oculta o rechaza tras puntuar, se registra un evento compensatorio. |
| RF-10 | Niveles e insignias | El perfil muestra nivel actual, puntos totales, progreso al siguiente nivel e insignias obtenidas (P-01). |
| RF-11 | Tabla de posiciones | Ranking mensual (mes calendario, hora de Bolivia) e histórico, con nombre visible, usuario, avatar y puntos; sin otros datos del perfil. |
| RF-12 | Administración | El admin gestiona membresías, roles, categorías, etiquetas y reglas de puntos. Ningún miembro puede cambiar su propio rol, estado, puntos ni insignias. |
| RF-13 | Difusión social (fase 2) | Fuera del MVP. Una publicación aprobada y marcada como elegible crea una tarea por canal; un worker la publica, guarda estado/errores y reintenta sin duplicar. |

## Propuestas para cerrar lo pendiente

Valores iniciales para discutir; se ajustan con datos reales tras el primer mes.

### P-01 · Puntos, niveles e insignias (Propuesta)

| Acción validada | Puntos | Tope | Se revierte si… |
| --- | --- | --- | --- |
| Noticia aprobada | +10 | 3 por día por autor | se oculta o se rechaza después de publicada |
| Debate aprobado | +8 | 2 por día por autor | se oculta o se rechaza después de publicado |
| Apoyo recibido de otro miembro activo con 7+ días de antigüedad | +1 | 20 por publicación; 10 por día por autor | se retira el apoyo o se oculta la publicación |
| Comentario marcado como destacado por un moderador o por el autor de la publicación | +3 | 5 por día por autor | se oculta el comentario |
| Reporte confirmado por moderación | +2 | 3 por día por miembro | — |
| Contenido ocultado por spam | −5 | — | se restaura el contenido |

Inspirado en Taringa, pero sin que los miembros "regalen" puntos sin límite: el apoyo de cuentas nuevas no cuenta y hay topes por día y por publicación.

| Nivel | Puntos mínimos |
| --- | --- |
| Nuevo | 0 |
| Colaborador | 50 |
| Activo | 150 |
| Referente | 400 |
| Mentor | 1.000 |

Insignias iniciales: **Primera noticia** (1 noticia aprobada), **Corresponsal** (10 noticias aprobadas), **Debatiente** (5 debates aprobados), **Buen comentario** (5 comentarios destacados), **Guardián** (5 reportes confirmados).

### P-02 · Moderación de comentarios (Propuesta)

- Los comentarios de miembros activos se publican al instante (post-moderación).
- Si un comentario recibe 3 reportes de miembros distintos, se oculta provisionalmente hasta que un moderador decida.
- Límite: 10 comentarios por hora por miembro.

### P-03 · Categorías iniciales (Propuesta)

Investigación y modelos · Industria y empresas · Herramientas y productos · Política y regulación · IA en Bolivia y Latinoamérica · Educación y eventos · Ética y sociedad.

Tipos de publicación del MVP: noticia y debate. Recursos (tutoriales, datasets) y eventos se evalúan después.

### P-04 · Edición tras publicar (Propuesta)

La edición de una publicación `published` crea una revisión en `pending_review`; al aprobarse reemplaza la versión visible. Se conserva el historial de revisiones.

### P-05 · Membresía (Propuesta)

Sin renovación periódica en el MVP. La suspensión la decide un admin con motivo registrado; la reactivación también.

## Requisitos no funcionales

| ID | Categoría | Requisito | Cómo se verifica |
| --- | --- | --- | --- |
| RNF-01 | Seguridad | RLS activo en todas las tablas del esquema `public`; autorización en servidor y BD, no solo en la UI. | Pruebas SQL de permitir/denegar por rol en CI. |
| RNF-02 | Seguridad | La `service_role` de Supabase y los secretos de redes viven solo en variables de entorno del servidor/worker. | Revisión de PR y búsqueda de claves en el bundle del cliente. |
| RNF-03 | Privacidad | Correo y datos de autenticación separados del perfil público. Aviso de privacidad y política de eliminación de cuenta antes del lanzamiento. | Revisión de vistas públicas y del aviso publicado. |
| RNF-04 | Integridad | Un voto por miembro y publicación; eventos de puntos únicos por `idempotency_key`; correcciones como eventos compensatorios. | Restricciones únicas y pruebas de reintento. |
| RNF-05 | Abuso | Límites: 5 publicaciones por día, 10 comentarios por hora y 10 reportes por día por miembro. URLs de fuente solo `https`. | Pruebas de límite en servidor. |
| RNF-06 | Rendimiento | Feed y detalle: p95 < 1,5 s en staging con 10.000 publicaciones de prueba. Ranking calculado por vista materializada o tabla de resumen, no por conteo completo en cada solicitud. | Prueba de carga simple con datos semilla. |
| RNF-07 | Accesibilidad | Contraste WCAG AA, etiquetas en formularios, navegación por teclado, diseño usable desde 360 px de ancho. | Lighthouse/axe en PR y prueba manual en móvil. |
| RNF-08 | SEO y difusión | Páginas públicas con título, descripción y metadatos Open Graph para compartir enlaces. | Validar con un depurador de Open Graph. |
| RNF-09 | Mantenibilidad | Código modular siguiendo Clean Code (funciones pequeñas, nombres claros, sin duplicación); lint y tipos en CI; toda modificación entra por PR aprobado por otro colaborador (regla del repositorio). | CI en verde y aprobación en GitHub. |
| RNF-10 | Operación | Entornos separados (local, staging, producción); migraciones versionadas; respaldo diario de la BD y una restauración probada antes del lanzamiento. | Registro de la prueba de restauración. |
| RNF-11 | Observabilidad | Errores del servidor registrados con contexto; acciones de moderación y cambios de rol en registro de auditoría. | Revisión de logs en staging. |
| RNF-12 | Idioma y formato | Interfaz en español, fechas en hora de Bolivia (UTC−4). | Revisión de UI. |

## Fuera del MVP

Difusión automática en redes, notificaciones en tiempo real, mensajes privados, moderación automática con IA y app móvil nativa.

## Pendiente de decisión

1. Aprobar o ajustar P-01 a P-05.
2. Stack definitivo (Ismael).
3. Canales sociales y aprobación editorial para fase 2.
