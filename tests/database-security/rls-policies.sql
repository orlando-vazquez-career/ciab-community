-- CIAB COMMUNITY — prueba de políticas de RLS
-- Solo para una base local desechable con el DDL de fase 2 aplicado.
-- Fixtures sintéticos; todos los cambios se revierten al terminar.
\set ON_ERROR_STOP on

BEGIN;

DO $test_guard$
BEGIN
    IF current_database() <> 'ciab_validation'
       OR inet_server_addr() IS DISTINCT FROM inet '127.0.0.1'
       OR position('/hermes/cache/scratch/' IN lower(replace(current_setting('data_directory'), chr(92), '/'))) = 0 THEN
        RAISE EXCEPTION 'Prueba cancelada: requiere ciab_validation en loopback, dentro de Hermes scratch.';
    END IF;
    IF NOT has_column_privilege('authenticated', 'public.posts', 'kind', 'INSERT') THEN
        RAISE EXCEPTION 'Prueba inválida: authenticated debe tener INSERT para que RLS sea el control probado.';
    END IF;
    IF has_column_privilege('authenticated', 'public.posts', 'status', 'UPDATE') THEN
        RAISE EXCEPTION 'Prueba inválida: el rol authenticated no debe poder editar directamente el estado de publicaciones.';
    END IF;
    IF NOT has_table_privilege('authenticated', 'public.post_categories', 'INSERT') THEN
        RAISE EXCEPTION 'Prueba inválida: authenticated debe tener INSERT para que RLS sea el control probado.';
    END IF;
    IF NOT has_table_privilege('authenticated', 'public.post_tags', 'INSERT') THEN
        RAISE EXCEPTION 'Prueba inválida: authenticated debe tener INSERT para que RLS sea el control probado.';
    END IF;
    IF NOT has_function_privilege('authenticated', 'public.submit_post(text,text,text,text,text,text,uuid)', 'EXECUTE')
       OR has_function_privilege('anon', 'public.submit_post(text,text,text,text,text,text,uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'Prueba inválida: submit_post debe ejecutarse solo con rol authenticated.';
    END IF;
END;
$test_guard$;

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
    ('10000000-0000-4000-8000-000000000001', 'pending@example.invalid', '{"username":"pending_user"}'),
    ('10000000-0000-4000-8000-000000000002', 'active@example.invalid', '{"username":"active_user"}'),
    ('10000000-0000-4000-8000-000000000003', 'suspended@example.invalid', '{"username":"suspended_user"}'),
    ('10000000-0000-4000-8000-000000000004', 'moderator@example.invalid', '{"username":"moderator_user"}'),
    ('10000000-0000-4000-8000-000000000005', 'admin@example.invalid', '{"username":"admin_user"}');

DO $pending_default$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.member_access
         WHERE user_id = '10000000-0000-4000-8000-000000000001'
           AND status = 'pending' AND role = 'member'
    ) THEN
        RAISE EXCEPTION 'La cuenta nueva no quedó como member/pending.';
    END IF;
END;
$pending_default$;

UPDATE public.member_access
   SET status = 'active', approved_by = '10000000-0000-4000-8000-000000000005', approved_at = now()
 WHERE user_id IN (
     '10000000-0000-4000-8000-000000000002',
     '10000000-0000-4000-8000-000000000004',
     '10000000-0000-4000-8000-000000000005'
 );
UPDATE public.member_access SET status = 'suspended'
 WHERE user_id = '10000000-0000-4000-8000-000000000003';
UPDATE public.member_access SET role = 'moderator'
 WHERE user_id = '10000000-0000-4000-8000-000000000004';
UPDATE public.member_access SET role = 'admin'
 WHERE user_id = '10000000-0000-4000-8000-000000000005';

UPDATE public.categories SET is_active = false
 WHERE slug = 'modelos-herramientas';

INSERT INTO public.posts (id, author_id, kind, title, slug, body_md, status)
VALUES
    ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'discussion', 'Pendiente sintético', 'pending-synthetic', 'Contenido de prueba', 'pending_review'),
    ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'discussion', 'Activo sintético', 'active-synthetic', 'Contenido de prueba', 'pending_review'),
    ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'discussion', 'Moderador sintético', 'moderator-synthetic', 'Contenido de prueba', 'pending_review'),
    ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', 'discussion', 'Suspendido sintético', 'suspended-synthetic', 'Contenido de prueba', 'pending_review');
