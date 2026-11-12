# CIAB Community

Comunidad open source de la **Cámara de Inteligencia Artificial Boliviana (CIAB)**, inspirada en la dinámica de Taringa: compartir noticias relevantes de inteligencia artificial, conversar sobre ellas y reconocer los aportes de la comunidad.

## La idea

Crear un espacio donde las personas puedan publicar noticias de IA, descubrir novedades y participar en conversaciones con otros miembros. Cualquiera puede leer; para publicar, comentar o votar hace falta ser miembro aprobado por un administrador. Las noticias y los debates **pasan por la revisión de un moderador antes de hacerse públicos**.

El objetivo es conectar la información con la conversación y convertir la participación de la comunidad en el motor del sitio.

## Experiencia prevista

1. Un miembro aprobado comparte una noticia relevante de IA con su fuente y contexto, o abre un debate.
2. Un moderador la revisa y la publica o la rechaza con un motivo.
3. Ya publicada, otros miembros la leen, la comentan y la apoyan.
4. Los aportes validados suman al sistema de gamificación de la comunidad.
5. **Fase 2 (después del lanzamiento):** una integración difundirá en las redes sociales de la CIAB las noticias aprobadas y marcadas como elegibles.

## Participación y gamificación

La gamificación premia **aportes validados**: noticias y debates aprobados, apoyos de miembros con antigüedad, comentarios destacados y reportes confirmados. Vistas, clics y votos propios no suman. Los puntos quedan en un libro mayor auditable, con topes diarios y descuentos si el contenido se oculta. La propuesta de puntos, niveles e insignias está en [`docs/02-requisitos-funcionales.md`](docs/02-requisitos-funcionales.md) (P-01) y espera aprobación del equipo.

## Equipo

- **Ismael Rivera:** dirección del proyecto y elección del stack de programación.
- **Vladimir y Diego:** apoyo en el desarrollo y la construcción de la comunidad, en coordinación con Ismael.

## Tecnología e infraestructura

**Ismael elegirá el stack de programación y definirá la arquitectura con el equipo.**

La infraestructura prevista es:

| Servicio | Uso previsto |
| --- | --- |
| Railway | Despliegue de los servicios que defina la arquitectura. |
| Vercel | Despliegue del sitio web. |
| Supabase | Base de datos prevista para la CIAB; cuenta y proyecto por crear o confirmar usando su correo institucional. |

La distribución final de los servicios, la creación o disponibilidad del proyecto de Supabase y los accesos institucionales quedan por confirmar antes de implementar.

## Estado y próximos pasos

Hay documentación de producto y un borrador del esquema de base de datos con pruebas. La aplicación todavía no se empezó.

| Ruta | Contenido |
| --- | --- |
| `docs/` | Plan del MVP, requisitos, modelo de datos y plan de ejecución (borrador 0.3). |
| `supabase/migrations/` | Esquema inicial: tablas, RLS, moderación y puntos. |
| `supabase/config.toml`, `supabase/seed.sql` | Configuración del entorno local de Supabase. |
| `scripts/probar-esquema.mjs` | Pruebas de permisos y puntos. |

Próximos pasos:

- Aprobar el stack (propuesta: Next.js + TypeScript) y las propuestas P-01 a P-05.
- Crear el proyecto Supabase de la CIAB con el correo institucional y los accesos de Vercel y Railway.
- Definir los canales sociales de la CIAB para la fase 2.

## Desarrollo

Necesitas Node 20 o superior. **No hace falta Docker.**

```bash
npm install
npm run test:db   # aplica la migración en un Postgres en memoria y corre las pruebas
```

En cada PR, GitHub Actions corre las mismas pruebas dos veces: con PGlite y contra el Postgres real de Supabase (`supabase db start`, con Docker en los servidores de GitHub). El detalle, y cómo usar un proyecto de Supabase en la nube para desarrollo, está en [`docs/03-modelo-de-datos.md`](docs/03-modelo-de-datos.md#entornos-y-pruebas).

## Cómo contribuir

Las contribuciones son bienvenidas. Puedes proponer ideas mediante issues y coordinar las decisiones técnicas con Ismael. Para cambiar archivos, trabaja en una rama y abre un pull request (PR).

### 1. Clona el repositorio y crea tu rama

Si tienes permiso de escritura en este repositorio:

```bash
git clone https://github.com/orlando-vazquez-career/ciab-community.git
cd ciab-community
git switch main
git pull --ff-only origin main
git switch -c docs/mi-aporte
```

Si ya tienes una copia local, entra en su carpeta y omite el comando de clonación. Usa un nombre de rama que describa tu aporte, por ejemplo `docs/mi-aporte`, `feat/nueva-funcionalidad` o `fix/correccion`.

### 2. Guarda y publica tus cambios

Edita los archivos, revisa el diff y crea un commit. Este ejemplo modifica el README; sustituye `README.md` por los archivos concretos de tu aporte:

```bash
git diff
git add README.md
git diff --cached
git commit -m "docs: describe el aporte"
git push -u origin docs/mi-aporte
```

Usa el mismo nombre de rama que elegiste en el paso anterior. Antes de subir cambios en `supabase/` o `scripts/`, corre `npm run test:db` (ver [Desarrollo](#desarrollo)).

### 3. Abre un pull request hacia main

En GitHub, entra en [Pull requests](https://github.com/orlando-vazquez-career/ciab-community/pulls) y selecciona **New pull request**. Elige `main` como rama de destino (**base**) y tu rama como origen (**compare**).

Escribe un título claro y explica qué cambiaste, por qué y cómo lo comprobaste. Abre el PR cuando esté listo para revisión y solicita la revisión de otro colaborador con permiso de escritura.

### 4. Obtén la aprobación de otro colaborador

La rama `main` está protegida. **Para incorporar cambios hace falta un PR aprobado por al menos otro colaborador con permiso de escritura**, distinto del autor y de quien realizó el último push.

- Si añades cambios al PR, las aprobaciones anteriores se invalidan y hay que revisar y aprobar la nueva versión.
- Responde a la revisión y resuelve las conversaciones pendientes antes de fusionar.
- Cuando se cumplan los requisitos, un miembro con permiso de escritura podrá fusionar el PR a `main`.
- La regla se aplica también a administradores y bots, sin excepciones. GitHub Actions no puede aprobar PR.
- Están bloqueados el force push y el borrado de `main`.

### Si no tienes permiso de escritura

Crea un **fork** en tu cuenta y clona tu fork en lugar del repositorio original. Antes de crear la rama de trabajo, conecta y actualiza la referencia al repositorio original:

```bash
git remote add upstream https://github.com/orlando-vazquez-career/ciab-community.git
git fetch upstream
git switch -c docs/mi-aporte upstream/main
```

Continúa desde el paso 2: el push irá a tu fork (`origin`). Abre el PR desde esa rama de tu fork hacia `main` de `orlando-vazquez-career/ciab-community`. Se exige la misma revisión y aprobación de otro colaborador.

## Licencia

Copyright 2026 CIAB Community contributors.

Este proyecto se distribuye bajo la **Apache License 2.0**. Consulta el texto completo en [LICENSE](LICENSE) o en la [publicación oficial de Apache](https://www.apache.org/licenses/LICENSE-2.0).
