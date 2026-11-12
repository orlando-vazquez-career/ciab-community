-- =============================================================================
-- CIAB Community — esquema inicial (BORRADOR 0.3 para revisión por PR)
--
-- Contenido:
--   1. Identidad y membresía        6. Funciones auxiliares
--   2. Catálogos                    7. Triggers de integridad y antiabuso
--   3. Publicaciones                8. Libro mayor de puntos
--   4. Comentarios y apoyos         9. Funciones que llama el cliente (RPC)
--   5. Moderación y gamificación   10. RLS, permisos y datos iniciales
--
-- Reglas de diseño:
--   - Supabase Auth (auth.users) es dueño de la identidad.
--   - Toda tabla de `public` tiene RLS. El cliente solo escribe lo suyo;
--     las transiciones privilegiadas pasan por funciones SECURITY DEFINER.
--   - Los puntos son un libro mayor de solo-agregar: nunca se edita un saldo.
--   - Cada función hace una sola cosa y no recibe banderas booleanas: en vez de
--     moderate_post(decision) hay publish_post, reject_post, hide_post, etc.
--   - Nombres: docs/05-convenciones-de-codigo.md. Los verifica
--     scripts/check-sql-conventions.mjs.
--   - Fuera de este archivo: Storage (avatares/imágenes), insignias
--     automáticas y difusión social (fase 2).
-- =============================================================================


-- =============================================================================
-- 1. Identidad y membresía
-- =============================================================================

create table public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio          text check (char_length(bio) <= 500),
  avatar_path  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Estado y rol de acceso, separados del perfil público (RF-01, RF-02).
create table public.memberships (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  role          text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  status_reason text,
  approved_by   uuid references auth.users (id),
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);


-- =============================================================================
-- 2. Catálogos
-- =============================================================================

create table public.categories (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(name) between 2 and 60),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text,
  sort_order  int not null default 0,
  is_active   boolean not null default true
);

create table public.tags (
  id   bigint generated always as identity primary key,
  name text not null check (char_length(name) between 2 and 40),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$')
);


-- =============================================================================
-- 3. Publicaciones
-- =============================================================================

create table public.posts (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid not null references public.profiles (user_id),
  kind             text not null check (kind in ('news', 'debate')),
  category_id      bigint not null references public.categories (id),
  title            text not null check (char_length(title) between 5 and 200),
  excerpt          text check (char_length(excerpt) <= 500),
  body_markdown    text not null default '' check (char_length(body_markdown) <= 20000),
  source_url       text check (source_url ~ '^https://'),
  status           text not null default 'draft'
                     check (status in ('draft', 'pending_review', 'published', 'rejected', 'hidden')),
  rejection_reason text,
  support_count    int not null default 0 check (support_count >= 0),
  reviewed_by      uuid references auth.users (id),
  reviewed_at      timestamptz,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint posts_news_source_url_check
    check (kind <> 'news' or source_url is not null),
  constraint posts_published_at_check
    check (status not in ('published', 'hidden') or published_at is not null)
);

