-- PROPUESTA CIAB COMMUNITY — FASE 2: ESQUEMA Y RLS
-- Estado: BORRADOR PARA REVISIÓN. NO EJECUTAR NI INSTALAR COMO MIGRACIÓN
-- hasta que el usuario apruebe expresamente este DDL/RLS.
-- Destino: Supabase local sobre PostgreSQL en Docker; no enlaza proyectos remotos.
--
-- Convención propuesta para PostgreSQL: constraint PK_<tabla> y columnas del
-- modelo lógico. El índice de respaldo de la PK comparte el namespace de
-- relaciones de PostgreSQL, por lo que no se da a la constraint el nombre
-- literal de la tabla.
--
-- Supuestos que requieren revisión junto con el DDL:
-- 1. Username público temporal generado desde UUID; no se copia el correo.
-- 2. Solo noticias requieren fuente; la regla para debates queda pendiente.
-- 3. Un voto positivo por usuario/publicación; retirar/cambiar voto se difiere.
-- 4. El autor no edita/borrra comentarios en este corte; la decisión sigue pendiente.
-- 5. Eventos de puntos y acciones de moderación no admiten escritura directa del cliente.
-- 6. Avatares públicos, máximo 5 MiB, JPEG/PNG/WebP; revisar límites antes de aplicar.
-- 7. Eliminación/retención de cuentas queda fuera; FKs no borran contenido en cascada.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE TABLE public.profiles (
    user_id uuid NOT NULL REFERENCES auth.users (id),
    username text NOT NULL,
    display_name text NOT NULL DEFAULT 'Miembro',
    bio text NOT NULL DEFAULT '',
    avatar_path text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_profiles PRIMARY KEY (user_id),
    CONSTRAINT ck_profiles_username CHECK (username = lower(username) AND username ~ '^[a-z0-9_]{3,24}$'),
    CONSTRAINT ck_profiles_display_name CHECK (char_length(display_name) BETWEEN 1 AND 80),
    CONSTRAINT ck_profiles_bio CHECK (char_length(bio) <= 500),
    CONSTRAINT ck_profiles_avatar_path CHECK (avatar_path IS NULL OR avatar_path LIKE user_id::text || '/%')
);
CREATE UNIQUE INDEX profiles_username_uidx ON public.profiles (username);

CREATE TABLE public.member_access (
    user_id uuid NOT NULL REFERENCES public.profiles (user_id),
    status text NOT NULL DEFAULT 'pending',
    role text NOT NULL DEFAULT 'member',
    approved_by uuid REFERENCES auth.users (id),
    approved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_member_access PRIMARY KEY (user_id),
    CONSTRAINT ck_member_access_status CHECK (status IN ('pending', 'active', 'suspended')),
    CONSTRAINT ck_member_access_role CHECK (role IN ('member', 'moderator', 'admin', 'superadmin'))
);

