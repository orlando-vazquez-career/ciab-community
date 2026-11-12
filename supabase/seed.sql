-- Semilla de desarrollo. Corre después de las migraciones con `supabase db start`
-- o `supabase db reset` y NO se aplica con `supabase db push` (staging y producción).
--
-- Los catálogos (categorías, reglas de puntos, niveles e insignias) ya vienen en la
-- migración inicial. Aquí van solo datos de prueba para desarrollar la interfaz.
-- Las cuentas se crean registrándose desde la app; para volver admin a la primera,
-- ejecuta en el SQL Editor (con tu usuario real):
--
--   update public.member_access
--   set status = 'active', role = 'admin', approved_at = now()
--   where user_id = (select id from auth.users where email = 'tu-correo@ejemplo.com');

select 1;