-- Edición de una publicación ya publicada (P-04): queda pendiente de revisión.
create table public.post_revisions (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.posts (id) on delete cascade,
  editor_id     uuid not null references public.profiles (user_id),
  title         text not null check (char_length(title) between 5 and 200),
  excerpt       text check (char_length(excerpt) <= 500),
  body_markdown text not null default '' check (char_length(body_markdown) <= 20000),
  source_url    text check (source_url ~ '^https://'),
  status        text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  review_reason text,
  reviewed_by   uuid references auth.users (id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create table public.post_tags (
  post_id uuid   not null references public.posts (id) on delete cascade,
  tag_id  bigint not null references public.tags (id),
  primary key (post_id, tag_id)
);


-- =============================================================================
-- 4. Comentarios y apoyos
-- =============================================================================

create table public.comments (
  id             uuid primary key default gen_random_uuid(),
  post_id        uuid not null references public.posts (id) on delete cascade,
  author_id      uuid not null references public.profiles (user_id),
  parent_id      uuid references public.comments (id),
  body           text not null,
  status         text not null default 'visible' check (status in ('visible', 'hidden', 'deleted')),
  is_highlighted boolean not null default false,
  highlighted_by uuid references auth.users (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint comments_body_length_check
    check (status = 'deleted' or char_length(body) between 1 and 5000)
);

-- Un apoyo por miembro y publicación (RF-07).
create table public.post_supports (
  post_id      uuid not null references public.posts (id) on delete cascade,
  supporter_id uuid not null references public.profiles (user_id),
  created_at   timestamptz not null default now(),
  primary key (post_id, supporter_id)
);


-- =============================================================================
-- 5. Moderación y gamificación
-- =============================================================================

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (user_id),
  post_id     uuid references public.posts (id) on delete cascade,
  comment_id  uuid references public.comments (id) on delete cascade,
  reason      text not null check (reason in ('spam', 'fuente_falsa', 'ofensivo', 'fuera_de_tema', 'otro')),
  details     text check (char_length(details) <= 1000),
  status      text not null default 'open' check (status in ('open', 'accepted', 'dismissed')),
  resolved_by uuid references auth.users (id),
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),

  constraint reports_single_target_check check (num_nonnulls(post_id, comment_id) = 1)
);

-- Auditoría de solo-agregar. moderator_id nulo = acción automática del sistema.
-- Las acciones se nombran <objeto>_<verbo en participio>.
create table public.moderation_actions (
  id           uuid primary key default gen_random_uuid(),
  moderator_id uuid references auth.users (id),
  target_type  text not null check (target_type in ('post', 'post_revision', 'comment', 'report', 'member')),
  target_id    text not null,
  action       text not null check (action in (
                 'member_activated', 'member_suspended', 'member_role_changed',
                 'post_published', 'post_rejected', 'post_hidden', 'post_marked_as_spam', 'post_restored',
                 'revision_approved', 'revision_rejected',
                 'comment_hidden', 'comment_restored',
                 'report_accepted', 'report_dismissed')),
  reason       text,
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- Una regla usada no se edita: se crea otra versión y se desactiva la anterior.
create table public.point_rules (
  id                bigint generated always as identity primary key,
  action            text not null,
  version           int not null default 1,
  points            int not null,
  daily_cap         int check (daily_cap > 0),
  per_reference_cap int check (per_reference_cap > 0),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  unique (action, version)
);

-- idempotency_key sigue el formato de point_event_key(): <acción>:<tipo>:<id>[:<calificador>].
create table public.point_events (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles (user_id),
  point_rule_id        bigint not null references public.point_rules (id),
  reference_type       text not null check (reference_type in ('post', 'comment', 'report')),
  reference_id         text not null,
  points               int not null,
  idempotency_key      text not null unique,
  reversal_of_event_id uuid references public.point_events (id),
  created_at           timestamptz not null default now()
);

create table public.levels (
  id             bigint generated always as identity primary key,
  code           text not null unique,
  name           text not null,
  minimum_points int not null unique check (minimum_points >= 0),
  is_active      boolean not null default true
);

create table public.badges (
  id             bigint generated always as identity primary key,
  code           text not null unique,
  name           text not null,
  description    text not null,
  award_criteria jsonb not null default '{}'::jsonb,
  is_active      boolean not null default true
);

create table public.user_badges (
  user_id      uuid   not null references public.profiles (user_id),
  badge_id     bigint not null references public.badges (id),
  rule_version int    not null default 1,
  awarded_at   timestamptz not null default now(),
  primary key (user_id, badge_id)
);


-- =============================================================================
-- Índices: <tabla>_<columnas>_idx; únicos: <tabla>_<columnas>_key
-- =============================================================================

create index posts_status_published_at_idx     on public.posts (status, published_at desc, id desc);
create index posts_category_id_status_idx      on public.posts (category_id, status, published_at desc);
create index posts_author_id_created_at_idx    on public.posts (author_id, created_at desc);
create index post_revisions_post_id_status_idx on public.post_revisions (post_id, status);
create index comments_post_id_created_at_idx   on public.comments (post_id, created_at);
create index comments_author_id_created_at_idx on public.comments (author_id, created_at desc);
create index reports_open_created_at_idx       on public.reports (created_at) where status = 'open';
create index point_events_user_id_created_at_idx on public.point_events (user_id, created_at desc);
create index point_events_reference_idx        on public.point_events (reference_type, reference_id);

create unique index reports_reporter_id_post_id_key
  on public.reports (reporter_id, post_id) where post_id is not null;
create unique index reports_reporter_id_comment_id_key
  on public.reports (reporter_id, comment_id) where comment_id is not null;
create unique index point_rules_active_action_key
  on public.point_rules (action) where is_active;


-- =============================================================================
-- 6. Funciones auxiliares
-- =============================================================================

create function public.is_active_member()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid() and status = 'active'
  );
$$;

create function public.is_moderator()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid() and status = 'active' and role in ('moderator', 'admin')
  );
$$;

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid() and status = 'active' and role = 'admin'
  );
$$;

-- Verdadero cuando la operación la hace un cliente (no una función privilegiada).
create function public.is_client_request()
returns boolean
language sql stable set search_path = ''
as $$
  select current_user in ('anon', 'authenticated');
$$;

-- SECURITY DEFINER: las políticas lo usan sin depender de lo que el lector pueda ver.
create function public.is_post_published(p_post_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.posts where id = p_post_id and status = 'published');
$$;

create function public.is_own_post(p_post_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.posts where id = p_post_id and author_id = auth.uid());
$$;

create function public.is_own_comment(p_comment_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.comments where id = p_comment_id and author_id = auth.uid());
$$;

create function public.has_text(p_value text)
returns boolean
language sql immutable set search_path = ''
as $$
  select coalesce(char_length(trim(p_value)) > 0, false);
$$;

-- Corta la operación con un mensaje en español si la condición no se cumple.
create function public.ensure(p_condition boolean, p_message text)
returns void
language plpgsql immutable set search_path = ''
as $$
begin
  if not coalesce(p_condition, false) then
    raise exception '%', p_message using errcode = 'P0001';
  end if;
end;
$$;

-- Toda fecha "del día" se calcula en hora de Bolivia (RNF-12).
create function public.to_bolivia_date(p_moment timestamptz)
returns date
language sql stable set search_path = ''
as $$
  select (p_moment at time zone 'America/La_Paz')::date;
$$;

create function public.today_in_bolivia()
returns date
language sql stable set search_path = ''
as $$
  select public.to_bolivia_date(now());
$$;

-- Única fuente del formato de las claves de idempotencia de puntos.
create function public.point_event_key(
  p_action         text,
  p_reference_type text,
  p_reference_id   text,
  p_qualifier      text default null
)
returns text
language sql immutable set search_path = ''
as $$
  select concat_ws(':', p_action, p_reference_type, p_reference_id, p_qualifier);
$$;


-- =============================================================================
-- 7. Triggers de integridad y antiabuso
--    Funciones: <verbo>_<objeto>. Triggers: <tabla>_<propósito>.
-- =============================================================================

create function public.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at    before update on public.profiles    for each row execute function public.set_updated_at();
create trigger memberships_set_updated_at before update on public.memberships for each row execute function public.set_updated_at();
create trigger posts_set_updated_at       before update on public.posts       for each row execute function public.set_updated_at();
create trigger comments_set_updated_at    before update on public.comments    for each row execute function public.set_updated_at();

-- Toda cuenta nueva empieza como miembro pendiente (RF-02).
create function public.create_membership_for_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.memberships (user_id) values (new.id);
  return new;
