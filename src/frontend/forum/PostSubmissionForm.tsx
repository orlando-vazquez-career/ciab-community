"use client";

import { useState, type FormEvent } from "react";
import type { ForumCategory } from "@/backend/forum/posts";

type FieldErrors = Record<string, string>;

type ApiResponse = {
  error?: { code?: string; message?: string; fields?: FieldErrors };
  status?: string;
};

export function PostSubmissionForm({ categories }: { categories: ForumCategory[] }) {
  const [kind, setKind] = useState<"news" | "discussion">("news");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setMessage("");
    setIsPending(true);

    const values = new FormData(event.currentTarget);
    const payload = Object.fromEntries(values.entries());
    try {
      const response = await fetch("/api/forum/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setFieldErrors(body.error?.fields ?? {});
        setMessage(body.error?.message ?? "No se pudo enviar la publicación.");
        return;
      }
      setIsSubmitted(true);
      setMessage("Tu envío quedó pendiente de revisión. No aparecerá en el foro hasta que un moderador lo publique.");
    } catch {
      setMessage("No se pudo conectar con el servicio local del foro.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="forum-form" onSubmit={submit}>
      <label htmlFor="post-kind">Tipo de publicación</label>
      <select
        id="post-kind"
        name="kind"
        onChange={(event) => {
          setKind(event.target.value as "news" | "discussion");
          setFieldErrors({});
        }}
        required
        value={kind}
      >
        <option value="news">Noticia</option>
        <option value="discussion">Debate</option>
      </select>

      <label htmlFor="post-title">Título</label>
      <input
        aria-describedby={fieldErrors.title ? "post-title-error" : undefined}
        aria-invalid={Boolean(fieldErrors.title)}
        autoComplete="off"
        id="post-title"
        maxLength={200}
        name="title"
        required
        type="text"
      />
      {fieldErrors.title ? <span className="forum-field-error" id="post-title-error">{fieldErrors.title}</span> : null}

      <label htmlFor="post-excerpt">Contexto breve</label>
      <textarea
        aria-describedby={fieldErrors.excerpt ? "post-excerpt-error" : "post-excerpt-note"}
        aria-invalid={Boolean(fieldErrors.excerpt)}
        id="post-excerpt"
        maxLength={500}
        name="excerpt"
        rows={3}
      />
      <span className="forum-form-note" id="post-excerpt-note">Hasta 500 caracteres. Resume por qué importa esta publicación.</span>
      {fieldErrors.excerpt ? <span className="forum-field-error" id="post-excerpt-error">{fieldErrors.excerpt}</span> : null}

      <label htmlFor="post-body">Contenido</label>
      <textarea
        aria-describedby={fieldErrors.body ? "post-body-error" : "post-body-note"}
        aria-invalid={Boolean(fieldErrors.body)}
        id="post-body"
        maxLength={50_000}
        name="body"
        required
        rows={10}
      />
      <span className="forum-form-note" id="post-body-note">Máximo 50 000 caracteres. El formato se conserva como texto seguro.</span>
      {fieldErrors.body ? <span className="forum-field-error" id="post-body-error">{fieldErrors.body}</span> : null}

      <label htmlFor="post-category">Categoría</label>
      <select
        aria-describedby={fieldErrors.categoryId ? "post-category-error" : undefined}
        aria-invalid={Boolean(fieldErrors.categoryId)}
        id="post-category"
        name="categoryId"
        required
      >
        <option value="">Selecciona una categoría</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>{category.name}</option>
        ))}
      </select>
      {fieldErrors.categoryId ? <span className="forum-field-error" id="post-category-error">{fieldErrors.categoryId}</span> : null}

      <fieldset className="forum-source-fieldset">
        <legend>Fuente {kind === "news" ? "(obligatoria para noticias)" : "(opcional para debates)"}</legend>
        <label htmlFor="post-source-url">URL de la fuente</label>
        <input
          aria-describedby={fieldErrors.sourceUrl ? "post-source-url-error" : "post-source-note"}
          aria-invalid={Boolean(fieldErrors.sourceUrl)}
          id="post-source-url"
          maxLength={2_048}
          name="sourceUrl"
          required={kind === "news"}
          type="url"
        />
        <span className="forum-form-note" id="post-source-note">Usa una dirección HTTP o HTTPS consultable por la comunidad.</span>
        {fieldErrors.sourceUrl ? <span className="forum-field-error" id="post-source-url-error">{fieldErrors.sourceUrl}</span> : null}

        <label htmlFor="post-source-class">Tipo de fuente</label>
        <select
          aria-describedby={fieldErrors.sourceClass ? "post-source-class-error" : undefined}
          aria-invalid={Boolean(fieldErrors.sourceClass)}
          id="post-source-class"
          name="sourceClass"
          required={kind === "news"}
        >
          <option value="">Selecciona el tipo</option>
          <option value="primary">Fuente primaria</option>
          <option value="institutional">Fuente institucional</option>
          <option value="specialized_media">Medio especializado</option>
          <option value="general_media">Medio general</option>
        </select>
        {fieldErrors.sourceClass ? <span className="forum-field-error" id="post-source-class-error">{fieldErrors.sourceClass}</span> : null}
      </fieldset>

      {message ? (
        <p className={isSubmitted ? "forum-feedback forum-feedback-success" : "forum-feedback"} role="status">
          {message}
        </p>
      ) : null}
      <button className="forum-submit-button" disabled={isPending || isSubmitted} type="submit">
        {isPending ? "Enviando…" : isSubmitted ? "Envío recibido" : "Enviar a revisión"}
      </button>
    </form>
  );
}