CREATE TABLE public.categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL,
    description text NOT NULL DEFAULT '',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_categories PRIMARY KEY (id),
    CONSTRAINT uq_categories_slug UNIQUE (slug),
    CONSTRAINT ck_categories_name CHECK (char_length(trim(name)) BETWEEN 1 AND 100)
);
INSERT INTO public.categories (name, slug) VALUES
    ('Investigación y ciencia', 'investigacion-ciencia'),
    ('Modelos y herramientas', 'modelos-herramientas'),
    ('Industria y emprendimiento', 'industria-emprendimiento'),
    ('Educación y comunidad', 'educacion-comunidad'),
    ('Ética, política y regulación', 'etica-politica-regulacion'),
    ('Aplicaciones e infraestructura', 'aplicaciones-infraestructura')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE public.posts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles (user_id),
    kind text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    excerpt text NOT NULL DEFAULT '',
    body_md text NOT NULL,
    source_url text,
    source_class text,
    status text NOT NULL DEFAULT 'pending_review',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    CONSTRAINT pk_posts PRIMARY KEY (id),
    CONSTRAINT uq_posts_slug UNIQUE (slug),
    CONSTRAINT ck_posts_kind CHECK (kind IN ('news', 'discussion')),
    CONSTRAINT ck_posts_status CHECK (status IN ('draft', 'pending_review', 'published', 'hidden', 'rejected')),
    CONSTRAINT ck_posts_source_class CHECK (source_class IS NULL OR source_class IN ('primary', 'institutional', 'specialized_media', 'general_media')),
    CONSTRAINT ck_posts_news_source CHECK (kind <> 'news' OR (source_url IS NOT NULL AND source_class IS NOT NULL)),
    CONSTRAINT ck_posts_source_url CHECK (source_url IS NULL OR source_url ~* '^https?://'),
    CONSTRAINT ck_posts_title CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
    CONSTRAINT ck_posts_body CHECK (char_length(trim(body_md)) BETWEEN 1 AND 50000)
);
CREATE INDEX posts_public_feed_idx ON public.posts (published_at DESC, id DESC) WHERE status = 'published';
CREATE INDEX posts_author_created_idx ON public.posts (author_id, created_at DESC, id DESC);
CREATE INDEX posts_review_queue_idx ON public.posts (created_at, id) WHERE status = 'pending_review';

CREATE TABLE public.post_categories (
    post_id uuid NOT NULL REFERENCES public.posts (id),
    category_id uuid NOT NULL REFERENCES public.categories (id),
    CONSTRAINT pk_post_categories PRIMARY KEY (post_id, category_id)
);
CREATE INDEX post_categories_category_idx ON public.post_categories (category_id, post_id);

CREATE TABLE public.tags (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_tags PRIMARY KEY (id),
    CONSTRAINT uq_tags_slug UNIQUE (slug),
    CONSTRAINT ck_tags_name CHECK (char_length(trim(name)) BETWEEN 1 AND 60)
);

CREATE TABLE public.post_tags (
    post_id uuid NOT NULL REFERENCES public.posts (id),
    tag_id uuid NOT NULL REFERENCES public.tags (id),
    CONSTRAINT pk_post_tags PRIMARY KEY (post_id, tag_id)
);
CREATE INDEX post_tags_tag_idx ON public.post_tags (tag_id, post_id);

CREATE TABLE public.comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.posts (id),
    author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles (user_id),
    parent_id uuid REFERENCES public.comments (id),
    body text NOT NULL,
    status text NOT NULL DEFAULT 'published',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_comments PRIMARY KEY (id),
    CONSTRAINT ck_comments_status CHECK (status IN ('published', 'hidden', 'deleted')),
    CONSTRAINT ck_comments_body CHECK (char_length(trim(body)) BETWEEN 1 AND 10000),
    CONSTRAINT ck_comments_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE INDEX comments_post_created_idx ON public.comments (post_id, created_at, id);
CREATE INDEX comments_author_created_idx ON public.comments (author_id, created_at DESC);

CREATE TABLE public.post_votes (
    post_id uuid NOT NULL REFERENCES public.posts (id),
    user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles (user_id),
    value smallint NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_post_votes PRIMARY KEY (post_id, user_id),
    CONSTRAINT ck_post_votes_value CHECK (value = 1)
);
CREATE INDEX post_votes_user_idx ON public.post_votes (user_id, created_at DESC);

CREATE TABLE public.point_rules (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    action text NOT NULL,
    version integer NOT NULL,
    points integer NOT NULL,
    daily_cap integer,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_point_rules PRIMARY KEY (id),
    CONSTRAINT uq_point_rules_action_version UNIQUE (action, version),
    CONSTRAINT ck_point_rules_version CHECK (version > 0),
    CONSTRAINT ck_point_rules_points CHECK (points > 0),
    CONSTRAINT ck_point_rules_daily_cap CHECK (daily_cap IS NULL OR daily_cap > 0)
);

