# CIAB Community

Comunidad open source de la **Cámara de Inteligencia Artificial Boliviana (CIAB)**, inspirada en la dinámica de Taringa: compartir noticias relevantes de inteligencia artificial, conversar sobre ellas y reconocer los aportes de la comunidad.

## La idea

Crear un espacio donde las personas puedan publicar noticias de IA, descubrir novedades y participar en conversaciones con otros miembros. Las noticias y debates se publican en el foro después de la revisión; los comentarios aparecen al enviarse y pueden ser moderados después. La difusión automática en redes queda para una fase posterior.

El objetivo es conectar la información con la conversación y convertir la participación de la comunidad en el motor del sitio.

## Experiencia prevista

1. Una persona comparte una noticia relevante de IA con su fuente y contexto.
2. Un moderador revisa la publicación y, si la aprueba, aparece en el foro.
3. Los miembros activos comentan y conversan; moderadores pueden ocultar o eliminar comentarios según las reglas del foro.
4. Los aportes validados generan puntos, niveles e insignias. La difusión social se considerará en fase 2.

Los canales sociales y sus reglas editoriales quedan pendientes para la fase 2.

## Participación y gamificación

La comunidad tendrá puntos, niveles e insignias para reconocer noticias aprobadas, comentarios útiles y otros aportes validados. Vistas, clics y votos propios no generan puntos.

Las reglas iniciales y límites antiabuso están documentados en [requisitos funcionales](02-requisitos-funcionales.md); podrán ajustarse mediante una decisión versionada.

## Equipo

- **Ismael Rivera:** dirección del proyecto y elección del stack de programación.
- **Vladimir y Diego:** apoyo en el desarrollo y la construcción de la comunidad, en coordinación con Ismael.

## Tecnología e infraestructura

**Stack aprobado para el MVP:** Next.js App Router, React, TypeScript y Tailwind CSS; Vercel para la aplicación y Supabase para Auth, PostgreSQL y Storage. Versiones fijadas en `package.json` y el lockfile.

La infraestructura prevista es:

| Servicio | Uso previsto |
| --- | --- |
| Vercel | Destino principal de la aplicación web del MVP y previews de cambios. |
| Supabase | Auth, PostgreSQL y Storage; proyecto y accesos institucionales por confirmar antes de integrar. |
| Railway | Reservado para el worker de difusión social de fase 2; no es requisito de despliegue del MVP. |

Las versiones exactas y comandos de desarrollo están en [el registro de estado](docs/estado-aplicacion.md). No hay claves ni conexiones a servicios remotos en el esqueleto.

## Estado y próximos pasos

Este repositorio contiene la definición del producto y un esqueleto web informativo. La autenticación, la base de datos, la moderación y la gamificación aún no están implementadas. Consulta [el plan de producto](01-plan-mvp.md), los [requisitos funcionales](02-requisitos-funcionales.md), el [modelo lógico](03-modelo-de-datos.md), el [plan de ejecución](04-plan-ejecucion.md) y el [registro de estado](docs/estado-aplicacion.md).

- Iniciar la primera funcionalidad aprobada desde `dev`, en una rama propia y con commits separados por capa.
- Aprobar el modelo de acceso y el alta segura del primer superadmin antes de la fase 2.
- Implementar Supabase local y las pruebas de autorización antes de construir funcionalidades.
- Posponer canales y worker de redes sociales hasta la fase 2.

## Cómo contribuir

Las contribuciones son bienvenidas. Puedes proponer ideas mediante issues y coordinar las decisiones técnicas con Ismael. Para cambiar archivos, trabaja en una rama y abre un pull request (PR).

### 1. Clona el repositorio y crea tu rama

Si tienes permiso de escritura en este repositorio y `dev` ya está publicada en `origin`:

```bash
git clone https://github.com/orlando-vazquez-career/ciab-community.git
cd ciab-community
git switch dev
git pull --ff-only origin dev
git switch -c feat/login-ui
```

Si ya tienes una copia local, entra en su carpeta y omite el comando de clonación. Una vez sincronizada la rama de integración `dev`, crea una rama por módulo o funcionalidad, por ejemplo `feat/login-ui`, `feat/login-api`, `fix/feed-paginacion` o `docs/requisitos`. No desarrolles directamente sobre `main` ni compartas una rama entre funcionalidades distintas.

### 2. Guarda y publica tus cambios

Separa los commits por unidad funcional y capa. Por ejemplo, la interfaz de login, su lógica/API, las pruebas y la documentación llevan commits distintos. Describe qué cambió, por qué y cómo se comprobó:

```bash
git diff
git add src/app/login
git diff --cached
git commit -m "feat(login-ui): agrega interfaz de inicio de sesión"
git push -u origin feat/login-ui
```

Usa el nombre de rama que creaste. Actualiza `docs/estado-aplicacion.md` con el cambio y ejecuta las verificaciones definidas en `AGENTS.md` antes de abrir el PR.

### 3. Abre un pull request hacia dev

En GitHub, abre un PR desde tu rama de funcionalidad hacia `dev`. Para publicar una versión, se abrirá un PR separado de `dev` hacia `main`.

Escribe un título claro y explica qué cambiaste, por qué y cómo lo comprobaste. Abre el PR cuando esté listo para revisión y solicita la revisión de otro colaborador con permiso de escritura.

### 4. Obtén la aprobación de otro colaborador

La rama `main` está protegida. **La publicación a `main` requiere un PR aprobado por al menos otro colaborador con permiso de escritura**, distinto del autor y de quien realizó el último push. La rama `dev` ya está publicada en `origin/dev`; para empezar desde otra máquina, actualiza tu copia con `git pull --ff-only origin dev`.

- Si añades cambios al PR, las aprobaciones anteriores se invalidan y hay que revisar y aprobar la nueva versión.
- Responde a la revisión y resuelve las conversaciones pendientes antes de fusionar.
- Cuando se cumplan los requisitos, un miembro con permiso de escritura podrá fusionar el PR a `main`.
- La regla se aplica también a administradores y bots, sin excepciones. GitHub Actions no puede aprobar PR.
- Están bloqueados el force push y el borrado de `main`.

### Si no tienes permiso de escritura

Crea un **fork** en tu cuenta y clona tu fork en lugar del repositorio original. Antes de crear la rama de trabajo, conecta y actualiza la referencia `dev` del repositorio original cuando ya esté publicada:

```bash
git remote add upstream https://github.com/orlando-vazquez-career/ciab-community.git
git fetch upstream
git switch -c feat/login-ui upstream/dev
```

Continúa desde el paso 2: el push irá a tu fork (`origin`). Abre el PR desde esa rama de tu fork hacia `dev` de `orlando-vazquez-career/ciab-community`. Los releases van después por PR de `dev` hacia `main`, con la revisión exigida.

## Licencia

Copyright 2026 CIAB Community contributors.

Este proyecto se distribuye bajo la **Apache License 2.0**. Consulta el texto completo en [LICENSE](LICENSE) o en la [publicación oficial de Apache](https://www.apache.org/licenses/LICENSE-2.0).
