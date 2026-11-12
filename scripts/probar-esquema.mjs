// Pruebas de permisos y puntos del esquema.
//
// Dos modos:
//   - Sin DATABASE_URL (por defecto): Postgres en memoria con PGlite. Simula lo mínimo de
//     Supabase (auth.users, auth.uid(), roles anon/authenticated) y aplica la migración.
//     No necesita Docker.
//   - Con DATABASE_URL: se conecta a un Postgres de Supabase que ya tiene la migración
//     aplicada (p. ej. `supabase db start` en GitHub Actions). Usar SOLO con una base
//     desechable: el script inserta usuarios y datos de prueba.
import { readFileSync } from 'node:fs';

const migrationPath = process.argv[2];
const databaseUrl = process.env.DATABASE_URL;

async function connect() {
  if (databaseUrl) {
    const { default: pg } = await import('pg');
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    return {
      exec: (sql) => client.query(sql),
      query: async (sql, params = []) => {
        const result = await client.query(sql, params);
        return { rows: result.rows, affectedRows: result.rowCount };
      },
      close: () => client.end(),
    };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const lite = new PGlite();
  return {
    exec: (sql) => lite.exec(sql),
    query: (sql, params = []) => lite.query(sql, params),
    close: () => lite.close(),
  };
}

const db = await connect();

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
`;

const ids = {
  admin: '00000000-0000-0000-0000-00000000000a',
  mod: '00000000-0000-0000-0000-00000000000b',
  ana: '00000000-0000-0000-0000-00000000000c',
  beto: '00000000-0000-0000-0000-00000000000d',
  pend: '00000000-0000-0000-0000-00000000000e',
  caro: '00000000-0000-0000-0000-00000000000f',
};

let failures = 0;

async function asUser(userId, sql, params = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${userId ?? ''}', false);`);
  await db.exec(userId ? 'set role authenticated' : 'set role anon');
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role');
  }
}

async function expectOk(name, fn) {
  try {
    const result = await fn();
    console.log(`OK    ${name}`);
    return result;
  } catch (error) {
    failures++;
    console.log(`FALLA ${name}: ${error.message}`);
  }
}

async function expectDenied(name, fn) {
  try {
    const result = await fn();
    const affected = result?.affectedRows ?? result?.rows?.length ?? 0;
    if (affected === 0) {
      console.log(`OK    ${name} (sin filas)`);
      return;
    }
    failures++;
    console.log(`FALLA ${name}: se permitió`);
  } catch (error) {
    console.log(`OK    ${name} (${error.message.slice(0, 70)})`);
  }
}

async function balance(userId) {
  const { rows } = await db.query('select coalesce(sum(points),0)::int as total from public.point_events where user_id = $1', [userId]);
  return rows[0].total;
}

async function check(name, actual, expected) {
  if (actual === expected) console.log(`OK    ${name} = ${actual}`);
  else { failures++; console.log(`FALLA ${name}: esperado ${expected}, obtenido ${actual}`); }
}

if (databaseUrl) {
  console.log('Usando la base de datos de DATABASE_URL (migración ya aplicada).\n');
} else {
  await db.exec(SUPABASE_STUB);
  await db.exec(readFileSync(migrationPath, 'utf8'));
  console.log('Migración aplicada en PGlite.\n');
}

for (const [name, id] of Object.entries(ids)) {
  await db.query('insert into auth.users (id, email) values ($1, $2)', [id, `${name}@test.bo`]);
  await asUser(id, 'insert into public.profiles (user_id, username, display_name) values ($1, $2, $3)', [id, name, name]);
}
await db.exec(`update public.member_access set status = 'active', role = 'admin', approved_at = now() - interval '30 days' where user_id = '${ids.admin}'`);

await expectOk('cuenta nueva queda pending', async () => {
  const { rows } = await db.query('select status from public.member_access where user_id = $1', [ids.pend]);
  if (rows[0].status !== 'pending') throw new Error(rows[0].status);
});
await expectDenied('miembro se auto-activa', () =>
  asUser(ids.pend, `update public.member_access set status = 'active' where user_id = $1`, [ids.pend]));
await expectOk('admin aprueba miembros', async () => {
  for (const id of [ids.mod, ids.ana, ids.beto, ids.caro]) {
    await asUser(ids.admin, 'select public.set_member_status($1, $2)', [id, 'active']);
  }
  await asUser(ids.admin, `select public.set_member_role($1, 'moderator')`, [ids.mod]);
  await db.exec(`update public.member_access set approved_at = now() - interval '10 days' where user_id in ('${ids.mod}','${ids.beto}')`);
});
await expectDenied('admin cambia su propio rol', () =>
  asUser(ids.admin, `select public.set_member_role($1, 'member')`, [ids.admin]));