CREATE TABLE public.point_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles (user_id),
    point_rule_id uuid NOT NULL REFERENCES public.point_rules (id),
    reference_type text NOT NULL,
    reference_id uuid NOT NULL,
    points integer NOT NULL,
    idempotency_key text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    reversal_of_event_id uuid REFERENCES public.point_events (id),
    CONSTRAINT pk_point_events PRIMARY KEY (id),
    CONSTRAINT uq_point_events_idempotency UNIQUE (idempotency_key),
    CONSTRAINT ck_point_events_points CHECK (points <> 0),
    CONSTRAINT ck_point_events_reversal CHECK (reversal_of_event_id IS NULL OR (reversal_of_event_id <> id AND points < 0))
);
CREATE INDEX point_events_user_created_idx ON public.point_events (user_id, created_at DESC, id DESC);

CREATE TABLE public.levels (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    code text NOT NULL,
    name text NOT NULL,
    minimum_points integer NOT NULL,
    sort_order integer NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT pk_levels PRIMARY KEY (id),
    CONSTRAINT uq_levels_code UNIQUE (code),
    CONSTRAINT uq_levels_minimum_points UNIQUE (minimum_points),
    CONSTRAINT ck_levels_minimum_points CHECK (minimum_points >= 0)
);

CREATE TABLE public.badges (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    code text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    rule_config jsonb NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT pk_badges PRIMARY KEY (id),
    CONSTRAINT uq_badges_code UNIQUE (code),
    CONSTRAINT ck_badges_rule_config CHECK (jsonb_typeof(rule_config) = 'object')
);

CREATE TABLE public.user_badges (
    user_id uuid NOT NULL REFERENCES public.profiles (user_id),
    badge_id uuid NOT NULL REFERENCES public.badges (id),
    awarded_at timestamptz NOT NULL DEFAULT now(),
    rule_version integer NOT NULL DEFAULT 1,
    CONSTRAINT pk_user_badges PRIMARY KEY (user_id, badge_id),
    CONSTRAINT ck_user_badges_rule_version CHECK (rule_version > 0)
);

CREATE TABLE public.reports (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles (user_id),
    post_id uuid REFERENCES public.posts (id),
    comment_id uuid REFERENCES public.comments (id),
    reason text NOT NULL,
    status text NOT NULL DEFAULT 'open',
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_by uuid REFERENCES auth.users (id),
    resolved_at timestamptz,
    CONSTRAINT pk_reports PRIMARY KEY (id),
    CONSTRAINT ck_reports_one_target CHECK ((post_id IS NULL) <> (comment_id IS NULL)),
    CONSTRAINT ck_reports_status CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
    CONSTRAINT ck_reports_resolution_state CHECK (
        (status = 'open' AND resolved_by IS NULL AND resolved_at IS NULL)
        OR (status <> 'open' AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
    ),
    CONSTRAINT ck_reports_reason CHECK (char_length(trim(reason)) BETWEEN 1 AND 1000)
);
CREATE INDEX reports_status_created_idx ON public.reports (status, created_at, id);
CREATE INDEX reports_reporter_created_idx ON public.reports (reporter_id, created_at DESC);

CREATE TABLE public.moderation_actions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL REFERENCES auth.users (id),
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    action text NOT NULL,
    reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_moderation_actions PRIMARY KEY (id),
    CONSTRAINT ck_moderation_actions_target_type CHECK (target_type IN ('member', 'post', 'comment', 'report')),
    CONSTRAINT ck_moderation_actions_action CHECK (action IN ('bootstrap_first_superadmin', 'approve_member', 'suspend_member', 'change_role', 'publish_post', 'reject_post', 'hide_comment', 'delete_comment', 'restore_comment', 'resolve_report'))
);
CREATE INDEX moderation_actions_target_created_idx ON public.moderation_actions (target_type, target_id, created_at DESC);
CREATE INDEX moderation_actions_actor_created_idx ON public.moderation_actions (actor_id, created_at DESC);

INSERT INTO public.point_rules (action, version, points, daily_cap) VALUES
    ('news_approved', 1, 5, NULL),
    ('discussion_approved', 1, 4, NULL),
    ('helpful_comment', 1, 1, 5),
    ('recognized_contribution', 1, 3, NULL)