end;
$$;

create trigger users_create_membership
  after insert on auth.users
  for each row execute function public.create_membership_for_new_user();

-- El autor no puede tocar campos de revisión ni contadores.
create function public.protect_post_review_fields()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if public.is_client_request() then
    new.author_id        := old.author_id;
    new.rejection_reason := old.rejection_reason;
    new.support_count    := old.support_count;
    new.reviewed_by      := old.reviewed_by;
    new.reviewed_at      := old.reviewed_at;
    new.published_at     := old.published_at;
  end if;
  return new;
end;
$$;

create trigger posts_protect_review_fields
  before update on public.posts
  for each row execute function public.protect_post_review_fields();

-- Respuestas de un solo nivel y en la misma publicación (RF-06).
create function public.validate_comment_parent()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_parent public.comments;
begin
  if new.parent_id is null then
    return new;
  end if;

  select * into v_parent from public.comments where id = new.parent_id;
  perform public.ensure(v_parent.post_id = new.post_id, 'La respuesta debe pertenecer a la misma publicación.');
  perform public.ensure(v_parent.parent_id is null, 'Solo se permite un nivel de respuestas.');
  return new;
end;
$$;

create trigger comments_validate_parent
  before insert on public.comments
  for each row execute function public.validate_comment_parent();

-- El autor solo edita el texto durante 15 minutos o lo borra (RF-06).
create function public.protect_comment_fields()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  c_edit_window constant interval := interval '15 minutes';
begin
  if not public.is_client_request() then
    return new;
  end if;

  new.post_id        := old.post_id;
  new.author_id      := old.author_id;
  new.parent_id      := old.parent_id;
  new.is_highlighted := old.is_highlighted;
  new.highlighted_by := old.highlighted_by;

  if new.status = 'deleted' then
    perform public.ensure(old.status = 'visible', 'Solo se puede borrar un comentario visible.');
    new.body := '';
    return new;
  end if;

  perform public.ensure(new.status = old.status, 'El estado del comentario lo cambia un moderador.');
  perform public.ensure(
    new.body = old.body or old.created_at > now() - c_edit_window,
    'El comentario solo se puede editar durante 15 minutos.'
  );
  return new;
end;
$$;

create trigger comments_protect_fields
  before update on public.comments
  for each row execute function public.protect_comment_fields();

-- Límites antiabuso (RNF-05).
create function public.limit_posts_per_day()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c_max_posts_per_day constant int := 5;
  v_posts_today       int;
begin
  select count(*) into v_posts_today
  from public.posts
  where author_id = new.author_id
    and public.to_bolivia_date(created_at) = public.today_in_bolivia();

  perform public.ensure(v_posts_today < c_max_posts_per_day, 'Límite de 5 publicaciones por día alcanzado.');
  return new;
end;
$$;

create function public.limit_comments_per_hour()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c_max_comments_per_hour constant int := 10;
  v_comments_last_hour    int;
begin
  select count(*) into v_comments_last_hour
  from public.comments
  where author_id = new.author_id
    and created_at > now() - interval '1 hour';

  perform public.ensure(v_comments_last_hour < c_max_comments_per_hour, 'Límite de 10 comentarios por hora alcanzado.');
  return new;
end;
$$;

create function public.limit_reports_per_day()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c_max_reports_per_day constant int := 10;
  v_reports_today       int;
begin
  select count(*) into v_reports_today
  from public.reports
  where reporter_id = new.reporter_id
    and public.to_bolivia_date(created_at) = public.today_in_bolivia();

  perform public.ensure(v_reports_today < c_max_reports_per_day, 'Límite de 10 reportes por día alcanzado.');
  return new;
end;
$$;

-- Máximo 5 etiquetas por publicación (RF-04).
create function public.limit_tags_per_post()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c_max_tags_per_post constant int := 5;
  v_tag_count         int;
begin
  select count(*) into v_tag_count from public.post_tags where post_id = new.post_id;
  perform public.ensure(v_tag_count < c_max_tags_per_post, 'Una publicación admite hasta 5 etiquetas.');
  return new;
end;
$$;

create trigger posts_limit_per_day       before insert on public.posts     for each row execute function public.limit_posts_per_day();
create trigger comments_limit_per_hour   before insert on public.comments  for each row execute function public.limit_comments_per_hour();
create trigger reports_limit_per_day     before insert on public.reports   for each row execute function public.limit_reports_per_day();
create trigger post_tags_limit_per_post  before insert on public.post_tags for each row execute function public.limit_tags_per_post();

-- Nadie apoya su propia publicación (RF-07).
create function public.forbid_self_support()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.ensure(
    not exists (select 1 from public.posts where id = new.post_id and author_id = new.supporter_id),
    'No puedes apoyar tu propia publicación.'
  );
  return new;
end;
$$;

create trigger post_supports_forbid_self
  before insert on public.post_supports
  for each row execute function public.forbid_self_support();

-- Mantiene posts.support_count, el total público de apoyos.
create function public.update_post_support_count()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set support_count = support_count + 1 where id = new.post_id;
    return new;
  end if;

  update public.posts set support_count = support_count - 1 where id = old.post_id;
  return old;
end;
$$;

create trigger post_supports_update_count
  after insert or delete on public.post_supports
  for each row execute function public.update_post_support_count();

-- Una regla usada no se edita: el admin solo puede activarla o desactivarla.
create function public.protect_point_rule_values()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  perform public.ensure(
    new.action = old.action and new.version = old.version and new.points = old.points
    and new.daily_cap is not distinct from old.daily_cap
    and new.per_reference_cap is not distinct from old.per_reference_cap,
    'Una regla no se edita: crea una versión nueva y desactiva la anterior.'
  );
  return new;
end;
$$;

create trigger point_rules_protect_values
  before update on public.point_rules
  for each row execute function public.protect_point_rule_values();