await expectDenied('moderador aprueba miembros', () =>
  asUser(ids.mod, `select public.set_member_status($1, 'active')`, [ids.pend]));

await expectDenied('pendiente publica', () =>
  asUser(ids.pend, `insert into public.posts (author_id, kind, category_id, title, source_url) values ($1, 'news', 1, 'Titulo de prueba', 'https://a.bo')`, [ids.pend]));
await expectDenied('noticia sin fuente', () =>
  asUser(ids.ana, `insert into public.posts (author_id, kind, category_id, title) values ($1, 'news', 1, 'Titulo de prueba')`, [ids.ana]));
await expectDenied('crear publicación ya publicada', () =>
  asUser(ids.ana, `insert into public.posts (author_id, kind, category_id, title, source_url, status, published_at) values ($1, 'news', 1, 'Titulo de prueba', 'https://a.bo', 'published', now())`, [ids.ana]));

const post = await expectOk('miembro activo crea noticia en revisión', () =>
  asUser(ids.ana, `insert into public.posts (author_id, kind, category_id, title, source_url, status) values ($1, 'news', 1, 'Noticia de prueba', 'https://a.bo', 'pending_review') returning id`, [ids.ana]));
const postId = post.rows[0].id;

await expectDenied('visitante ve pendiente', () => asUser(null, 'select id from public.posts'));
await expectDenied('autor se autopublica', () =>
  asUser(ids.ana, `update public.posts set status = 'published' where id = $1`, [postId]));
await expectDenied('autor se autoaprueba vía RPC', () =>
  asUser(ids.ana, `select public.moderate_post($1, 'publish')`, [postId]));
await expectOk('moderador publica', () => asUser(ids.mod, `select public.moderate_post($1, 'publish')`, [postId]));
await expectOk('visitante ve publicada', async () => {
  const { rows } = await asUser(null, 'select id from public.posts');
  if (rows.length !== 1) throw new Error(`${rows.length} filas`);
});
await check('puntos de Ana tras aprobación', await balance(ids.ana), 10);
await expectOk('re-aprobación idempotente', async () => {
  await db.exec(`update public.posts set status = 'pending_review' where id = '${postId}'`);
  await asUser(ids.mod, `select public.moderate_post($1, 'publish')`, [postId]);
});
await check('sin puntos duplicados', await balance(ids.ana), 10);

await expectDenied('autor apoya lo suyo', () =>
  asUser(ids.ana, 'insert into public.post_votes (post_id, user_id) values ($1, $2)', [postId, ids.ana]));
await expectOk('Beto apoya', () => asUser(ids.beto, 'insert into public.post_votes (post_id, user_id) values ($1, $2)', [postId, ids.beto]));
await expectDenied('Beto apoya dos veces', () =>
  asUser(ids.beto, 'insert into public.post_votes (post_id, user_id) values ($1, $2)', [postId, ids.beto]));
await check('puntos tras apoyo', await balance(ids.ana), 11);
await expectOk('Beto retira apoyo', () => asUser(ids.beto, 'delete from public.post_votes where post_id = $1', [postId]));
await check('puntos tras retirar apoyo', await balance(ids.ana), 10);
await check('contador de apoyos', (await db.query('select support_count from public.posts where id = $1', [postId])).rows[0].support_count, 0);

const comment = await expectOk('Beto comenta', () =>
  asUser(ids.beto, `insert into public.comments (post_id, author_id, body) values ($1, $2, 'Buen aporte') returning id`, [postId, ids.beto]));
const commentId = comment.rows[0].id;
const reply = await expectOk('Ana responde', () =>
  asUser(ids.ana, `insert into public.comments (post_id, author_id, parent_id, body) values ($1, $2, $3, 'Gracias') returning id`, [postId, ids.ana, commentId]));
await expectDenied('respuesta de segundo nivel', () =>
  asUser(ids.beto, `insert into public.comments (post_id, author_id, parent_id, body) values ($1, $2, $3, 'x')`, [postId, ids.beto, reply.rows[0].id]));
await expectDenied('Beto se destaca a sí mismo', () => asUser(ids.beto, 'select public.highlight_comment($1)', [commentId]));
await expectDenied('Beto cambia is_highlighted directo', async () => {
  await asUser(ids.beto, 'update public.comments set is_highlighted = true where id = $1', [commentId]);
  const { rows } = await db.query('select is_highlighted from public.comments where id = $1', [commentId]);
  return { rows: rows[0].is_highlighted ? [1] : [] };
});
await expectOk('Ana (autora) destaca a Beto', () => asUser(ids.ana, 'select public.highlight_comment($1)', [commentId]));
await check('puntos de Beto tras destacado', await balance(ids.beto), 3);

