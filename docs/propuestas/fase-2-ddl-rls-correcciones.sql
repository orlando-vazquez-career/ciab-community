-- CORRECCIÓN DE REVISIÓN PARA fase-2-ddl-rls.sql
-- No es una migración independiente. Integra estas definiciones en el borrador
-- principal, sustituyendo las cuatro políticas indicadas, antes de solicitar
-- aprobación. No ejecutar este archivo.

DROP POLICY IF EXISTS post_categories_owner_pending_insert ON public.post_categories;
CREATE POLICY post_categories_owner_pending_insert ON public.post_categories
    FOR INSERT TO authenticated
    WITH CHECK (
        private.is_active_member()
        AND EXISTS (
            SELECT 1
            FROM public.posts AS post_row
            WHERE post_row.id = post_id
              AND post_row.author_id = (SELECT auth.uid())
              AND post_row.status = 'pending_review'
        )
        AND EXISTS (
            SELECT 1
            FROM public.categories AS category_row
            WHERE category_row.id = category_id
              AND category_row.is_active
        )
    );

DROP POLICY IF EXISTS post_categories_owner_pending_delete ON public.post_categories;
CREATE POLICY post_categories_owner_pending_delete ON public.post_categories
    FOR DELETE TO authenticated
    USING (
        private.is_active_member()
        AND EXISTS (
            SELECT 1
            FROM public.posts AS post_row
            WHERE post_row.id = post_id
              AND post_row.author_id = (SELECT auth.uid())
              AND post_row.status = 'pending_review'
        )
    );

DROP POLICY IF EXISTS post_tags_owner_pending_insert ON public.post_tags;
CREATE POLICY post_tags_owner_pending_insert ON public.post_tags
    FOR INSERT TO authenticated
    WITH CHECK (
        private.is_active_member()
        AND EXISTS (
            SELECT 1
            FROM public.posts AS post_row
            WHERE post_row.id = post_id
              AND post_row.author_id = (SELECT auth.uid())
              AND post_row.status = 'pending_review'
        )
    );

DROP POLICY IF EXISTS post_tags_owner_pending_delete ON public.post_tags;
CREATE POLICY post_tags_owner_pending_delete ON public.post_tags
    FOR DELETE TO authenticated
    USING (
        private.is_active_member()
        AND EXISTS (
            SELECT 1
            FROM public.posts AS post_row
            WHERE post_row.id = post_id
              AND post_row.author_id = (SELECT auth.uid())
              AND post_row.status = 'pending_review'
        )
    );