ON CONFLICT (action, version) DO NOTHING;

INSERT INTO public.levels (code, name, minimum_points, sort_order) VALUES
    ('new_member', 'Nuevo miembro', 0, 1),
    ('contributor', 'Colaborador', 20, 2),
    ('consistent', 'Constante', 75, 3),
    ('reference', 'Referente', 200, 4)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.badges (code, name, description, rule_config) VALUES
    ('first_validated_contribution', 'Primer aporte validado', 'Obtén tu primer aporte validado.', '{"type":"validated_contributions","minimum":1}'::jsonb),
    ('five_approved_news', 'Cinco noticias aprobadas', 'Publica cinco noticias aprobadas.', '{"type":"approved_news","minimum":5}'::jsonb),
    ('ten_helpful_comments', 'Diez comentarios útiles', 'Recibe validación por diez comentarios útiles.', '{"type":"helpful_comments","minimum":10}'::jsonb)
ON CONFLICT (code) DO NOTHING;

CREATE FUNCTION private.has_active_role(p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.member_access AS access_row
        WHERE access_row.user_id = (SELECT auth.uid())
          AND access_row.status = 'active'
          AND access_row.role = ANY (p_roles)
    );
$function$;

CREATE FUNCTION private.is_active_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT private.has_active_role(ARRAY['member', 'moderator', 'admin', 'superadmin']::text[]);
$function$;

CREATE FUNCTION private.can_read_post(p_post_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.posts AS post_row
        WHERE post_row.id = p_post_id
          AND (
              post_row.status = 'published'
              OR post_row.author_id = (SELECT auth.uid())
              OR private.has_active_role(ARRAY['moderator', 'admin', 'superadmin']::text[])
          )
    );
$function$;

CREATE FUNCTION private.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$function$;

CREATE FUNCTION private.provision_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    generated_username text;
    requested_username text;
    requested_display_name text;
BEGIN
    requested_username := lower(left(regexp_replace(coalesce(NEW.raw_user_meta_data ->> 'username', ''), '[^a-zA-Z0-9_]', '', 'g'), 24));
    IF char_length(requested_username) < 3 THEN
        generated_username := 'member_' || left(replace(NEW.id::text, '-', ''), 12);
    ELSE
        generated_username := requested_username;
    END IF;

    requested_display_name := nullif(left(trim(coalesce(NEW.raw_user_meta_data ->> 'display_name', '')), 80), '');

    INSERT INTO public.profiles (user_id, username, display_name)
    VALUES (NEW.id, generated_username, coalesce(requested_display_name, 'Miembro'));

    INSERT INTO public.member_access (user_id, status, role)
    VALUES (NEW.id, 'pending', 'member');

    RETURN NEW;
END;
$function$;

CREATE TRIGGER auth_user_provision_ciab_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.provision_auth_user();

CREATE TRIGGER profiles_touch_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER posts_touch_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE FUNCTION private.validate_comment_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    parent_post_id uuid;
    parent_parent_id uuid;
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT comment_row.post_id, comment_row.parent_id
      INTO parent_post_id, parent_parent_id
      FROM public.comments AS comment_row
     WHERE comment_row.id = NEW.parent_id;

    IF NOT FOUND OR parent_post_id <> NEW.post_id OR parent_parent_id IS NOT NULL THEN
        RAISE EXCEPTION 'La respuesta debe pertenecer a la misma publicación y tener un solo nivel.'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$function$;

CREATE TRIGGER comments_validate_parent
BEFORE INSERT OR UPDATE OF post_id, parent_id ON public.comments
FOR EACH ROW EXECUTE FUNCTION private.validate_comment_parent();