await expectOk('moderador oculta comentario', () => asUser(ids.mod, `select public.set_comment_status($1, 'hidden', 'prueba')`, [commentId]));
await check('puntos de Beto tras ocultar', await balance(ids.beto), 0);
await expectOk('moderador restaura comentario', () => asUser(ids.mod, `select public.set_comment_status($1, 'visible', null)`, [commentId]));
await check('puntos de Beto tras restaurar', await balance(ids.beto), 3);

await expectOk('moderador oculta noticia como spam', () => asUser(ids.mod, `select public.moderate_post($1, 'hide', 'spam', true)`, [postId]));
await check('puntos de Ana tras spam', await balance(ids.ana), -5);
await expectOk('moderador restaura noticia', () => asUser(ids.mod, `select public.moderate_post($1, 'restore')`, [postId]));
await check('puntos de Ana tras restaurar', await balance(ids.ana), 10);

const report = await expectOk('Beto reporta', () =>
  asUser(ids.beto, `insert into public.reports (reporter_id, post_id, reason) values ($1, $2, 'otro') returning id`, [ids.beto, postId]));
await expectDenied('reporte sin objetivo', () =>
  asUser(ids.beto, `insert into public.reports (reporter_id, reason) values ($1, 'otro')`, [ids.beto]));
await expectOk('moderador confirma reporte', () => asUser(ids.mod, 'select public.resolve_report($1, true)', [report.rows[0].id]));
await check('puntos de Beto tras reporte', await balance(ids.beto), 5);

await expectDenied('miembro se inserta puntos', () =>
  asUser(ids.beto, `insert into public.point_events (user_id, point_rule_id, reference_type, reference_id, points, idempotency_key) values ($1, 1, 'post', 'x', 1000, 'hack')`, [ids.beto]));
await expectDenied('miembro llama award_points', () =>
  asUser(ids.beto, `select public.award_points($1, 'news_approved', 'post', 'x', 'hack2')`, [ids.beto]));

// --- Regresiones de la revisión de lógica -------------------------------------------

const publish = (modId, id) => asUser(modId, `select public.moderate_post($1, 'publish')`, [id]);
const createNews = async (userId, title) =>
  (await asUser(userId, `insert into public.posts (author_id, kind, category_id, title, source_url, status) values ($1, 'news', 1, $2, 'https://a.bo', 'pending_review') returning id`, [userId, title])).rows[0].id;

// Un descuento por ocultar no debe contar como aporte en el tope diario (3 noticias/día).
const post2 = await expectOk('Ana: segunda noticia publicada y luego oculta', async () => {
  const id = await createNews(ids.ana, 'Segunda noticia');
  await publish(ids.mod, id);
  await asUser(ids.mod, `select public.moderate_post($1, 'hide', 'fuera de tema')`, [id]);
  return id;
});
let before = await balance(ids.ana);
const post3 = await expectOk('Ana: tercera noticia publicada', async () => {
  const id = await createNews(ids.ana, 'Tercera noticia');
  await publish(ids.mod, id);
  return id;
});
await check('ocultar no consume el tope diario (puntos de la 3.ª noticia)', await balance(ids.ana) - before, 10);

// Retirar un apoyo de algo oculto descontaría el punto dos veces.
await expectOk('Beto apoya la tercera noticia', () =>
  asUser(ids.beto, 'insert into public.post_votes (post_id, user_id) values ($1, $2)', [post3, ids.beto]));
await expectOk('moderador oculta la tercera noticia', () =>
  asUser(ids.mod, `select public.moderate_post($1, 'hide', 'prueba')`, [post3]));
await expectDenied('Beto retira apoyo de una noticia oculta', () =>
  asUser(ids.beto, 'delete from public.post_votes where post_id = $1', [post3]));
before = await balance(ids.ana);
await expectOk('moderador restaura la tercera noticia', () =>
  asUser(ids.mod, `select public.moderate_post($1, 'restore')`, [post3]));
await check('restaurar devuelve noticia + apoyo', await balance(ids.ana) - before, 11);

// Nadie se modera ni se reporta a sí mismo.
const modPost = await expectOk('moderador envía su propia noticia', () => createNews(ids.mod, 'Noticia del moderador'));
await expectDenied('moderador publica su propia noticia', () => publish(ids.mod, modPost));
await expectOk('admin publica la noticia del moderador', () => publish(ids.admin, modPost));
await expectDenied('Ana reporta su propia noticia', () =>
  asUser(ids.ana, `insert into public.reports (reporter_id, post_id, reason) values ($1, $2, 'otro')`, [ids.ana, post3]));