INSERT INTO public.posts (id, author_id, kind, title, slug, body_md, status, published_at)
VALUES ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'discussion', 'Publicado sintético', 'published-synthetic', 'Contenido público de prueba', 'published', now());

INSERT INTO public.tags (name, slug) VALUES
    ('Etiqueta sintética', 'tag-synthetic'),
    ('Etiqueta sintética secundaria', 'tag-synthetic-secondary');

DO $test_ids$
BEGIN
    PERFORM set_config(
        'ciab.test.active_category_id',
        (SELECT id::text FROM public.categories WHERE slug = 'investigacion-ciencia'),
        true
    );
    PERFORM set_config(
        'ciab.test.inactive_category_id',
        (SELECT id::text FROM public.categories WHERE slug = 'modelos-herramientas'),
        true
    );
    PERFORM set_config(
        'ciab.test.restricted_category_id',
        (SELECT id::text FROM public.categories WHERE slug = 'aplicaciones-infraestructura'),
        true
    );
    PERFORM set_config(
        'ciab.test.tag_id',
        (SELECT id::text FROM public.tags WHERE slug = 'tag-synthetic'),
        true
    );
    PERFORM set_config(
        'ciab.test.restricted_tag_id',
        (SELECT id::text FROM public.tags WHERE slug = 'tag-synthetic-secondary'),
        true
    );
END;
$test_ids$;

INSERT INTO public.post_categories (post_id, category_id)
VALUES (
    '20000000-0000-4000-8000-000000000001',
    current_setting('ciab.test.active_category_id')::uuid
), (
    '20000000-0000-4000-8000-000000000004',
    current_setting('ciab.test.active_category_id')::uuid
), (
    '20000000-0000-4000-8000-000000000005',
    current_setting('ciab.test.active_category_id')::uuid
);
INSERT INTO public.post_tags (post_id, tag_id)
VALUES (
    '20000000-0000-4000-8000-000000000001',
    current_setting('ciab.test.tag_id')::uuid
), (
    '20000000-0000-4000-8000-000000000004',
    current_setting('ciab.test.tag_id')::uuid
), (
    '20000000-0000-4000-8000-000000000005',
    current_setting('ciab.test.tag_id')::uuid
);

-- El rol anónimo ve publicaciones publicadas, no borradores en revisión.
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
DO $anonymous_read$
BEGIN
    IF EXISTS (SELECT 1 FROM public.posts WHERE id = '20000000-0000-4000-8000-000000000001') THEN
        RAISE EXCEPTION 'El rol anon pudo leer una publicación pendiente.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.posts WHERE id = '20000000-0000-4000-8000-000000000003') THEN
        RAISE EXCEPTION 'El rol anon no pudo leer una publicación publicada.';
    END IF;
END;
$anonymous_read$;
DO $anonymous_submit$
BEGIN
    BEGIN
        PERFORM public.submit_post(
            'discussion', 'Envío anónimo', '', 'Prueba', NULL, NULL,
            current_setting('ciab.test.active_category_id')::uuid
        );
        RAISE EXCEPTION 'anon pudo ejecutar submit_post.';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
END;
$anonymous_submit$;
RESET ROLE;

-- Una cuenta pendiente no puede asociar categorías a su propio borrador.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
DO $pending_post$
BEGIN
    BEGIN
        INSERT INTO public.posts (kind, title, slug, body_md)
        VALUES ('discussion', 'Envío pendiente', 'pending-submission-denied', 'Prueba');
        RAISE EXCEPTION 'RLS permitió que una cuenta pendiente publicara un envío.';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
END;
$pending_post$;
DO $pending_submit_rpc$
BEGIN
    BEGIN
        PERFORM public.submit_post(
            'discussion', 'Envío pendiente', '', 'Prueba', NULL, NULL,
            current_setting('ciab.test.active_category_id')::uuid
        );
        RAISE EXCEPTION 'submit_post permitió enviar contenido a una cuenta pendiente.';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
END;
$pending_submit_rpc$;
DO $pending_category$
DECLARE
    affected_rows integer;
BEGIN
    BEGIN
        INSERT INTO public.post_categories (post_id, category_id)
        VALUES (
            '20000000-0000-4000-8000-000000000001',
            current_setting('ciab.test.restricted_category_id')::uuid
        );
        RAISE EXCEPTION 'RLS permitió que un miembro pendiente asociara una categoría.';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
    DELETE FROM public.post_categories
     WHERE post_id = '20000000-0000-4000-8000-000000000001';
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 0 THEN
        RAISE EXCEPTION 'RLS permitió que un miembro pendiente eliminara una categoría.';
    END IF;