CREATE FUNCTION public.approve_member(p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    actor_id uuid := auth.uid();
BEGIN
    IF actor_id IS NULL OR NOT private.has_active_role(ARRAY['admin', 'superadmin']::text[]) THEN
        RAISE EXCEPTION 'No autorizado para aprobar membresías.' USING ERRCODE = '42501';
    END IF;
    IF p_user_id = actor_id THEN
        RAISE EXCEPTION 'No se puede aprobar la propia membresía.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.member_access
       SET status = 'active', approved_by = actor_id, approved_at = now()
     WHERE user_id = p_user_id AND status = 'pending';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe una membresía pendiente para aprobar.' USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.moderation_actions (actor_id, target_type, target_id, action, reason)
    VALUES (actor_id, 'member', p_user_id, 'approve_member', nullif(trim(p_reason), ''));
END;
$function$;

CREATE FUNCTION public.suspend_member(p_user_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    actor_id uuid := auth.uid();
    target_role text;
BEGIN
    IF actor_id IS NULL OR NOT private.has_active_role(ARRAY['admin', 'superadmin']::text[]) THEN
        RAISE EXCEPTION 'No autorizado para suspender membresías.' USING ERRCODE = '42501';
    END IF;
    IF p_user_id = actor_id OR nullif(trim(p_reason), '') IS NULL THEN
        RAISE EXCEPTION 'Indica un motivo y no intentes suspender tu propia cuenta.' USING ERRCODE = '22023';
    END IF;

    SELECT access_row.role INTO target_role
      FROM public.member_access AS access_row
     WHERE access_row.user_id = p_user_id
     FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe la membresía indicada.' USING ERRCODE = 'P0002';
    END IF;
    IF target_role IN ('admin', 'superadmin')
       AND NOT private.has_active_role(ARRAY['superadmin']::text[]) THEN
        RAISE EXCEPTION 'Solo un superadmin puede suspender una cuenta privilegiada.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.member_access SET status = 'suspended'
     WHERE user_id = p_user_id AND status <> 'suspended';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La membresía ya estaba suspendida.' USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.moderation_actions (actor_id, target_type, target_id, action, reason)
    VALUES (actor_id, 'member', p_user_id, 'suspend_member', trim(p_reason));
END;
$function$;

CREATE FUNCTION public.set_member_role(p_user_id uuid, p_role text, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    actor_id uuid := auth.uid();
    current_role text;
    current_status text;
    active_superadmins bigint;
BEGIN
    IF actor_id IS NULL OR NOT private.has_active_role(ARRAY['superadmin']::text[]) THEN
        RAISE EXCEPTION 'Solo un superadmin puede cambiar roles.' USING ERRCODE = '42501';
    END IF;
    IF p_user_id = actor_id THEN
        RAISE EXCEPTION 'No se permite cambiar el propio rol.' USING ERRCODE = '42501';
    END IF;
    PERFORM pg_advisory_xact_lock(73142, 1);
    IF p_role IS NULL OR p_role NOT IN ('member', 'moderator', 'admin', 'superadmin')
       OR nullif(trim(p_reason), '') IS NULL THEN
        RAISE EXCEPTION 'Rol o motivo inválido.' USING ERRCODE = '22023';
    END IF;

    SELECT access_row.role, access_row.status INTO current_role, current_status
      FROM public.member_access AS access_row
     WHERE access_row.user_id = p_user_id
     FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe la membresía indicada.' USING ERRCODE = 'P0002';
    END IF;
    IF p_role = 'superadmin' AND current_status <> 'active' THEN
        RAISE EXCEPTION 'Activa la membresía antes de asignar el rol superadmin.' USING ERRCODE = '22023';
    END IF;

    IF current_role = 'superadmin' AND current_status = 'active' AND p_role <> 'superadmin' THEN
        SELECT count(*) INTO active_superadmins FROM public.member_access
         WHERE role = 'superadmin' AND status = 'active';
        IF active_superadmins <= 1 THEN
            RAISE EXCEPTION 'No se puede retirar el último superadmin activo.' USING ERRCODE = '23514';
        END IF;
    END IF;

    UPDATE public.member_access SET role = p_role WHERE user_id = p_user_id;
    INSERT INTO public.moderation_actions (actor_id, target_type, target_id, action, reason)
    VALUES (actor_id, 'member', p_user_id, 'change_role', trim(p_reason));
END;
$function$;

CREATE FUNCTION public.review_post(p_post_id uuid, p_decision text, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    actor_id uuid := auth.uid();
    next_status text;
BEGIN
    IF actor_id IS NULL OR NOT private.has_active_role(ARRAY['moderator', 'admin', 'superadmin']::text[]) THEN
        RAISE EXCEPTION 'No autorizado para revisar publicaciones.' USING ERRCODE = '42501';
    END IF;
    IF p_decision IS NULL OR p_decision NOT IN ('publish', 'reject')
       OR (p_decision = 'reject' AND nullif(trim(p_reason), '') IS NULL) THEN
        RAISE EXCEPTION 'Decisión o motivo inválido.' USING ERRCODE = '22023';
    END IF;

    next_status := CASE WHEN p_decision = 'publish' THEN 'published' ELSE 'rejected' END;
    UPDATE public.posts
       SET status = next_status,
           published_at = CASE WHEN p_decision = 'publish' THEN now() ELSE NULL END
     WHERE id = p_post_id AND status = 'pending_review';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe una publicación pendiente de revisión.' USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.moderation_actions (actor_id, target_type, target_id, action, reason)
    VALUES (actor_id, 'post', p_post_id,
            CASE WHEN p_decision = 'publish' THEN 'publish_post' ELSE 'reject_post' END,
            nullif(trim(p_reason), ''));
END;
$function$;

CREATE FUNCTION public.moderate_comment(p_comment_id uuid, p_action text, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    actor_id uuid := auth.uid();
    next_status text;
BEGIN
    IF actor_id IS NULL OR NOT private.has_active_role(ARRAY['moderator', 'admin', 'superadmin']::text[]) THEN
        RAISE EXCEPTION 'No autorizado para moderar comentarios.' USING ERRCODE = '42501';
    END IF;
    IF p_action IS NULL OR p_action NOT IN ('hide', 'delete', 'restore')
       OR nullif(trim(p_reason), '') IS NULL THEN
        RAISE EXCEPTION 'Acción o motivo inválido.' USING ERRCODE = '22023';
    END IF;

    next_status := CASE p_action WHEN 'hide' THEN 'hidden' WHEN 'delete' THEN 'deleted' ELSE 'published' END;
    UPDATE public.comments SET status = next_status
     WHERE id = p_comment_id AND status <> next_status;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe el comentario o ya tiene ese estado.' USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.moderation_actions (actor_id, target_type, target_id, action, reason)
    VALUES (actor_id, 'comment', p_comment_id,
            CASE p_action WHEN 'hide' THEN 'hide_comment' WHEN 'delete' THEN 'delete_comment' ELSE 'restore_comment' END,
            trim(p_reason));
END;
$function$;

CREATE FUNCTION public.resolve_report(p_report_id uuid, p_status text, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    actor_id uuid := auth.uid();
BEGIN
    IF actor_id IS NULL OR NOT private.has_active_role(ARRAY['moderator', 'admin', 'superadmin']::text[]) THEN
        RAISE EXCEPTION 'No autorizado para resolver reportes.' USING ERRCODE = '42501';
    END IF;
    IF p_status IS NULL OR p_status NOT IN ('reviewed', 'dismissed', 'actioned')
       OR nullif(trim(p_reason), '') IS NULL THEN
        RAISE EXCEPTION 'Estado o motivo inválido.' USING ERRCODE = '22023';
    END IF;

    UPDATE public.reports
       SET status = p_status, resolved_by = actor_id, resolved_at = now()
     WHERE id = p_report_id AND status = 'open';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe un reporte abierto.' USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.moderation_actions (actor_id, target_type, target_id, action, reason)
    VALUES (actor_id, 'report', p_report_id, 'resolve_report', trim(p_reason));
END;
$function$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_public_read ON public.profiles
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY profiles_owner_update ON public.profiles
    FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY member_access_self_or_admin_read ON public.member_access
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()) OR private.has_active_role(ARRAY['admin', 'superadmin']::text[]));

CREATE POLICY categories_visible_read ON public.categories
    FOR SELECT TO anon, authenticated
    USING (is_active OR private.has_active_role(ARRAY['admin', 'superadmin']::text[]));
CREATE POLICY categories_admin_manage ON public.categories
    FOR ALL TO authenticated
    USING (private.has_active_role(ARRAY['admin', 'superadmin']::text[]))
    WITH CHECK (private.has_active_role(ARRAY['admin', 'superadmin']::text[]));

CREATE POLICY posts_public_or_author_or_moderator_read ON public.posts
    FOR SELECT TO anon, authenticated
    USING (status = 'published' OR author_id = (SELECT auth.uid())
        OR private.has_active_role(ARRAY['moderator', 'admin', 'superadmin']::text[]));
CREATE POLICY posts_active_member_submit ON public.posts
    FOR INSERT TO authenticated
    WITH CHECK (author_id = (SELECT auth.uid()) AND status = 'pending_review' AND private.is_active_member());

CREATE POLICY post_categories_visible_read ON public.post_categories
    FOR SELECT TO anon, authenticated USING (private.can_read_post(post_id));
CREATE POLICY post_categories_owner_pending_insert ON public.post_categories
    FOR INSERT TO authenticated
    WITH CHECK (
        private.is_active_member()
        AND EXISTS (
            SELECT 1 FROM public.posts AS post_row
            WHERE post_row.id = post_id AND post_row.author_id = (SELECT auth.uid()) AND post_row.status = 'pending_review'
        )
        AND EXISTS (
            SELECT 1 FROM public.categories AS category_row
            WHERE category_row.id = category_id AND category_row.is_active
        )
    );
CREATE POLICY post_categories_owner_pending_delete ON public.post_categories
    FOR DELETE TO authenticated
    USING (
        private.is_active_member()
        AND EXISTS (
            SELECT 1 FROM public.posts AS post_row
            WHERE post_row.id = post_id AND post_row.author_id = (SELECT auth.uid()) AND post_row.status = 'pending_review'
        )
    );

CREATE POLICY tags_public_read ON public.tags
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY tags_admin_manage ON public.tags
    FOR ALL TO authenticated
    USING (private.has_active_role(ARRAY['admin', 'superadmin']::text[]))
    WITH CHECK (private.has_active_role(ARRAY['admin', 'superadmin']::text[]));

CREATE POLICY post_tags_visible_read ON public.post_tags
    FOR SELECT TO anon, authenticated USING (private.can_read_post(post_id));
CREATE POLICY post_tags_owner_pending_insert ON public.post_tags
    FOR INSERT TO authenticated
    WITH CHECK (
        private.is_active_member()
        AND EXISTS (
            SELECT 1 FROM public.posts AS post_row
            WHERE post_row.id = post_id AND post_row.author_id = (SELECT auth.uid()) AND post_row.status = 'pending_review'
        )
    );
CREATE POLICY post_tags_owner_pending_delete ON public.post_tags
    FOR DELETE TO authenticated
    USING (
        private.is_active_member()
        AND EXISTS (
            SELECT 1 FROM public.posts AS post_row
            WHERE post_row.id = post_id AND post_row.author_id = (SELECT auth.uid()) AND post_row.status = 'pending_review'
        )
    );

CREATE POLICY comments_visible_read ON public.comments
    FOR SELECT TO anon, authenticated
    USING ((status = 'published' AND private.can_read_post(post_id))
        OR private.has_active_role(ARRAY['moderator', 'admin', 'superadmin']::text[]));
CREATE POLICY comments_active_member_insert ON public.comments
    FOR INSERT TO authenticated
    WITH CHECK (author_id = (SELECT auth.uid()) AND status = 'published' AND private.is_active_member()
        AND EXISTS (SELECT 1 FROM public.posts AS post_row WHERE post_row.id = post_id AND post_row.status = 'published'));

CREATE POLICY post_votes_owner_or_admin_read ON public.post_votes
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()) OR private.has_active_role(ARRAY['admin', 'superadmin']::text[]));
CREATE POLICY post_votes_active_member_insert ON public.post_votes
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()) AND value = 1 AND private.is_active_member()
        AND EXISTS (SELECT 1 FROM public.posts AS post_row
                    WHERE post_row.id = post_id AND post_row.status = 'published'
                      AND post_row.author_id <> (SELECT auth.uid())));

