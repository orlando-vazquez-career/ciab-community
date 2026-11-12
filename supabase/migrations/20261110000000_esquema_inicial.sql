-- =============================================================================
-- CIAB Community — esquema inicial (BORRADOR 0.3 para revisión por PR)
--
-- Contenido:
--   1. Identidad y membresía      5. Reportes y moderación
--   2. Catálogos                  6. Gamificación (libro mayor de puntos)
--   3. Publicaciones              7. Funciones privilegiadas (moderación)
--   4. Comentarios y apoyos       8. RLS, permisos y datos iniciales
--
-- Reglas de diseño:
--   - Supabase Auth (auth.users) es dueño de la identidad.
--   - Toda tabla de `public` tiene RLS. El cliente solo escribe lo suyo;
--     las transiciones privilegiadas pasan por funciones SECURITY DEFINER.
--   - Los puntos son un libro mayor de solo-agregar: nunca se edita un saldo.
--   - Fuera de este archivo: Storage (avatares/imágenes), insignias
--     automáticas y difusión social (fase 2).
-- =============================================================================


-- =============================================================================
-- 1. Identidad y membresía
-- =============================================================================

create table public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique
                 check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null
                 check (char_length(display_name) between 1 and 60),
  bio          text check (char_length(bio) <= 500),
  avatar_path  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.member_access (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending', 'active', 'suspended')),
  role          text not null default 'member'
                  check (role in ('member', 'moderator', 'admin')),
  status_reason text,
  approved_by   uuid references auth.users (id),
  approved_at   timestamptz,
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
  body_md          text not null default '' check (char_length(body_md) <= 20000),
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

  constraint news_requires_source
    check (kind <> 'news' or source_url is not null),
  constraint published_requires_date
    check (status not in ('published', 'hidden') or published_at is not null)
);

-- Edición de una publicación ya publicada (P-04): queda pendiente de revisión.
create table public.post_revisions (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.posts (id) on delete cascade,
  editor_id     uuid not null references public.profiles (user_id),
  title         text not null check (char_length(title) between 5 and 200),
  excerpt       text check (char_length(excerpt) <= 500),
  body_md       text not null default '' check (char_length(body_md) <= 20000),
  source_url    text check (source_url ~ '^https://'),
  status        text not null default 'pending_review'
                  check (status in ('pending_review', 'approved', 'rejected')),
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
  status         text not null default 'visible'
                   check (status in ('visible', 'hidden', 'deleted')),
  is_highlighted boolean not null default false,
  highlighted_by uuid references auth.users (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint body_length
    check (status = 'deleted' or char_length(body) between 1 and 5000)
);

-- Un apoyo por miembro y publicación (RF-07).
create table public.post_votes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (user_id),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);


-- =============================================================================
-- 5. Reportes y moderación
-- =============================================================================

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (user_id),
  post_id     uuid references public.posts (id) on delete cascade,
  comment_id  uuid references public.comments (id) on delete cascade,
  reason      text not null
                check (reason in ('spam', 'fuente_falsa', 'ofensivo', 'fuera_de_tema', 'otro')),
  details     text check (char_length(details) <= 1000),
  status      text not null default 'open'
                check (status in ('open', 'accepted', 'dismissed')),
  resolved_by uuid references auth.users (id),
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),

  constraint exactly_one_target check (num_nonnulls(post_id, comment_id) = 1)
);

create unique index reports_one_per_reporter_post
  on public.reports (reporter_id, post_id) where post_id is not null;
create unique index reports_one_per_reporter_comment
  on public.reports (reporter_id, comment_id) where comment_id is not null;

-- Auditoría de solo-agregar. moderator_id nulo = acción automática del sistema.
create table public.moderation_actions (
  id           uuid primary key default gen_random_uuid(),
  moderator_id uuid references auth.users (id),
  target_type  text not null check (target_type in ('post', 'post_revision', 'comment', 'report', 'member')),
  target_id    text not null,
  action       text not null,
  reason       text,
  created_at   timestamptz not null default now()
);


-- =============================================================================
-- 6. Gamificación
-- =============================================================================

-- Una regla usada no se edita: se crea otra versión y se desactiva la anterior.
create table public.point_rules (
  id             bigint generated always as identity primary key,
  action         text not null,
  version        int not null default 1,
  points         int not null,
  daily_cap      int check (daily_cap > 0),
  per_target_cap int check (per_target_cap > 0),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (action, version)
);