END;
$pending_category$;
RESET ROLE;

-- Una cuenta pendiente tampoco puede asociar etiquetas a su borrador.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
DO $pending_tag$
DECLARE
    affected_rows integer;
BEGIN
    BEGIN
        INSERT INTO public.post_tags (post_id, tag_id)
        VALUES (
            '20000000-0000-4000-8000-000000000001',
            current_setting('ciab.test.restricted_tag_id')::uuid
        );
        RAISE EXCEPTION 'RLS permitió que un miembro pendiente asociara una etiqueta.';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
    DELETE FROM public.post_tags
     WHERE post_id = '20000000-0000-4000-8000-000000000001';
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 0 THEN
        RAISE EXCEPTION 'RLS permitió que un miembro pendiente eliminara una etiqueta.';
    END IF;
END;
$pending_tag$;
RESET ROLE;

-- Una membresía suspendida pierde las operaciones de escritura, incluso sobre su propio borrador.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
DO $suspended_member$
DECLARE
    affected_rows integer;
BEGIN
    BEGIN
        INSERT INTO public.posts (kind, title, slug, body_md)
        VALUES ('discussion', 'Envío suspendido', 'suspended-submission-denied', 'Prueba');
        RAISE EXCEPTION 'RLS permitió publicar a una membresía suspendida.';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
    BEGIN
        INSERT INTO public.post_categories (post_id, category_id)
        VALUES (
            '20000000-0000-4000-8000-000000000005',
            current_setting('ciab.test.restricted_category_id')::uuid
        );
        RAISE EXCEPTION 'RLS permitió categorías nuevas a una membresía suspendida.';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
    BEGIN
        INSERT INTO public.post_tags (post_id, tag_id)
        VALUES (
            '20000000-0000-4000-8000-000000000005',
            current_setting('ciab.test.restricted_tag_id')::uuid
        );
        RAISE EXCEPTION 'RLS permitió etiquetas nuevas a una membresía suspendida.';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
    DELETE FROM public.post_categories
     WHERE post_id = '20000000-0000-4000-8000-000000000005';
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 0 THEN
        RAISE EXCEPTION 'RLS permitió eliminar categorías con membresía suspendida.';
    END IF;
    DELETE FROM public.post_tags
     WHERE post_id = '20000000-0000-4000-8000-000000000005';
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 0 THEN
        RAISE EXCEPTION 'RLS permitió eliminar etiquetas con membresía suspendida.';
    END IF;
END;
$suspended_member$;
RESET ROLE;

-- Un miembro activo sí puede asociar una categoría activa a su borrador.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
DO $active_post$
DECLARE
    affected_rows integer;
    rpc_post_id uuid;
BEGIN
    INSERT INTO public.posts (kind, title, slug, body_md)
    VALUES ('discussion', 'Envío activo', 'active-submission-allowed', 'Prueba');
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 1 THEN
        RAISE EXCEPTION 'El miembro activo no pudo enviar una publicación para revisión.';
    END IF;

    rpc_post_id := public.submit_post(
        'discussion', 'Envío RPC activo', '', 'Prueba atómica', NULL, NULL,
        current_setting('ciab.test.active_category_id')::uuid
    );
    IF NOT EXISTS (
        SELECT 1 FROM public.posts
         WHERE id = rpc_post_id AND author_id = '10000000-0000-4000-8000-000000000002'
           AND status = 'pending_review'
    ) OR NOT EXISTS (
        SELECT 1 FROM public.post_categories
         WHERE post_id = rpc_post_id
           AND category_id = current_setting('ciab.test.active_category_id')::uuid
    ) THEN
        RAISE EXCEPTION 'submit_post no creó publicación pendiente y categoría de forma conjunta.';
    END IF;

    BEGIN
        PERFORM public.submit_post(
            'news', 'Noticia sin fuente', '', 'Contenido', NULL, NULL,
            current_setting('ciab.test.active_category_id')::uuid
        );
        RAISE EXCEPTION 'submit_post aceptó una noticia sin fuente.';
    EXCEPTION WHEN invalid_parameter_value THEN
        NULL;
    END;

    BEGIN
        PERFORM public.submit_post(
            'news', 'Fuente extensa', '', 'Contenido',
            'https://example.org/' || repeat('a', 2048), 'primary',
            current_setting('ciab.test.active_category_id')::uuid
        );
        RAISE EXCEPTION 'submit_post aceptó una URL de fuente superior a 2048 caracteres.';
    EXCEPTION WHEN invalid_parameter_value THEN
        NULL;
    END;

    BEGIN
        PERFORM public.submit_post(
            'news', 'Fuente con credenciales', '', 'Contenido',
            'https://usuario:clave@example.org/noticia', 'primary',
            current_setting('ciab.test.active_category_id')::uuid
        );
        RAISE EXCEPTION 'submit_post aceptó credenciales incrustadas en la URL de fuente.';
    EXCEPTION WHEN invalid_parameter_value THEN
        NULL;
    END;

    BEGIN
        PERFORM public.submit_post(
            'discussion', 'Categoría inactiva', '', 'Contenido', NULL, NULL,
            current_setting('ciab.test.inactive_category_id')::uuid
        );
        RAISE EXCEPTION 'submit_post aceptó una categoría inactiva.';
    EXCEPTION WHEN invalid_parameter_value THEN
        NULL;
    END;
