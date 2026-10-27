# CIAB Community

Comunidad open source de la **Cámara de Inteligencia Artificial Boliviana (CIAB)**, inspirada en la dinámica de Taringa: compartir noticias relevantes de inteligencia artificial, conversar sobre ellas y reconocer los aportes de la comunidad.

## La idea

Crear un espacio donde las personas puedan publicar noticias de IA, descubrir novedades y participar en conversaciones con otros miembros. Cada noticia publicada aparecerá automáticamente en el foro y se difundirá en las redes sociales de la CIAB, según las reglas de publicación que defina el equipo.

El objetivo es conectar la información con la conversación y convertir la participación de la comunidad en el motor del sitio.

## Experiencia prevista

1. Una persona comparte una noticia relevante de IA con su fuente y contexto.
2. La publicación aparece en el foro, donde otros usuarios pueden leerla y comentarla.
3. Una integración difunde la noticia en las redes sociales de la CIAB.
4. Las publicaciones y los comentarios aportan al sistema de gamificación de la comunidad.

Los canales sociales, las reglas de moderación y el momento de la difusión automática se definirán durante el diseño del producto.

## Participación y gamificación

La comunidad tendrá gamificación para incentivar que sus miembros compartan noticias y participen con comentarios útiles. Se podrán evaluar mecanismos como puntos, niveles, insignias o reconocimientos por aportes de calidad.

Las mecánicas concretas y las medidas para evitar spam o participación artificial quedan por definir. La intención es premiar la calidad y la conversación, además de la actividad.

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

Este repositorio documenta la idea inicial. Contiene únicamente este README y la licencia; la aplicación y las integraciones se desarrollarán posteriormente.

- Definir el stack y la arquitectura bajo la dirección de Ismael.
- Acordar el alcance de la primera versión y los criterios de relevancia de las noticias.
- Definir la moderación y los canales sociales de la CIAB que se integrarán.
- Diseñar las reglas de gamificación.
- Preparar los proyectos y accesos de Railway, Vercel y Supabase.

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

Usa el mismo nombre de rama que elegiste en el paso anterior. Revisa el contenido y realiza las comprobaciones que correspondan a tu cambio; los comandos de instalación y pruebas se documentarán cuando el equipo defina el stack.

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