create unique index point_rules_one_active_version
  on public.point_rules (action) where is_active;

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
  id          bigint generated always as identity primary key,
  code        text not null unique,
  name        text not null,
  description text not null,
  rule_config jsonb not null default '{}'::jsonb,
  is_active   boolean not null default true
);

create table public.user_badges (
  user_id      uuid   not null references public.profiles (user_id),
  badge_id     bigint not null references public.badges (id),
  rule_version int    not null default 1,
  awarded_at   timestamptz not null default now(),
  primary key (user_id, badge_id)
);


-- =============================================================================
-- Índices
-- =============================================================================

create index posts_feed_idx        on public.posts (status, published_at desc, id desc);
create index posts_category_idx    on public.posts (category_id, status, published_at desc);
create index posts_author_idx      on public.posts (author_id, created_at desc);
create index post_revisions_idx    on public.post_revisions (post_id, status);
create index comments_post_idx     on public.comments (post_id, created_at);
create index comments_author_idx   on public.comments (author_id, created_at desc);
create index reports_open_idx      on public.reports (status, created_at) where status = 'open';
create index point_events_user_idx on public.point_events (user_id, created_at desc);
create index point_events_ref_idx  on public.point_events (reference_type, reference_id);


-- =============================================================================
-- Funciones auxiliares de identidad
-- =============================================================================

create function public.is_active_member()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.member_access
    where user_id = auth.uid() and status = 'active'
  );
$$;

create function public.is_moderator()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.member_access
    where user_id = auth.uid() and status = 'active' and role in ('moderator', 'admin')
  );
$$;

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.member_access
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

create function public.require(p_condition boolean, p_message text)
returns void
language plpgsql immutable set search_path = ''
as $$
begin
  if not coalesce(p_condition, false) then
    raise exception '%', p_message using errcode = 'P0001';
  end if;
end;
$$;

create function public.bolivia_today()
returns date
language sql stable set search_path = ''
as $$
  select (now() at time zone 'America/La_Paz')::date;
$$;


-- =============================================================================
-- Triggers de integridad
-- =============================================================================

create function public.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch       before update on public.profiles      for each row execute function public.touch_updated_at();
create trigger member_access_touch  before update on public.member_access for each row execute function public.touch_updated_at();
create trigger posts_touch          before update on public.posts         for each row execute function public.touch_updated_at();
create trigger comments_touch       before update on public.comments      for each row execute function public.touch_updated_at();

