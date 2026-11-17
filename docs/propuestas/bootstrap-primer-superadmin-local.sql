-- CIAB COMMUNITY — PROPUESTA DE BOOTSTRAP DEL PRIMER SUPERADMIN
-- NO AUTORIZADO PARA EJECUCIÓN. Requiere autorización específica del usuario.
-- LOCAL-ONLY: ejecutar únicamente dentro de Supabase local en Docker,
-- conectado como postgres mediante `supabase db connect --local`.
-- Después de registrar al usuario, ejecutar este archivo en psql con `\i`.
-- No es una migración ni debe ejecutarse contra proyectos remotos.
-- El correo se solicita en la terminal, no se guarda en Git ni en SQL.
-- Requiere que el esquema aprobado ya haya creado member_access y moderation_actions.

\set ON_ERROR_STOP on
\prompt 'Correo del usuario ya registrado en Supabase local: ' bootstrap_email

BEGIN;
SELECT set_config('ciab.bootstrap_email', :'bootstrap_email', true);

DO $bootstrap$
DECLARE
    selected_email text := lower(trim(current_setting('ciab.bootstrap_email')));
    selected_user_id uuid;
BEGIN
    IF current_user <> 'postgres' THEN
        RAISE EXCEPTION 'Bootstrap rechazado: conecta como postgres en Supabase local.'
            USING ERRCODE = '42501';
    END IF;

    PERFORM pg_advisory_xact_lock(73142, 1);

    IF EXISTS (
        SELECT 1 FROM public.member_access WHERE role = 'superadmin'
    ) THEN
        RAISE EXCEPTION 'Bootstrap rechazado: ya existe un superadmin.'
            USING ERRCODE = '23505';
    END IF;

    SELECT auth_user.id
      INTO selected_user_id
      FROM auth.users AS auth_user
     WHERE lower(auth_user.email) = selected_email;

    IF selected_user_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró una cuenta local registrada con ese correo.'
            USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.member_access
       SET status = 'active',
           role = 'superadmin',
           approved_by = selected_user_id,
           approved_at = now()
     WHERE user_id = selected_user_id
       AND role = 'member'
       AND status IN ('pending', 'active');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se pudo promover la cuenta; revisa su acceso y rol actuales.'
            USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.moderation_actions (actor_id, target_type, target_id, action, reason)
    VALUES (
        selected_user_id,
        'member',
        selected_user_id,
        'bootstrap_first_superadmin',
        'Bootstrap local único del primer superadmin'
    );
END;
$bootstrap$;

COMMIT;