END;
$active_post$;
INSERT INTO public.post_categories (post_id, category_id)
VALUES (
    '20000000-0000-4000-8000-000000000002',
    current_setting('ciab.test.active_category_id')::uuid
);
INSERT INTO public.post_tags (post_id, tag_id)
VALUES (
    '20000000-0000-4000-8000-000000000002',
    current_setting('ciab.test.tag_id')::uuid
);
DO $active_delete$
DECLARE
    affected_rows integer;
BEGIN
    DELETE FROM public.post_categories
     WHERE post_id = '20000000-0000-4000-8000-000000000002';
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 1 THEN
        RAISE EXCEPTION 'Miembro activo no pudo quitar su categoría del borrador.';
    END IF;
    DELETE FROM public.post_tags
     WHERE post_id = '20000000-0000-4000-8000-000000000002';
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 1 THEN
        RAISE EXCEPTION 'Miembro activo no pudo quitar su etiqueta del borrador.';
    END IF;
END;
$active_delete$;
DO $active_non_owner$
DECLARE
    affected_rows integer;
BEGIN
    DELETE FROM public.post_categories
     WHERE post_id = '20000000-0000-4000-8000-000000000004';
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 0 THEN
        RAISE EXCEPTION 'Un miembro activo pudo eliminar la categoría de otro autor.';
    END IF;
    DELETE FROM public.post_tags
     WHERE post_id = '20000000-0000-4000-8000-000000000004';
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 0 THEN
        RAISE EXCEPTION 'Un miembro activo pudo eliminar la etiqueta de otro autor.';
    END IF;
    UPDATE public.categories SET is_active = false
     WHERE id = current_setting('ciab.test.active_category_id')::uuid;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 0 THEN
        RAISE EXCEPTION 'Un miembro activo pudo administrar categorías.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.member_access
         WHERE user_id = '10000000-0000-4000-8000-000000000001'
    ) THEN
        RAISE EXCEPTION 'Un miembro activo pudo leer la membresía de otra cuenta.';
    END IF;
END;
$active_non_owner$;

-- Un miembro activo no puede asociar una categoría desactivada.
DO $inactive_category$
BEGIN
    BEGIN
        INSERT INTO public.post_categories (post_id, category_id)
        VALUES (
            '20000000-0000-4000-8000-000000000002',
            current_setting('ciab.test.inactive_category_id')::uuid
        );
        RAISE EXCEPTION 'RLS permitió asociar una categoría inactiva.';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
END;
$inactive_category$;
RESET ROLE;

-- El moderador lee la cola y resuelve publicaciones, pero no administra miembros ni categorías.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
DO $moderator_read$
DECLARE
    affected_rows integer;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.posts WHERE id = '20000000-0000-4000-8000-000000000001') THEN
        RAISE EXCEPTION 'El moderador no pudo leer una publicación pendiente de otra persona.';
    END IF;
    BEGIN
        PERFORM public.approve_member('10000000-0000-4000-8000-000000000001', 'prueba sintética');
        RAISE EXCEPTION 'El moderador pudo aprobar membresías.';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
    UPDATE public.categories SET is_active = false
     WHERE id = current_setting('ciab.test.active_category_id')::uuid;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 0 THEN
        RAISE EXCEPTION 'El moderador pudo administrar categorías.';
    END IF;
END;
$moderator_read$;
SELECT public.review_post('20000000-0000-4000-8000-000000000001', 'publish', NULL);
DO $moderator_audit$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.moderation_actions
         WHERE actor_id = '10000000-0000-4000-8000-000000000004'
           AND target_id = '20000000-0000-4000-8000-000000000001'
           AND action = 'publish_post'
    ) THEN
        RAISE EXCEPTION 'La revisión del moderador no dejó auditoría.';
    END IF;