-- Toda cuenta nueva empieza como miembro pendiente (RF-02).
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.member_access (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- El autor no puede tocar campos de revisión ni contadores.
create function public.guard_post_client_update()
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

create trigger posts_guard
  before update on public.posts
  for each row execute function public.guard_post_client_update();

-- Respuestas de un solo nivel y en la misma publicación (RF-06).
create function public.check_comment_parent()
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
  perform public.require(v_parent.post_id = new.post_id, 'La respuesta debe pertenecer a la misma publicación.');
  perform public.require(v_parent.parent_id is null, 'Solo se permite un nivel de respuestas.');
  return new;
end;
$$;

create trigger comments_parent_check
  before insert on public.comments
  for each row execute function public.check_comment_parent();

-- El autor solo edita el texto durante 15 minutos o lo borra (RF-06).
create function public.guard_comment_client_update()
returns trigger
language plpgsql set search_path = ''
as $$
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
    perform public.require(old.status = 'visible', 'Solo se puede borrar un comentario visible.');
    new.body := '';
    return new;
  end if;

  perform public.require(new.status = old.status, 'El estado del comentario lo cambia un moderador.');
  perform public.require(
    new.body = old.body or old.created_at > now() - interval '15 minutes',
    'El comentario solo se puede editar durante 15 minutos.'
  );
  return new;
end;
$$;

create trigger comments_guard
  before update on public.comments
  for each row execute function public.guard_comment_client_update();

-- Límites antiabuso (RNF-05).
create function public.enforce_post_rate_limit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_today_count int;
begin
  select count(*) into v_today_count
  from public.posts
  where author_id = new.author_id
    and (created_at at time zone 'America/La_Paz')::date = public.bolivia_today();

  perform public.require(v_today_count < 5, 'Límite de 5 publicaciones por día alcanzado.');
  return new;
end;
$$;

create function public.enforce_comment_rate_limit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_last_hour_count int;
begin
  select count(*) into v_last_hour_count
  from public.comments
  where author_id = new.author_id
    and created_at > now() - interval '1 hour';

  perform public.require(v_last_hour_count < 10, 'Límite de 10 comentarios por hora alcanzado.');
  return new;
end;
$$;

create function public.enforce_report_rate_limit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_today_count int;
begin
  select count(*) into v_today_count
  from public.reports
  where reporter_id = new.reporter_id
    and (created_at at time zone 'America/La_Paz')::date = public.bolivia_today();

  perform public.require(v_today_count < 10, 'Límite de 10 reportes por día alcanzado.');
  return new;
end;
$$;

create trigger posts_rate_limit    before insert on public.posts    for each row execute function public.enforce_post_rate_limit();
create trigger comments_rate_limit before insert on public.comments for each row execute function public.enforce_comment_rate_limit();
create trigger reports_rate_limit  before insert on public.reports  for each row execute function public.enforce_report_rate_limit();


-- =============================================================================
-- Libro mayor de puntos
-- =============================================================================

-- Otorga puntos según la regla activa, respetando topes e idempotencia.
create function public.award_points(
  p_user_id        uuid,
  p_action         text,
  p_reference_type text,
  p_reference_id   text,
  p_key            text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_rule        public.point_rules;
  v_today_count int;
  v_target_net  int;
begin
  select * into v_rule from public.point_rules where action = p_action and is_active;
  if not found or exists (select 1 from public.point_events where idempotency_key = p_key) then
    return;
  end if;

  if v_rule.daily_cap is not null then
    select count(*) into v_today_count
    from public.point_events e
    join public.point_rules r on r.id = e.point_rule_id
    where e.user_id = p_user_id
      and r.action = p_action
      and e.reversal_of_event_id is null
      and (e.created_at at time zone 'America/La_Paz')::date = public.bolivia_today();
    if v_today_count >= v_rule.daily_cap then
      return;
    end if;
  end if;

  if v_rule.per_target_cap is not null then
    select coalesce(sum(sign(e.points)), 0) into v_target_net
    from public.point_events e
    join public.point_rules r on r.id = e.point_rule_id
    where r.action = p_action
      and e.reference_type = p_reference_type
      and e.reference_id = p_reference_id;
    if v_target_net >= v_rule.per_target_cap then
      return;
    end if;
  end if;

  insert into public.point_events (user_id, point_rule_id, reference_type, reference_id, points, idempotency_key)
  values (p_user_id, v_rule.id, p_reference_type, p_reference_id, v_rule.points, p_key);
end;
$$;

-- Compensa un evento concreto (p. ej. un apoyo retirado).
create function public.reverse_points(p_key text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_event public.point_events;
begin
  select * into v_event from public.point_events where idempotency_key = p_key;
  if not found then
    return;
  end if;

  insert into public.point_events
    (user_id, point_rule_id, reference_type, reference_id, points, idempotency_key, reversal_of_event_id)
  values
    (v_event.user_id, v_event.point_rule_id, v_event.reference_type, v_event.reference_id,
     -v_event.points, 'reversal:' || p_key, v_event.id)
  on conflict (idempotency_key) do nothing;
end;
$$;

-- Al ocultar contenido: retira el saldo positivo neto que ese contenido le dio a su autor.
-- El descuento se registra con la regla técnica 'content_withheld' (no con la regla
-- de la acción original) para que no cuente en los topes diarios ni por publicación.
create function public.withhold_reference_points(
  p_user_id        uuid,
  p_reference_type text,
  p_reference_id   text,
  p_action_id      uuid
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_net     int;
  v_rule_id bigint;
begin
  select coalesce(sum(e.points), 0) into v_net
  from public.point_events e
  join public.point_rules r on r.id = e.point_rule_id
  where e.user_id = p_user_id
    and e.reference_type = p_reference_type
    and e.reference_id = p_reference_id
    and r.action <> 'content_hidden_spam';

  if v_net > 0 then
    select id into v_rule_id from public.point_rules where action = 'content_withheld' and is_active;
    perform public.require(v_rule_id is not null, 'Falta la regla activa content_withheld.');
    insert into public.point_events (user_id, point_rule_id, reference_type, reference_id, points, idempotency_key)
    values (p_user_id, v_rule_id, p_reference_type, p_reference_id, -v_net, 'withhold:' || p_action_id);
  end if;
end;
$$;

-- Al restaurar contenido: devuelve lo retirado en el último ocultamiento.
create function public.restore_reference_points(p_reference_type text, p_reference_id text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_withheld public.point_events;
begin
  select * into v_withheld
  from public.point_events
  where reference_type = p_reference_type
    and reference_id = p_reference_id
    and idempotency_key like 'withhold:%'
  order by created_at desc
  limit 1;

  if found then
    insert into public.point_events
      (user_id, point_rule_id, reference_type, reference_id, points, idempotency_key, reversal_of_event_id)
    values
      (v_withheld.user_id, v_withheld.point_rule_id, p_reference_type, p_reference_id,
       -v_withheld.points, 'restore:' || v_withheld.id, v_withheld.id)
    on conflict (idempotency_key) do nothing;
  end if;

  perform public.reverse_points('spam:' || p_reference_type || ':' || p_reference_id);
end;
$$;

-- Contador de apoyos y puntos por apoyo recibido (P-01).
create function public.on_post_vote_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_vote      public.post_votes := coalesce(new, old);
  v_author_id uuid;
  v_key       text;
begin
  select author_id into v_author_id from public.posts where id = v_vote.post_id;
  v_key := 'vote:' || v_vote.post_id || ':' || v_vote.user_id;

  if tg_op = 'INSERT' then
    update public.posts set support_count = support_count + 1 where id = new.post_id;
    if exists (
      select 1 from public.member_access
      where user_id = new.user_id and approved_at <= now() - interval '7 days'
    ) then
      perform public.award_points(v_author_id, 'support_received', 'post', new.post_id::text, v_key);
    end if;
    return new;
  end if;

  update public.posts set support_count = support_count - 1 where id = old.post_id;
  perform public.reverse_points(v_key);
  return old;
end;
$$;

create trigger post_votes_change
  after insert or delete on public.post_votes
  for each row execute function public.on_post_vote_change();

create function public.prevent_self_vote()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require(
    not exists (select 1 from public.posts where id = new.post_id and author_id = new.user_id),
    'No puedes apoyar tu propia publicación.'
  );
  return new;
end;
$$;

create trigger post_votes_no_self
  before insert on public.post_votes
  for each row execute function public.prevent_self_vote();


-- =============================================================================
-- 7. Funciones privilegiadas (las llama el cliente; validan el rol por dentro)
-- =============================================================================

create function public.log_moderation(
  p_target_type text,
  p_target_id   text,
  p_action      text,
  p_reason      text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (auth.uid(), p_target_type, p_target_id, p_action, p_reason)
  returning id into v_id;
  return v_id;
end;
$$;

-- Aprobar, suspender o reactivar miembros (RF-02, P-05).
create function public.set_member_status(p_user_id uuid, p_status text, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require(public.is_admin(), 'Solo un administrador puede cambiar membresías.');
  perform public.require(p_user_id <> auth.uid(), 'No puedes cambiar tu propia membresía.');
  perform public.require(p_status in ('active', 'suspended'), 'Estado no válido.');
  perform public.require(p_status = 'active' or p_reason is not null, 'Indica el motivo de la suspensión.');

  update public.member_access
  set status        = p_status,
      status_reason = p_reason,
      approved_by   = case when p_status = 'active' then auth.uid() else approved_by end,
      approved_at   = case when p_status = 'active' then coalesce(approved_at, now()) else approved_at end
  where user_id = p_user_id;
  perform public.require(found, 'El miembro no existe.');

  perform public.log_moderation('member', p_user_id::text, 'status:' || p_status, p_reason);
end;
$$;

create function public.set_member_role(p_user_id uuid, p_role text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require(public.is_admin(), 'Solo un administrador puede cambiar roles.');
  perform public.require(p_user_id <> auth.uid(), 'No puedes cambiar tu propio rol.');
  perform public.require(p_role in ('member', 'moderator', 'admin'), 'Rol no válido.');

  update public.member_access set role = p_role where user_id = p_user_id;
  perform public.require(found, 'El miembro no existe.');
  perform public.log_moderation('member', p_user_id::text, 'role:' || p_role, null);
end;
$$;

-- Publicar, rechazar, ocultar o restaurar una publicación (RF-04, RF-08, RF-09).
create function public.moderate_post(
  p_post_id  uuid,
  p_decision text,
  p_reason   text default null,
  p_is_spam  boolean default false
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_post      public.posts;
  v_action_id uuid;
begin
  perform public.require(public.is_moderator(), 'Solo moderadores o administradores pueden moderar.');
  select * into v_post from public.posts where id = p_post_id for update;
  perform public.require(found, 'La publicación no existe.');
  perform public.require(
    p_decision not in ('publish', 'restore') or v_post.author_id <> auth.uid(),
    'No puedes publicar ni restaurar tu propia publicación.'
  );

  if p_decision = 'publish' then
    perform public.require(v_post.status = 'pending_review', 'Solo se publica lo que está en revisión.');
    update public.posts
    set status = 'published', rejection_reason = null,
        published_at = coalesce(published_at, now()),
        reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_post_id;
    perform public.award_points(
      v_post.author_id,
      case v_post.kind when 'news' then 'news_approved' else 'debate_approved' end,
      'post', p_post_id::text, 'post_approved:' || p_post_id
    );

  elsif p_decision = 'reject' then
    perform public.require(v_post.status = 'pending_review', 'Solo se rechaza lo que está en revisión.');
    perform public.require(p_reason is not null, 'Indica el motivo del rechazo.');
    update public.posts
    set status = 'rejected', rejection_reason = p_reason,
        reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_post_id;

  elsif p_decision = 'hide' then
    perform public.require(v_post.status = 'published', 'Solo se oculta lo publicado.');
    perform public.require(p_reason is not null, 'Indica el motivo.');
    update public.posts set status = 'hidden' where id = p_post_id;

  elsif p_decision = 'restore' then
    perform public.require(v_post.status = 'hidden', 'Solo se restaura lo oculto.');
    update public.posts set status = 'published' where id = p_post_id;

  else
    raise exception 'Decisión no válida: %', p_decision;
  end if;

  v_action_id := public.log_moderation('post', p_post_id::text, p_decision, p_reason);

  if p_decision = 'hide' then
    perform public.withhold_reference_points(v_post.author_id, 'post', p_post_id::text, v_action_id);
    if p_is_spam then
      perform public.award_points(v_post.author_id, 'content_hidden_spam', 'post', p_post_id::text,
                                  'spam:post:' || p_post_id);
    end if;
  elsif p_decision = 'restore' then
    perform public.restore_reference_points('post', p_post_id::text);
  end if;
end;
$$;

-- Aprobar o rechazar la edición de una publicación ya publicada (P-04).
create function public.review_post_revision(p_revision_id uuid, p_approve boolean, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_revision public.post_revisions;
begin
  perform public.require(public.is_moderator(), 'Solo moderadores o administradores pueden revisar.');
  select * into v_revision from public.post_revisions where id = p_revision_id for update;
  perform public.require(found, 'La revisión no existe.');
  perform public.require(v_revision.status = 'pending_review', 'La revisión ya fue resuelta.');
  perform public.require(v_revision.editor_id <> auth.uid(), 'No puedes revisar tu propia edición.');
  perform public.require(p_approve or p_reason is not null, 'Indica el motivo del rechazo.');

  if p_approve then
    update public.posts
    set title = v_revision.title, excerpt = v_revision.excerpt,
        body_md = v_revision.body_md, source_url = v_revision.source_url
    where id = v_revision.post_id;
  end if;

  update public.post_revisions
  set status = case when p_approve then 'approved' else 'rejected' end,
      review_reason = p_reason, reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_revision_id;

  perform public.log_moderation('post_revision', p_revision_id::text,
                                case when p_approve then 'approve' else 'reject' end, p_reason);
end;
$$;

-- Ocultar o restaurar un comentario (P-02).
create function public.set_comment_status(p_comment_id uuid, p_status text, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_comment   public.comments;
  v_action_id uuid;
begin
  perform public.require(public.is_moderator(), 'Solo moderadores o administradores pueden moderar.');
  perform public.require(p_status in ('visible', 'hidden'), 'Estado no válido.');
  select * into v_comment from public.comments where id = p_comment_id for update;
  perform public.require(found, 'El comentario no existe.');
  perform public.require(v_comment.author_id <> auth.uid(), 'No puedes moderar tu propio comentario.');
  perform public.require(v_comment.status <> 'deleted', 'El comentario fue borrado por su autor.');
  perform public.require(v_comment.status <> p_status, 'El comentario ya tiene ese estado.');

  update public.comments set status = p_status where id = p_comment_id;
  v_action_id := public.log_moderation('comment', p_comment_id::text, 'status:' || p_status, p_reason);

  if p_status = 'hidden' then
    perform public.withhold_reference_points(v_comment.author_id, 'comment', p_comment_id::text, v_action_id);
  else
    perform public.restore_reference_points('comment', p_comment_id::text);
  end if;
end;
$$;

-- Destacar un comentario: moderador o autor de la publicación, nunca el propio (P-01).
create function public.highlight_comment(p_comment_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_comment     public.comments;
  v_post_author uuid;
begin
  select * into v_comment from public.comments where id = p_comment_id for update;
  perform public.require(found, 'El comentario no existe.');
  perform public.require(v_comment.status = 'visible', 'Solo se destaca un comentario visible.');
  select author_id into v_post_author from public.posts where id = v_comment.post_id;

  perform public.require(
    public.is_moderator() or (public.is_active_member() and v_post_author = auth.uid()),
    'Solo un moderador o el autor de la publicación puede destacar.'
  );
  perform public.require(v_comment.author_id <> auth.uid(), 'No puedes destacar tu propio comentario.');

  update public.comments
  set is_highlighted = true, highlighted_by = auth.uid()
  where id = p_comment_id;

  perform public.award_points(v_comment.author_id, 'comment_highlighted', 'comment',
                              p_comment_id::text, 'highlight:' || p_comment_id);
end;
$$;

-- Resolver un reporte; si se confirma, el reportante suma puntos (P-01).
create function public.resolve_report(p_report_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_report public.reports;
begin
  perform public.require(public.is_moderator(), 'Solo moderadores o administradores pueden resolver reportes.');
  select * into v_report from public.reports where id = p_report_id for update;
  perform public.require(found, 'El reporte no existe.');
  perform public.require(v_report.status = 'open', 'El reporte ya fue resuelto.');
  perform public.require(v_report.reporter_id <> auth.uid(), 'No puedes resolver tu propio reporte.');

  update public.reports
  set status = case when p_accept then 'accepted' else 'dismissed' end,
      resolved_by = auth.uid(), resolved_at = now()
  where id = p_report_id;

  perform public.log_moderation('report', p_report_id::text,
                                case when p_accept then 'accept' else 'dismiss' end, null);

  if p_accept then
    perform public.award_points(v_report.reporter_id, 'report_confirmed', 'report',
                                p_report_id::text, 'report:' || p_report_id);
  end if;
end;
$$;

-- Tres reportes abiertos de miembros distintos ocultan un comentario hasta revisión (P-02).
-- Solo cuentan los reportes posteriores a la última decisión de un moderador sobre ese
-- comentario: si un moderador lo restauró, los reportes viejos no lo vuelven a ocultar.
-- El ocultamiento automático retira los puntos igual que uno manual.
create function public.auto_hide_reported_comment()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_open_reports  int;
  v_last_decision timestamptz;
  v_author_id     uuid;
  v_action_id     uuid;
begin
  if new.comment_id is null then
    return new;
  end if;

  select max(created_at) into v_last_decision
  from public.moderation_actions
  where target_type = 'comment' and target_id = new.comment_id::text and moderator_id is not null;

  select count(distinct reporter_id) into v_open_reports
  from public.reports
  where comment_id = new.comment_id and status = 'open'
    and (v_last_decision is null or created_at > v_last_decision);

  if v_open_reports >= 3 then
    update public.comments set status = 'hidden'
    where id = new.comment_id and status = 'visible'
    returning author_id into v_author_id;
    if found then
      insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
      values (null, 'comment', new.comment_id::text, 'status:hidden', 'Ocultado automáticamente por 3 reportes')
      returning id into v_action_id;
      perform public.withhold_reference_points(v_author_id, 'comment', new.comment_id::text, v_action_id);
    end if;
  end if;
  return new;
end;
$$;

-- Máximo 5 etiquetas por publicación (RF-04).
create function public.enforce_post_tag_limit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require(
    (select count(*) from public.post_tags where post_id = new.post_id) < 5,
    'Una publicación admite hasta 5 etiquetas.'
  );
  return new;
end;
$$;

create trigger post_tags_limit
  before insert on public.post_tags
  for each row execute function public.enforce_post_tag_limit();

-- Una regla de puntos usada no se edita: el admin solo puede activarla o desactivarla.
create function public.guard_point_rule_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  perform public.require(
    new.action = old.action and new.version = old.version and new.points = old.points
    and new.daily_cap is not distinct from old.daily_cap
    and new.per_target_cap is not distinct from old.per_target_cap,
    'Una regla no se edita: crea una versión nueva y desactiva la anterior.'
  );
  return new;
end;
$$;

create trigger point_rules_guard
  before update on public.point_rules
  for each row execute function public.guard_point_rule_update();

create trigger reports_auto_hide
  after insert on public.reports
  for each row execute function public.auto_hide_reported_comment();

-- Ranking público mensual ('month') o histórico ('all') (RF-11).
create function public.get_leaderboard(p_period text default 'all', p_limit int default 50)
returns table (user_id uuid, username text, display_name text, avatar_path text, points bigint)
language sql stable security definer set search_path = ''
as $$
  select p.user_id, p.username, p.display_name, p.avatar_path, sum(e.points) as points
  from public.point_events e
  join public.profiles p on p.user_id = e.user_id
  where p_period = 'all'
     or (p_period = 'month'
         and date_trunc('month', e.created_at at time zone 'America/La_Paz')
           = date_trunc('month', now() at time zone 'America/La_Paz'))
  group by p.user_id, p.username, p.display_name, p.avatar_path
  having sum(e.points) > 0
  order by points desc, p.username
  limit least(greatest(p_limit, 1), 100);
$$;


-- =============================================================================
-- 8. RLS y permisos
-- =============================================================================

alter table public.profiles           enable row level security;
alter table public.member_access      enable row level security;
alter table public.categories         enable row level security;
alter table public.tags               enable row level security;
alter table public.posts              enable row level security;
alter table public.post_revisions     enable row level security;
alter table public.post_tags          enable row level security;
alter table public.comments           enable row level security;
alter table public.post_votes         enable row level security;
alter table public.reports            enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.point_rules        enable row level security;
alter table public.point_events       enable row level security;
alter table public.levels             enable row level security;
alter table public.badges             enable row level security;
alter table public.user_badges        enable row level security;

-- Perfiles: públicos para leer; cada quien crea y edita el suyo.
create policy profiles_read   on public.profiles for select using (true);
create policy profiles_insert on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Membresía: cada quien ve la suya; moderadores ven todas. Escritura solo por funciones.
create policy member_access_read on public.member_access for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());

-- Catálogos: lectura pública; los gestiona un admin.
create policy categories_read  on public.categories for select using (is_active or public.is_admin());
create policy categories_admin on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy tags_read  on public.tags for select using (true);
create policy tags_admin on public.tags for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Publicaciones: el público ve lo publicado; el autor, lo suyo; moderadores, todo.
create policy posts_read on public.posts for select
  using (status = 'published' or author_id = auth.uid() or public.is_moderator());
create policy posts_insert on public.posts for insert to authenticated
  with check (author_id = auth.uid() and public.is_active_member()
              and status in ('draft', 'pending_review'));
create policy posts_update on public.posts for update to authenticated
  using (author_id = auth.uid() and status in ('draft', 'pending_review', 'rejected'))
  with check (author_id = auth.uid() and public.is_active_member()
              and status in ('draft', 'pending_review'));
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = auth.uid() and status in ('draft', 'rejected'));

create policy post_revisions_read on public.post_revisions for select to authenticated
  using (editor_id = auth.uid() or public.is_moderator());
create policy post_revisions_insert on public.post_revisions for insert to authenticated
  with check (
    editor_id = auth.uid() and status = 'pending_review' and public.is_active_member()
    and exists (select 1 from public.posts p
                where p.id = post_id and p.author_id = auth.uid() and p.status = 'published')
  );

create policy post_tags_read on public.post_tags for select
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy post_tags_write on public.post_tags for all to authenticated
  using (exists (select 1 from public.posts p
                 where p.id = post_id and p.author_id = auth.uid()
                   and p.status in ('draft', 'pending_review', 'rejected')))
  with check (exists (select 1 from public.posts p
                      where p.id = post_id and p.author_id = auth.uid()
                        and p.status in ('draft', 'pending_review', 'rejected')));

-- Comentarios: visibles o "eliminado" en publicaciones publicadas.
create policy comments_read on public.comments for select
  using (
    public.is_moderator()
    or author_id = auth.uid()
    or (status in ('visible', 'deleted')
        and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published'))
  );
create policy comments_insert on public.comments for insert to authenticated
  with check (
    author_id = auth.uid() and status = 'visible' and not is_highlighted
    and public.is_active_member()
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
  );
create policy comments_update on public.comments for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

-- Apoyos: cada quien ve y gestiona los suyos; el total es público en posts.support_count.
create policy post_votes_read on public.post_votes for select to authenticated
  using (user_id = auth.uid());
create policy post_votes_insert on public.post_votes for insert to authenticated
  with check (
    user_id = auth.uid() and public.is_active_member()
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
  );
-- Solo se retira un apoyo de algo publicado: si estuviera oculto, su punto ya se
-- descontó al ocultarlo y retirarlo lo descontaría dos veces.
create policy post_votes_delete on public.post_votes for delete to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
  );

-- Reportes: el autor del reporte y los moderadores. Nadie reporta su propio contenido.
create policy reports_read on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_moderator());
create policy reports_insert on public.reports for insert to authenticated
  with check (
    reporter_id = auth.uid() and status = 'open' and public.is_active_member()
    and not exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
    and not exists (select 1 from public.comments c where c.id = comment_id and c.author_id = auth.uid())
  );

create policy moderation_actions_read on public.moderation_actions for select to authenticated
  using (public.is_moderator());

-- Gamificación: reglas, niveles e insignias públicas; eventos propios o auditoría.
create policy point_rules_read on public.point_rules for select using (true);
create policy point_rules_admin on public.point_rules for insert to authenticated
  with check (public.is_admin());
create policy point_rules_admin_toggle on public.point_rules for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy point_events_read on public.point_events for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());
create policy levels_read      on public.levels      for select using (true);
create policy badges_read      on public.badges      for select using (true);
create policy user_badges_read on public.user_badges for select using (true);

-- Las funciones internas no se exponen como RPC.
revoke execute on function
  public.award_points(uuid, text, text, text, text),
  public.reverse_points(text),
  public.withhold_reference_points(uuid, text, text, uuid),
  public.restore_reference_points(text, text),
  public.log_moderation(text, text, text, text)
from public, anon, authenticated;

-- Defensa extra: los clientes no pueden cambiar directamente membresías ni puntos.
revoke insert, update, delete on public.member_access, public.point_events, public.moderation_actions
from anon, authenticated;


-- =============================================================================
-- Datos iniciales (propuestas P-01 y P-03; ajustar antes de aplicar)
-- =============================================================================

insert into public.categories (name, slug, sort_order) values
  ('Investigación y modelos',         'investigacion-y-modelos', 1),
  ('Industria y empresas',            'industria-y-empresas',    2),
  ('Herramientas y productos',        'herramientas-y-productos', 3),
  ('Política y regulación',           'politica-y-regulacion',   4),
  ('IA en Bolivia y Latinoamérica',   'ia-bolivia-latam',        5),
  ('Educación y eventos',             'educacion-y-eventos',     6),
  ('Ética y sociedad',                'etica-y-sociedad',        7);

insert into public.point_rules (action, points, daily_cap, per_target_cap) values
  ('news_approved',        10,    3, null),
  ('debate_approved',       8,    2, null),
  ('support_received',      1,   10,   20),
  ('comment_highlighted',   3,    5, null),
  ('report_confirmed',      2,    3, null),
  ('content_hidden_spam',  -5, null, null),
  -- Regla técnica: descuentos al ocultar contenido. El monto real va en cada evento.
  ('content_withheld',      0, null, null);

insert into public.levels (code, name, minimum_points) values
  ('nuevo',       'Nuevo',          0),
  ('colaborador', 'Colaborador',   50),
  ('activo',      'Activo',       150),
  ('referente',   'Referente',    400),
  ('mentor',      'Mentor',      1000);

insert into public.badges (code, name, description, rule_config) values
  ('primera-noticia', 'Primera noticia', 'Primera noticia aprobada.',       '{"action": "news_approved", "count": 1}'),
  ('corresponsal',    'Corresponsal',    '10 noticias aprobadas.',          '{"action": "news_approved", "count": 10}'),
  ('debatiente',      'Debatiente',      '5 debates aprobados.',            '{"action": "debate_approved", "count": 5}'),
  ('buen-comentario', 'Buen comentario', '5 comentarios destacados.',       '{"action": "comment_highlighted", "count": 5}'),
  ('guardian',        'Guardián',        '5 reportes confirmados.',         '{"action": "report_confirmed", "count": 5}');