CREATE POLICY point_rules_active_read ON public.point_rules
    FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY point_events_owner_or_admin_read ON public.point_events
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()) OR private.has_active_role(ARRAY['moderator', 'admin', 'superadmin']::text[]));
CREATE POLICY levels_active_read ON public.levels
    FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY badges_active_read ON public.badges
    FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY user_badges_public_read ON public.user_badges
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY reports_owner_or_moderator_read ON public.reports
    FOR SELECT TO authenticated
    USING (reporter_id = (SELECT auth.uid()) OR private.has_active_role(ARRAY['moderator', 'admin', 'superadmin']::text[]));
CREATE POLICY reports_active_member_insert ON public.reports
    FOR INSERT TO authenticated
    WITH CHECK (reporter_id = (SELECT auth.uid()) AND private.is_active_member()
        AND (
            (post_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.posts AS post_row WHERE post_row.id = post_id AND post_row.status = 'published'))
            OR
            (comment_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.comments AS comment_row
                JOIN public.posts AS post_row ON post_row.id = comment_row.post_id
                WHERE comment_row.id = comment_id AND comment_row.status = 'published' AND post_row.status = 'published'
            ))
        ));

CREATE POLICY moderation_actions_moderator_read ON public.moderation_actions
    FOR SELECT TO authenticated
    USING (private.has_active_role(ARRAY['moderator', 'admin', 'superadmin']::text[]));