-- =============================================================================
-- 8. Libro mayor de puntos (funciones internas: el cliente no las puede llamar)
-- =============================================================================

-- Los descuentos y sus reversiones no cuentan: solo los aportes del día.
create function public.has_reached_daily_cap(p_user_id uuid, p_rule public.point_rules)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_rule.daily_cap is not null and count(*) >= p_rule.daily_cap
  from public.point_events e
  where e.user_id = p_user_id
    and e.point_rule_id in (select id from public.point_rules where action = p_rule.action)
    and e.reversal_of_event_id is null
    and public.to_bolivia_date(e.created_at) = public.today_in_bolivia();
$$;

-- Saldo neto de eventos de esa acción sobre una misma referencia (p. ej. apoyos por publicación).
create function public.has_reached_reference_cap(
  p_rule           public.point_rules,
  p_reference_type text,
  p_reference_id   text
)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_rule.per_reference_cap is not null
     and coalesce(sum(sign(e.points)), 0) >= p_rule.per_reference_cap
  from public.point_events e
  where e.point_rule_id in (select id from public.point_rules where action = p_rule.action)
    and e.reference_type = p_reference_type
    and e.reference_id = p_reference_id;
$$;

-- Otorga puntos según la regla activa, respetando topes e idempotencia.
create function public.award_points(
  p_user_id         uuid,
  p_action          text,
  p_reference_type  text,
  p_reference_id    text,
  p_idempotency_key text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_rule public.point_rules;
begin
  select * into v_rule from public.point_rules where action = p_action and is_active;
  if not found
     or exists (select 1 from public.point_events where idempotency_key = p_idempotency_key)
     or public.has_reached_daily_cap(p_user_id, v_rule)
     or public.has_reached_reference_cap(v_rule, p_reference_type, p_reference_id) then
    return;
  end if;

  insert into public.point_events (user_id, point_rule_id, reference_type, reference_id, points, idempotency_key)
  values (p_user_id, v_rule.id, p_reference_type, p_reference_id, v_rule.points, p_idempotency_key);
end;
$$;

-- Compensa un evento concreto (p. ej. un apoyo retirado). Repetirla no tiene efecto.
create function public.reverse_points(p_idempotency_key text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_event public.point_events;
begin
  select * into v_event from public.point_events where idempotency_key = p_idempotency_key;
  if not found then
    return;
  end if;

  insert into public.point_events
    (user_id, point_rule_id, reference_type, reference_id, points, idempotency_key, reversal_of_event_id)
  values
    (v_event.user_id, v_event.point_rule_id, v_event.reference_type, v_event.reference_id,
     -v_event.points, 'reversal:' || p_idempotency_key, v_event.id)
  on conflict (idempotency_key) do nothing;
end;
$$;

-- Al ocultar contenido: retira el saldo positivo neto que ese contenido le dio a su autor.
-- Se registra con la regla técnica 'content_withheld' y no con la de la acción original,
-- para que el descuento no cuente en los topes diarios ni por referencia.
create function public.withhold_reference_points(
  p_user_id              uuid,
  p_reference_type       text,
  p_reference_id         text,
  p_moderation_action_id uuid
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_net_points int;
  v_rule_id    bigint;
begin
  select coalesce(sum(e.points), 0) into v_net_points
  from public.point_events e
  join public.point_rules r on r.id = e.point_rule_id
  where e.user_id = p_user_id
    and e.reference_type = p_reference_type
    and e.reference_id = p_reference_id
    and r.action <> 'content_hidden_as_spam';

  if v_net_points <= 0 then
    return;
  end if;

  select id into v_rule_id from public.point_rules where action = 'content_withheld' and is_active;
  perform public.ensure(v_rule_id is not null, 'Falta la regla activa content_withheld.');

  insert into public.point_events (user_id, point_rule_id, reference_type, reference_id, points, idempotency_key)
  values (p_user_id, v_rule_id, p_reference_type, p_reference_id, -v_net_points,
          public.point_event_key('content_withheld', p_reference_type, p_reference_id, p_moderation_action_id::text));
end;
$$;

-- Al restaurar contenido: devuelve lo retirado en el último ocultamiento aún no revertido.
create function public.restore_reference_points(p_reference_type text, p_reference_id text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_withheld_key text;
begin
  select e.idempotency_key into v_withheld_key
  from public.point_events e
  join public.point_rules r on r.id = e.point_rule_id
  where r.action = 'content_withheld'
    and e.reference_type = p_reference_type
    and e.reference_id = p_reference_id
    and e.reversal_of_event_id is null
  order by e.created_at desc
  limit 1;

  if v_withheld_key is not null then
    perform public.reverse_points(v_withheld_key);
  end if;
end;
$$;

-- Puntos por apoyo recibido de un miembro con antigüedad (P-01); se revierten al retirarlo.
create function public.award_support_points()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c_min_supporter_seniority constant interval := interval '7 days';
  v_support      public.post_supports := coalesce(new, old);
  v_idempotency_key text := public.point_event_key(
    'support_received', 'post', v_support.post_id::text, v_support.supporter_id::text);
  v_author_id    uuid;
begin
  if tg_op = 'DELETE' then
    perform public.reverse_points(v_idempotency_key);
    return old;
  end if;

  if exists (
    select 1 from public.memberships
    where user_id = new.supporter_id and approved_at <= now() - c_min_supporter_seniority
  ) then
    select author_id into v_author_id from public.posts where id = new.post_id;
    perform public.award_points(v_author_id, 'support_received', 'post', new.post_id::text, v_idempotency_key);
  end if;
  return new;
end;
$$;

create trigger post_supports_award_points
  after insert or delete on public.post_supports
  for each row execute function public.award_support_points();


-- =============================================================================
-- 9. Funciones que llama el cliente (RPC). Validan el rol por dentro.
--    Las lock_* son internas: bloquean la fila y validan permisos y estado.
-- =============================================================================

create function public.log_moderation_action(
  p_target_type text,
  p_target_id   text,
  p_action      text,
  p_reason      text,
  p_details     jsonb default '{}'::jsonb
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_moderation_action_id uuid;
begin
  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason, details)
  values (auth.uid(), p_target_type, p_target_id, p_action, p_reason, p_details)
  returning id into v_moderation_action_id;
  return v_moderation_action_id;
end;
$$;

-- ---- Membresías (RF-02, RF-12, P-05) ---------------------------------------

create function public.lock_membership_for_admin(p_user_id uuid)
returns public.memberships
language plpgsql security definer set search_path = ''
as $$
declare
  v_membership public.memberships;
begin
  perform public.ensure(public.is_admin(), 'Solo un administrador puede cambiar membresías.');
  perform public.ensure(p_user_id <> auth.uid(), 'No puedes cambiar tu propia membresía.');
  select * into v_membership from public.memberships where user_id = p_user_id for update;
  perform public.ensure(found, 'El miembro no existe.');
  return v_membership;
end;
$$;

create function public.activate_member(p_user_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_membership public.memberships := public.lock_membership_for_admin(p_user_id);
begin
  perform public.ensure(v_membership.status <> 'active', 'El miembro ya está activo.');

  update public.memberships
  set status        = 'active',
      status_reason = null,
      approved_by   = auth.uid(),
      approved_at   = coalesce(approved_at, now())
  where user_id = p_user_id;

  perform public.log_moderation_action('member', p_user_id::text, 'member_activated', null);
end;
$$;

create function public.suspend_member(p_user_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_membership public.memberships := public.lock_membership_for_admin(p_user_id);
begin
  perform public.ensure(v_membership.status <> 'suspended', 'El miembro ya está suspendido.');
  perform public.ensure(public.has_text(p_reason), 'Indica el motivo de la suspensión.');

  update public.memberships set status = 'suspended', status_reason = p_reason where user_id = p_user_id;
  perform public.log_moderation_action('member', p_user_id::text, 'member_suspended', p_reason);
end;
$$;

create function public.change_member_role(p_user_id uuid, p_role text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.lock_membership_for_admin(p_user_id);
  perform public.ensure(p_role in ('member', 'moderator', 'admin'), 'Rol no válido.');

  update public.memberships set role = p_role where user_id = p_user_id;
  perform public.log_moderation_action('member', p_user_id::text, 'member_role_changed', null,
                                       jsonb_build_object('role', p_role));
end;
$$;

-- ---- Publicaciones (RF-04, RF-08, RF-09) -----------------------------------

create function public.lock_post_for_moderation(p_post_id uuid, p_required_status text)
returns public.posts
language plpgsql security definer set search_path = ''
as $$
declare
  v_post public.posts;
begin
  perform public.ensure(public.is_moderator(), 'Solo moderadores o administradores pueden moderar.');
  select * into v_post from public.posts where id = p_post_id for update;
  perform public.ensure(found, 'La publicación no existe.');
  perform public.ensure(v_post.status = p_required_status,
                        format('La publicación debe estar en estado %s.', p_required_status));
  return v_post;
end;
$$;

create function public.publish_post(p_post_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_post         public.posts := public.lock_post_for_moderation(p_post_id, 'pending_review');
  v_point_action text := case v_post.kind when 'news' then 'news_approved' else 'debate_approved' end;
begin
  perform public.ensure(v_post.author_id <> auth.uid(), 'No puedes publicar tu propia publicación.');

  update public.posts
  set status = 'published', rejection_reason = null,
      published_at = coalesce(published_at, now()),
      reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_post_id;

  perform public.log_moderation_action('post', p_post_id::text, 'post_published', null);
  perform public.award_points(v_post.author_id, v_point_action, 'post', p_post_id::text,
                              public.point_event_key(v_point_action, 'post', p_post_id::text));
end;
$$;

create function public.reject_post(p_post_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.lock_post_for_moderation(p_post_id, 'pending_review');
  perform public.ensure(public.has_text(p_reason), 'Indica el motivo del rechazo.');

  update public.posts
  set status = 'rejected', rejection_reason = p_reason,
      reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_post_id;

  perform public.log_moderation_action('post', p_post_id::text, 'post_rejected', p_reason);
end;
$$;

create function public.hide_post(p_post_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_post                 public.posts := public.lock_post_for_moderation(p_post_id, 'published');
  v_moderation_action_id uuid;
begin
  perform public.ensure(public.has_text(p_reason), 'Indica el motivo.');

  update public.posts set status = 'hidden' where id = p_post_id;
  v_moderation_action_id := public.log_moderation_action('post', p_post_id::text, 'post_hidden', p_reason);
  perform public.withhold_reference_points(v_post.author_id, 'post', p_post_id::text, v_moderation_action_id);
end;
$$;

-- Igual que hide_post y además aplica la penalización por spam (P-01).
create function public.hide_post_as_spam(p_post_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_author_id uuid;
begin
  perform public.hide_post(p_post_id, p_reason);
  select author_id into v_author_id from public.posts where id = p_post_id;

  perform public.log_moderation_action('post', p_post_id::text, 'post_marked_as_spam', p_reason);
  perform public.award_points(v_author_id, 'content_hidden_as_spam', 'post', p_post_id::text,
                              public.point_event_key('content_hidden_as_spam', 'post', p_post_id::text));
end;
$$;

create function public.restore_post(p_post_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_post public.posts := public.lock_post_for_moderation(p_post_id, 'hidden');
begin
  perform public.ensure(v_post.author_id <> auth.uid(), 'No puedes restaurar tu propia publicación.');

  update public.posts set status = 'published' where id = p_post_id;
  perform public.log_moderation_action('post', p_post_id::text, 'post_restored', null);
  perform public.restore_reference_points('post', p_post_id::text);
  perform public.reverse_points(public.point_event_key('content_hidden_as_spam', 'post', p_post_id::text));
end;
$$;

-- ---- Ediciones de publicaciones ya publicadas (P-04) -----------------------

create function public.lock_pending_revision(p_revision_id uuid)
returns public.post_revisions
language plpgsql security definer set search_path = ''
as $$
declare
  v_revision public.post_revisions;
begin
  perform public.ensure(public.is_moderator(), 'Solo moderadores o administradores pueden revisar.');
  select * into v_revision from public.post_revisions where id = p_revision_id for update;
  perform public.ensure(found, 'La revisión no existe.');
  perform public.ensure(v_revision.status = 'pending_review', 'La revisión ya fue resuelta.');
  perform public.ensure(v_revision.editor_id <> auth.uid(), 'No puedes revisar tu propia edición.');
  return v_revision;
end;
$$;

create function public.approve_post_revision(p_revision_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_revision public.post_revisions := public.lock_pending_revision(p_revision_id);
begin
  update public.posts
  set title = v_revision.title, excerpt = v_revision.excerpt,
      body_markdown = v_revision.body_markdown, source_url = v_revision.source_url
  where id = v_revision.post_id;

  update public.post_revisions
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_revision_id;

  perform public.log_moderation_action('post_revision', p_revision_id::text, 'revision_approved', null);
end;
$$;

create function public.reject_post_revision(p_revision_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.lock_pending_revision(p_revision_id);
  perform public.ensure(public.has_text(p_reason), 'Indica el motivo del rechazo.');

  update public.post_revisions
  set status = 'rejected', review_reason = p_reason, reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_revision_id;

  perform public.log_moderation_action('post_revision', p_revision_id::text, 'revision_rejected', p_reason);
end;
$$;

-- ---- Comentarios (P-01, P-02) ----------------------------------------------

create function public.lock_comment_for_moderation(p_comment_id uuid)
returns public.comments
language plpgsql security definer set search_path = ''
as $$
declare
  v_comment public.comments;
begin
  perform public.ensure(public.is_moderator(), 'Solo moderadores o administradores pueden moderar.');
  select * into v_comment from public.comments where id = p_comment_id for update;
  perform public.ensure(found, 'El comentario no existe.');
  perform public.ensure(v_comment.author_id <> auth.uid(), 'No puedes moderar tu propio comentario.');
  perform public.ensure(v_comment.status <> 'deleted', 'El comentario fue borrado por su autor.');
  return v_comment;
end;
$$;

create function public.hide_comment(p_comment_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_comment              public.comments := public.lock_comment_for_moderation(p_comment_id);
  v_moderation_action_id uuid;
begin
  perform public.ensure(v_comment.status = 'visible', 'El comentario ya está oculto.');
  perform public.ensure(public.has_text(p_reason), 'Indica el motivo.');

  update public.comments set status = 'hidden' where id = p_comment_id;
  v_moderation_action_id := public.log_moderation_action('comment', p_comment_id::text, 'comment_hidden', p_reason);
  perform public.withhold_reference_points(v_comment.author_id, 'comment', p_comment_id::text, v_moderation_action_id);
end;
$$;

create function public.restore_comment(p_comment_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_comment public.comments := public.lock_comment_for_moderation(p_comment_id);
begin
  perform public.ensure(v_comment.status = 'hidden', 'El comentario ya está visible.');

  update public.comments set status = 'visible' where id = p_comment_id;
  perform public.log_moderation_action('comment', p_comment_id::text, 'comment_restored', p_reason);
  perform public.restore_reference_points('comment', p_comment_id::text);
end;
$$;

-- Destacar un comentario: moderador o autor de la publicación, nunca el propio.
create function public.highlight_comment(p_comment_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_comment     public.comments;
  v_post_author uuid;
begin
  select * into v_comment from public.comments where id = p_comment_id for update;
  perform public.ensure(found, 'El comentario no existe.');
  perform public.ensure(v_comment.status = 'visible', 'Solo se destaca un comentario visible.');
  perform public.ensure(not v_comment.is_highlighted, 'El comentario ya está destacado.');
  select author_id into v_post_author from public.posts where id = v_comment.post_id;

  perform public.ensure(
    public.is_moderator() or (public.is_active_member() and v_post_author = auth.uid()),
    'Solo un moderador o el autor de la publicación puede destacar.'
  );
  perform public.ensure(v_comment.author_id <> auth.uid(), 'No puedes destacar tu propio comentario.');

  update public.comments set is_highlighted = true, highlighted_by = auth.uid() where id = p_comment_id;
  perform public.award_points(v_comment.author_id, 'comment_highlighted', 'comment', p_comment_id::text,
                              public.point_event_key('comment_highlighted', 'comment', p_comment_id::text));
end;
$$;

-- Tres reportes abiertos de miembros distintos ocultan un comentario hasta revisión (P-02).
-- Solo cuentan los reportes posteriores a la última decisión de un moderador: si lo
-- restauró, los reportes viejos no lo vuelven a ocultar. Retira puntos como hide_comment.
create function public.auto_hide_reported_comment()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c_reports_to_auto_hide constant int := 3;
  v_last_decision_at     timestamptz;
  v_open_report_count    int;
  v_author_id            uuid;
  v_moderation_action_id uuid;
begin
  if new.comment_id is null then
    return new;
  end if;

  select max(created_at) into v_last_decision_at
  from public.moderation_actions
  where target_type = 'comment' and target_id = new.comment_id::text and moderator_id is not null;

  select count(distinct reporter_id) into v_open_report_count
  from public.reports
  where comment_id = new.comment_id and status = 'open'
    and (v_last_decision_at is null or created_at > v_last_decision_at);

  if v_open_report_count < c_reports_to_auto_hide then
    return new;
  end if;

  update public.comments set status = 'hidden'
  where id = new.comment_id and status = 'visible'
  returning author_id into v_author_id;

  if found then
    insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
    values (null, 'comment', new.comment_id::text, 'comment_hidden', 'Ocultado automáticamente por 3 reportes')
    returning id into v_moderation_action_id;
    perform public.withhold_reference_points(v_author_id, 'comment', new.comment_id::text, v_moderation_action_id);
  end if;
  return new;
end;
$$;

create trigger reports_auto_hide_comment
  after insert on public.reports
  for each row execute function public.auto_hide_reported_comment();

-- ---- Reportes (RF-08, P-01) ------------------------------------------------

create function public.lock_open_report(p_report_id uuid)
returns public.reports
language plpgsql security definer set search_path = ''
as $$
declare
  v_report public.reports;
begin
  perform public.ensure(public.is_moderator(), 'Solo moderadores o administradores pueden resolver reportes.');
  select * into v_report from public.reports where id = p_report_id for update;
  perform public.ensure(found, 'El reporte no existe.');
  perform public.ensure(v_report.status = 'open', 'El reporte ya fue resuelto.');
  perform public.ensure(v_report.reporter_id <> auth.uid(), 'No puedes resolver tu propio reporte.');
  return v_report;
end;
$$;

create function public.accept_report(p_report_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_report public.reports := public.lock_open_report(p_report_id);
begin
  update public.reports set status = 'accepted', resolved_by = auth.uid(), resolved_at = now()
  where id = p_report_id;

  perform public.log_moderation_action('report', p_report_id::text, 'report_accepted', null);
  perform public.award_points(v_report.reporter_id, 'report_confirmed', 'report', p_report_id::text,
                              public.point_event_key('report_confirmed', 'report', p_report_id::text));
end;
$$;

create function public.dismiss_report(p_report_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.lock_open_report(p_report_id);

  update public.reports set status = 'dismissed', resolved_by = auth.uid(), resolved_at = now()
  where id = p_report_id;

  perform public.log_moderation_action('report', p_report_id::text, 'report_dismissed', null);
end;
$$;

-- ---- Ranking (RF-11) -------------------------------------------------------

-- Ranking público mensual ('month', mes calendario en hora de Bolivia) o histórico ('all').
create function public.get_leaderboard(p_period text default 'all', p_limit int default 50)
returns table (user_id uuid, username text, display_name text, avatar_path text, points bigint)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  c_max_limit constant int := 100;
begin
  perform public.ensure(p_period in ('all', 'month'), 'Periodo no válido: usa all o month.');

  return query
  select p.user_id, p.username, p.display_name, p.avatar_path, sum(e.points)::bigint as points
  from public.point_events e
  join public.profiles p on p.user_id = e.user_id
  where p_period = 'all'
     or date_trunc('month', e.created_at at time zone 'America/La_Paz')
      = date_trunc('month', now() at time zone 'America/La_Paz')
  group by p.user_id, p.username, p.display_name, p.avatar_path
  having sum(e.points) > 0
  order by sum(e.points) desc, p.username
  limit least(greatest(p_limit, 1), c_max_limit);
end;
$$;


-- =============================================================================
-- 10. RLS y permisos. Políticas: <tabla>_<operación>_<quién>.
-- =============================================================================

alter table public.profiles           enable row level security;
alter table public.memberships        enable row level security;
alter table public.categories         enable row level security;
alter table public.tags               enable row level security;
alter table public.posts              enable row level security;
alter table public.post_revisions     enable row level security;
alter table public.post_tags          enable row level security;
alter table public.comments           enable row level security;
alter table public.post_supports      enable row level security;
alter table public.reports            enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.point_rules        enable row level security;
alter table public.point_events       enable row level security;
alter table public.levels             enable row level security;
alter table public.badges             enable row level security;
alter table public.user_badges        enable row level security;

-- Perfiles: públicos para leer; cada quien crea y edita el suyo.
create policy profiles_select_public on public.profiles for select using (true);
create policy profiles_insert_own    on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy profiles_update_own    on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Membresía: cada quien ve la suya; moderadores ven todas. Escritura solo por funciones.
create policy memberships_select_own_or_moderator on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());

-- Catálogos: lectura pública; los gestiona un admin.
create policy categories_select_public on public.categories for select using (is_active or public.is_admin());
create policy categories_all_admin     on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy tags_select_public on public.tags for select using (true);
create policy tags_all_admin     on public.tags for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Publicaciones: el público ve lo publicado; el autor, lo suyo; moderadores, todo.
create policy posts_select_visible on public.posts for select
  using (status = 'published' or author_id = auth.uid() or public.is_moderator());
create policy posts_insert_own_draft on public.posts for insert to authenticated
  with check (author_id = auth.uid() and public.is_active_member() and status in ('draft', 'pending_review'));
create policy posts_update_own_unpublished on public.posts for update to authenticated
  using (author_id = auth.uid() and status in ('draft', 'pending_review', 'rejected'))
  with check (author_id = auth.uid() and public.is_active_member() and status in ('draft', 'pending_review'));
create policy posts_delete_own_unpublished on public.posts for delete to authenticated
  using (author_id = auth.uid() and status in ('draft', 'rejected'));

create policy post_revisions_select_own_or_moderator on public.post_revisions for select to authenticated
  using (editor_id = auth.uid() or public.is_moderator());
create policy post_revisions_insert_own on public.post_revisions for insert to authenticated
  with check (
    editor_id = auth.uid() and status = 'pending_review' and public.is_active_member()
    and public.is_own_post(post_id) and public.is_post_published(post_id)
  );

-- Etiquetas de una publicación: se ven si se ve la publicación (respeta la RLS de posts).
create policy post_tags_select_visible on public.post_tags for select
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy post_tags_all_own_unpublished on public.post_tags for all to authenticated
  using (exists (select 1 from public.posts p
                 where p.id = post_id and p.author_id = auth.uid()
                   and p.status in ('draft', 'pending_review', 'rejected')))
  with check (exists (select 1 from public.posts p
                      where p.id = post_id and p.author_id = auth.uid()
                        and p.status in ('draft', 'pending_review', 'rejected')));

-- Comentarios: visibles o "eliminado" en publicaciones publicadas.
create policy comments_select_visible on public.comments for select
  using (
    public.is_moderator()
    or author_id = auth.uid()
    or (status in ('visible', 'deleted') and public.is_post_published(post_id))
  );
create policy comments_insert_active_member on public.comments for insert to authenticated
  with check (
    author_id = auth.uid() and status = 'visible' and not is_highlighted
    and public.is_active_member() and public.is_post_published(post_id)
  );
create policy comments_update_own on public.comments for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

-- Apoyos: cada quien ve y gestiona los suyos; el total es público en posts.support_count.
-- Solo se retira un apoyo de algo publicado: si estuviera oculto, su punto ya se
-- descontó al ocultarlo y retirarlo lo descontaría dos veces.
create policy post_supports_select_own on public.post_supports for select to authenticated
  using (supporter_id = auth.uid());
create policy post_supports_insert_active_member on public.post_supports for insert to authenticated
  with check (supporter_id = auth.uid() and public.is_active_member() and public.is_post_published(post_id));
create policy post_supports_delete_own_published on public.post_supports for delete to authenticated
  using (supporter_id = auth.uid() and public.is_post_published(post_id));

-- Reportes: el autor del reporte y los moderadores. Nadie reporta su propio contenido.
create policy reports_select_own_or_moderator on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_moderator());
create policy reports_insert_active_member on public.reports for insert to authenticated
  with check (
    reporter_id = auth.uid() and status = 'open' and public.is_active_member()
    and not public.is_own_post(post_id) and not public.is_own_comment(comment_id)
  );

create policy moderation_actions_select_moderator on public.moderation_actions for select to authenticated
  using (public.is_moderator());

-- Gamificación: reglas, niveles e insignias públicas; eventos propios o auditoría.
create policy point_rules_select_public on public.point_rules for select using (true);
create policy point_rules_insert_admin  on public.point_rules for insert to authenticated with check (public.is_admin());
create policy point_rules_update_admin  on public.point_rules for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy point_events_select_own_or_moderator on public.point_events for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());
create policy levels_select_public      on public.levels      for select using (true);
create policy badges_select_public      on public.badges      for select using (true);
create policy user_badges_select_public on public.user_badges for select using (true);

-- Las funciones internas no se exponen como RPC.
revoke execute on function
  public.has_reached_daily_cap(uuid, public.point_rules),
  public.has_reached_reference_cap(public.point_rules, text, text),
  public.award_points(uuid, text, text, text, text),
  public.reverse_points(text),
  public.withhold_reference_points(uuid, text, text, uuid),
  public.restore_reference_points(text, text),
  public.log_moderation_action(text, text, text, text, jsonb),
  public.lock_membership_for_admin(uuid),
  public.lock_post_for_moderation(uuid, text),
  public.lock_pending_revision(uuid),
  public.lock_comment_for_moderation(uuid),
  public.lock_open_report(uuid)
from public, anon, authenticated;

-- Defensa extra: los clientes no pueden cambiar directamente membresías ni puntos.
revoke insert, update, delete on public.memberships, public.point_events, public.moderation_actions
from anon, authenticated;


-- =============================================================================
-- Datos iniciales (propuestas P-01 y P-03; ajustar antes de aplicar)
-- =============================================================================

insert into public.categories (name, slug, sort_order) values
  ('Investigación y modelos',       'investigacion-y-modelos',  1),
  ('Industria y empresas',          'industria-y-empresas',     2),
  ('Herramientas y productos',      'herramientas-y-productos', 3),
  ('Política y regulación',         'politica-y-regulacion',    4),
  ('IA en Bolivia y Latinoamérica', 'ia-bolivia-latam',         5),
  ('Educación y eventos',           'educacion-y-eventos',      6),
  ('Ética y sociedad',              'etica-y-sociedad',         7);

insert into public.point_rules (action, points, daily_cap, per_reference_cap) values
  ('news_approved',          10,    3, null),
  ('debate_approved',         8,    2, null),
  ('support_received',        1,   10,   20),
  ('comment_highlighted',     3,    5, null),
  ('report_confirmed',        2,    3, null),
  ('content_hidden_as_spam', -5, null, null),
  -- Regla técnica: descuentos al ocultar contenido. El monto real va en cada evento.
  ('content_withheld',        0, null, null);

insert into public.levels (code, name, minimum_points) values
  ('nuevo',       'Nuevo',          0),
  ('colaborador', 'Colaborador',   50),
  ('activo',      'Activo',       150),
  ('referente',   'Referente',    400),
  ('mentor',      'Mentor',      1000);

insert into public.badges (code, name, description, award_criteria) values
  ('primera-noticia', 'Primera noticia', 'Primera noticia aprobada.',  '{"action": "news_approved", "count": 1}'),
  ('corresponsal',    'Corresponsal',    '10 noticias aprobadas.',     '{"action": "news_approved", "count": 10}'),
  ('debatiente',      'Debatiente',      '5 debates aprobados.',       '{"action": "debate_approved", "count": 5}'),
  ('buen-comentario', 'Buen comentario', '5 comentarios destacados.',  '{"action": "comment_highlighted", "count": 5}'),
  ('guardian',        'Guardián',        '5 reportes confirmados.',    '{"action": "report_confirmed", "count": 5}');