END;
$moderator_audit$;
RESET ROLE;

-- El administrador puede activar categorías y aprobar membresías; no se crea un superadmin.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
DO $admin_workflow$
DECLARE
    affected_rows integer;
BEGIN
    UPDATE public.categories SET is_active = true
     WHERE id = current_setting('ciab.test.inactive_category_id')::uuid;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 1 THEN
        RAISE EXCEPTION 'El administrador no pudo activar una categoría.';
    END IF;
    PERFORM public.approve_member('10000000-0000-4000-8000-000000000001', 'aprobación sintética');
    IF NOT EXISTS (
        SELECT 1 FROM public.member_access
         WHERE user_id = '10000000-0000-4000-8000-000000000001'
           AND status = 'active' AND role = 'member'
    ) THEN
        RAISE EXCEPTION 'El administrador no pudo aprobar la membresía pendiente.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.moderation_actions
         WHERE actor_id = '10000000-0000-4000-8000-000000000005'
           AND target_id = '10000000-0000-4000-8000-000000000001'
           AND action = 'approve_member'
    ) THEN
        RAISE EXCEPTION 'La aprobación administrativa no dejó auditoría.';
    END IF;
END;
$admin_workflow$;
RESET ROLE;

-- Storage permite lectura pública de avatares y limita escrituras a la carpeta del usuario.
INSERT INTO storage.objects (id, bucket_id, name)
VALUES ('40000000-0000-4000-8000-000000000001', 'avatars', '10000000-0000-4000-8000-000000000001/avatar-public.png');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
DO $avatars_public_read$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.objects
         WHERE id = '40000000-0000-4000-8000-000000000001'
    ) THEN
        RAISE EXCEPTION 'anon no pudo leer un objeto del bucket público de avatares.';
    END IF;
END;
$avatars_public_read$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
-- Storage exige esta marca de sesión para permitir DELETE; la transacción de prueba se revierte.
SELECT set_config('storage.allow_delete_query', 'true', true);
INSERT INTO storage.objects (id, bucket_id, name)
VALUES ('40000000-0000-4000-8000-000000000002', 'avatars', '10000000-0000-4000-8000-000000000002/avatar-own.png');
DO $avatars_owner_scope$
DECLARE
    affected_rows integer;
BEGIN
    BEGIN
        INSERT INTO storage.objects (id, bucket_id, name)
        VALUES ('40000000-0000-4000-8000-000000000003', 'avatars', '10000000-0000-4000-8000-000000000001/avatar-other.png');
        RAISE EXCEPTION 'RLS permitió insertar un avatar en la carpeta de otra cuenta.';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    UPDATE storage.objects
       SET name = '10000000-0000-4000-8000-000000000001/avatar-stolen.png'
     WHERE id = '40000000-0000-4000-8000-000000000001';
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 0 THEN
        RAISE EXCEPTION 'RLS permitió actualizar el avatar de otra cuenta.';
    END IF;

    UPDATE storage.objects
       SET name = '10000000-0000-4000-8000-000000000002/avatar-updated.png'
     WHERE id = '40000000-0000-4000-8000-000000000002';
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 1 THEN
        RAISE EXCEPTION 'La cuenta no pudo actualizar su propio avatar.';
    END IF;

    BEGIN
        UPDATE storage.objects
           SET name = '10000000-0000-4000-8000-000000000001/avatar-moved.png'
         WHERE id = '40000000-0000-4000-8000-000000000002';
        RAISE EXCEPTION 'RLS permitió mover el avatar a la carpeta de otra cuenta.';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    DELETE FROM storage.objects
     WHERE id = '40000000-0000-4000-8000-000000000001';
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 0 THEN
        RAISE EXCEPTION 'RLS permitió borrar el avatar de otra cuenta.';
    END IF;

    DELETE FROM storage.objects
     WHERE id = '40000000-0000-4000-8000-000000000002';
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 1 THEN
        RAISE EXCEPTION 'La cuenta no pudo borrar su propio avatar.';
    END IF;
END;
$avatars_owner_scope$;
RESET ROLE;

DO $no_superadmin$
BEGIN
    IF EXISTS (SELECT 1 FROM public.member_access WHERE role = 'superadmin') THEN
        RAISE EXCEPTION 'La prueba no debe crear ni requerir un superadmin.';
    END IF;
END;
$no_superadmin$;

ROLLBACK;
