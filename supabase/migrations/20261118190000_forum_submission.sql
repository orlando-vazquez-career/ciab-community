BEGIN;

CREATE OR REPLACE FUNCTION public.submit_post(
    p_kind text,
    p_title text,
    p_excerpt text,
    p_body_md text,
    p_source_url text,
    p_source_class text,
    p_category_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    actor_id uuid := auth.uid();
    new_post_id uuid := gen_random_uuid();
    normalized_title text := trim(coalesce(p_title, ''));
    normalized_excerpt text := trim(coalesce(p_excerpt, ''));
    normalized_body text := trim(coalesce(p_body_md, ''));
    normalized_source_url text := nullif(trim(coalesce(p_source_url, '')), '');
    normalized_source_class text := nullif(trim(coalesce(p_source_class, '')), '');
    slug_base text;
BEGIN
    IF actor_id IS NULL OR NOT private.is_active_member() THEN
        RAISE EXCEPTION 'Solo un miembro activo puede enviar publicaciones.'
            USING ERRCODE = '42501';
    END IF;

    IF p_kind IS NULL OR p_kind NOT IN ('news', 'discussion')
       OR char_length(normalized_title) NOT BETWEEN 1 AND 200
       OR char_length(normalized_excerpt) > 500
       OR char_length(normalized_body) NOT BETWEEN 1 AND 50000 THEN
        RAISE EXCEPTION 'El tipo o contenido de la publicación no es válido.'
            USING ERRCODE = '22023';
    END IF;

    IF p_kind = 'news'
       AND (normalized_source_url IS NULL OR normalized_source_class IS NULL) THEN
        RAISE EXCEPTION 'Las noticias requieren fuente y clasificación.'
            USING ERRCODE = '22023';
    END IF;

    IF normalized_source_url IS NOT NULL
       AND (
           char_length(normalized_source_url) > 2048
           OR normalized_source_url !~* '^https?://[^[:space:]]+$'
           OR normalized_source_url ~* '^https?://[^/]*@'
       ) THEN
        RAISE EXCEPTION 'La URL de la fuente no es válida.'
            USING ERRCODE = '22023';
    END IF;

    IF normalized_source_class IS NOT NULL
       AND normalized_source_class NOT IN ('primary', 'institutional', 'specialized_media', 'general_media') THEN
        RAISE EXCEPTION 'La clase de fuente no es válida.'
            USING ERRCODE = '22023';
    END IF;

    IF normalized_source_url IS NULL AND normalized_source_class IS NOT NULL THEN
        RAISE EXCEPTION 'La clase de fuente requiere una URL.'
            USING ERRCODE = '22023';
    END IF;

    IF p_category_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.categories AS category_row
        WHERE category_row.id = p_category_id AND category_row.is_active
    ) THEN
        RAISE EXCEPTION 'Selecciona una categoría activa.'
            USING ERRCODE = '22023';
    END IF;

    slug_base := trim(both '-' FROM regexp_replace(lower(normalized_title), '[^a-z0-9]+', '-', 'g'));
    IF slug_base = '' THEN
        slug_base := 'publicacion';
    END IF;

    INSERT INTO public.posts (
        id, author_id, kind, title, slug, excerpt, body_md,
        source_url, source_class, status
    ) VALUES (
        new_post_id,
        actor_id,
        p_kind,
        normalized_title,
        left(slug_base, 120) || '-' || replace(new_post_id::text, '-', ''),
        normalized_excerpt,
        normalized_body,
        normalized_source_url,
        normalized_source_class,
        'pending_review'
    );

    INSERT INTO public.post_categories (post_id, category_id)
    VALUES (new_post_id, p_category_id);

    RETURN new_post_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_post(text, text, text, text, text, text, uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_post(text, text, text, text, text, text, uuid)
TO authenticated;

COMMIT;