REVOKE ALL ON TABLE
    public.profiles, public.member_access, public.categories, public.posts,
    public.post_categories, public.tags, public.post_tags, public.comments,
    public.post_votes, public.point_rules, public.point_events, public.levels,
    public.badges, public.user_badges, public.reports, public.moderation_actions
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.profiles, public.categories, public.posts,
    public.post_categories, public.tags, public.post_tags, public.comments,
    public.point_rules, public.levels, public.badges, public.user_badges
TO anon, authenticated;
GRANT SELECT ON TABLE public.member_access, public.post_votes, public.point_events,
    public.reports, public.moderation_actions TO authenticated;
GRANT UPDATE (username, display_name, bio, avatar_path) ON public.profiles TO authenticated;
GRANT INSERT (kind, title, slug, excerpt, body_md, source_url, source_class)
    ON public.posts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories, public.tags TO authenticated;
GRANT INSERT, DELETE ON public.post_categories, public.post_tags TO authenticated;
GRANT INSERT (post_id, parent_id, body) ON public.comments TO authenticated;
GRANT INSERT (post_id, value) ON public.post_votes TO authenticated;
GRANT INSERT (post_id, comment_id, reason) ON public.reports TO authenticated;

REVOKE ALL ON FUNCTION private.has_active_role(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_active_member() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_read_post(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.touch_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.provision_auth_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.validate_comment_parent() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_active_role(text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_active_member() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_read_post(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.approve_member(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.suspend_member(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_member_role(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.review_post(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.moderate_comment(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_report(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_member(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suspend_member(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_member_role(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_post(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_comment(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_report(uuid, text, text) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY avatars_public_read ON storage.objects
    FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');
CREATE POLICY avatars_owner_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY avatars_owner_update ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY avatars_owner_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

COMMIT;

-- No se incluyen social_publications (fase social futura).
-- El tope global diario de 10 puntos y la idempotencia operativa requieren
-- funciones transaccionales de fase 5; las tablas quedan sin escritura cliente.
-- Los permisos de Storage se han redactado para revisión; validar bucket y
-- políticas con la versión real de Supabase local antes de convertir en migración.
