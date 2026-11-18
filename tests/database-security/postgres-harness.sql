-- Solo para un clúster PostgreSQL desechable bajo Hermes scratch; no usar en Supabase.
-- Proporciona stubs mínimos de Auth/Storage para validar sintaxis y RLS del candidato.
\set ON_ERROR_STOP on

DO $target_guard$
BEGIN
    IF current_database() <> 'ciab_validation'
       OR inet_server_addr() IS DISTINCT FROM inet '127.0.0.1'
       OR position('/hermes/cache/scratch/' IN lower(replace(current_setting('data_directory'), chr(92), '/'))) = 0 THEN
        RAISE EXCEPTION 'Harness cancelado: requiere ciab_validation en loopback, dentro de Hermes scratch.';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public')
       OR to_regnamespace('auth') IS NOT NULL
       OR to_regnamespace('storage') IS NOT NULL THEN
        RAISE EXCEPTION 'Harness cancelado: el destino debe estar vacío, sin tablas public ni schemas Auth/Storage.';
    END IF;
END;
$target_guard$;

DO $roles$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
END;
$roles$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
CREATE SCHEMA auth;
CREATE TABLE auth.users (
    id uuid PRIMARY KEY,
    email text UNIQUE,
    raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $function$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$function$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;

CREATE SCHEMA storage;
CREATE TABLE storage.buckets (
    id text PRIMARY KEY,
    name text NOT NULL,
    public boolean NOT NULL DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[]
);
CREATE TABLE storage.objects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text NOT NULL REFERENCES storage.buckets (id),
    name text NOT NULL
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(p_name text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $function$
    SELECT string_to_array(p_name, '/');
$function$;
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated;
