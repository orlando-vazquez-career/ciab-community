<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## CIAB Community — instrucciones del proyecto

### Contexto y alcance

- Antes de cambiar producto, consulta `README.md`, `01-plan-mvp.md`, `02-requisitos-funcionales.md`, `03-modelo-de-datos.md` y `04-plan-ejecucion.md`.
- La fuente del estado vigente es `docs/estado-aplicacion.md`; actualízala cuando cambien decisiones, alcance, verificaciones o pendientes.
- El sitio actual es un esqueleto informativo. No presentes como disponibles el registro, las publicaciones, los comentarios ni otras funciones que aún no están implementadas.
- No agregues autenticación, base de datos, integraciones remotas, secretos ni despliegues de producción sin autorización específica.
- Escribe en español todo texto visible para usuarios, salvo nombres técnicos propios o términos del producto.

### Stack y calidad

- Usa Next.js App Router en `src/app`, React y TypeScript estricto; conserva Tailwind CSS.
- Antes de editar código Next.js, consulta la guía correspondiente en `node_modules/next/dist/docs/` de la versión instalada.
- Usa Node.js y pnpm según `.node-version`, `package.json` y `pnpm-lock.yaml`; no actualices herramientas globales para resolver el entorno.
- Para cambios de comportamiento, escribe y ejecuta primero una prueba que falle; luego implementa el cambio mínimo y vuelve a ejecutar la prueba.
- Antes de cerrar una unidad de trabajo, ejecuta `pnpm lint`, `pnpm typecheck` y `pnpm build` cuando aplique; para UI, revisa 390 px y 1440 px sin desbordamiento horizontal.
- No guardes credenciales, secretos ni datos personales reales en el repositorio.

### Ramas, commits y documentación

- Trabaja desde `dev` para nuevas funcionalidades una vez que esa rama exista; crea una rama por módulo o funcionalidad.
- Separa commits por función y capa (por ejemplo, UI, backend/API, pruebas y documentación); no mezcles trabajo independiente.
- Explica en cada commit qué cambió, por qué y cómo se verificó. No hagas push sin autorización.
- Mantén las decisiones y el estado actual en Markdown, especialmente en `docs/estado-aplicacion.md`.