// Ocultamiento automático por 3 reportes: retira puntos y no se repite tras restaurar.
const c2 = await expectOk('Beto comenta y Ana lo destaca', async () => {
  const { rows } = await asUser(ids.beto, `insert into public.comments (post_id, author_id, body) values ($1, $2, 'Otro aporte') returning id`, [postId, ids.beto]);
  await asUser(ids.ana, 'select public.highlight_comment($1)', [rows[0].id]);
  return rows[0].id;
});
before = await balance(ids.beto);
await expectOk('3 miembros reportan el comentario', async () => {
  for (const id of [ids.ana, ids.admin, ids.caro]) {
    await asUser(id, `insert into public.reports (reporter_id, comment_id, reason) values ($1, $2, 'ofensivo')`, [id, c2]);
  }
});
const commentStatus = async (id) => (await db.query('select status from public.comments where id = $1', [id])).rows[0].status;
await check('comentario oculto automáticamente', await commentStatus(c2), 'hidden');
await check('ocultamiento automático retira los puntos', await balance(ids.beto) - before, -3);
await expectOk('moderador restaura el comentario', () =>
  asUser(ids.mod, `select public.set_comment_status($1, 'visible', 'revisado')`, [c2]));
await check('restaurar devuelve los puntos', await balance(ids.beto) - before, 0);
const modReport = await expectOk('moderador reporta el comentario después de restaurarlo', () =>
  asUser(ids.mod, `insert into public.reports (reporter_id, comment_id, reason) values ($1, $2, 'otro') returning id`, [ids.mod, c2]));
await check('reportes viejos no lo vuelven a ocultar', await commentStatus(c2), 'visible');
await expectDenied('moderador resuelve su propio reporte', () =>
  asUser(ids.mod, 'select public.resolve_report($1, false)', [modReport.rows[0].id]));
await expectOk('admin resuelve el reporte del moderador', () =>
  asUser(ids.admin, 'select public.resolve_report($1, false)', [modReport.rows[0].id]));
await expectDenied('moderador oculta su propio comentario', async () => {
  const { rows } = await asUser(ids.mod, `insert into public.comments (post_id, author_id, body) values ($1, $2, 'Comentario del moderador') returning id`, [postId, ids.mod]);
  return asUser(ids.mod, `select public.set_comment_status($1, 'hidden', 'x')`, [rows[0].id]);
});
await expectDenied('moderar un comentario inexistente', () =>
  asUser(ids.mod, `select public.set_comment_status('00000000-0000-0000-0000-000000000099', 'hidden', 'x')`));

// Máximo 5 etiquetas por publicación.
await expectDenied('sexta etiqueta en una publicación', async () => {
  await asUser(ids.admin, `insert into public.tags (name, slug) select 'Etiqueta ' || n, 'etiqueta-' || n from generate_series(1, 6) n`);
  const { rows } = await asUser(ids.ana, `insert into public.posts (author_id, kind, category_id, title) values ($1, 'debate', 1, 'Debate con etiquetas') returning id`, [ids.ana]);
  for (let n = 1; n <= 6; n++) {
    await asUser(ids.ana, `insert into public.post_tags (post_id, tag_id) select $1, id from public.tags where slug = $2`, [rows[0].id, `etiqueta-${n}`]);
  }
  return { rows: [1] };
});

// Reglas de puntos: no se editan; el admin solo las activa o desactiva.
await expectDenied('miembro edita una regla de puntos', () =>
  asUser(ids.ana, `update public.point_rules set points = 100 where action = 'news_approved'`));
await expectDenied('admin cambia los puntos de una regla', () =>
  asUser(ids.admin, `update public.point_rules set points = 100 where action = 'news_approved'`));
await expectOk('admin desactiva y reactiva una regla', async () => {
  await asUser(ids.admin, `update public.point_rules set is_active = false where action = 'report_confirmed'`);
  await asUser(ids.admin, `update public.point_rules set is_active = true where action = 'report_confirmed'`);
});

await expectOk('ranking público', async () => {
  const { rows } = await asUser(null, `select username, points from public.get_leaderboard('month')`);
  console.log('      ', rows.map(r => `${r.username}:${r.points}`).join(', '));
});

await db.close();
console.log(failures === 0 ? '\nTodas las pruebas pasaron.' : `\n${failures} prueba(s) fallaron.`);
process.exit(failures === 0 ? 0 : 1);
