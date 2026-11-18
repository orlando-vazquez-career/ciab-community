"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type ApiResponse = { error?: { message?: string } };

export function CommentComposer({
  postId,
  parentId = null,
  canComment,
}: {
  postId: string;
  parentId?: string | null;
  canComment: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(parentId === null);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/forum/posts/${postId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ body, parentId }),
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setMessage(result.error?.message ?? "No se pudo publicar el comentario.");
        return;
      }
      setBody("");
      setMessage("Comentario publicado.");
      if (parentId) setIsOpen(false);
      router.refresh();
    } catch {
      setMessage("No se pudo conectar con el servicio local del foro.");
    } finally {
      setIsPending(false);
    }
  }

  if (!canComment) return null;
  if (parentId && !isOpen) {
    return <button className="forum-inline-action" onClick={() => setIsOpen(true)} type="button">Responder</button>;
  }

  return (
    <form className="forum-comment-form" onSubmit={submit}>
      <label htmlFor={`comment-${postId}-${parentId ?? "root"}`}>{parentId ? "Tu respuesta" : "Añadir un comentario"}</label>
      <textarea
        id={`comment-${postId}-${parentId ?? "root"}`}
        maxLength={10_000}
        onChange={(event) => setBody(event.target.value)}
        required
        rows={parentId ? 3 : 4}
        value={body}
      />
      <div className="forum-comment-form-actions">
        <button disabled={isPending} type="submit">{isPending ? "Publicando…" : "Publicar comentario"}</button>
        {parentId ? <button className="forum-inline-action" onClick={() => setIsOpen(false)} type="button">Cancelar</button> : null}
      </div>
      {message ? <p className="forum-feedback" role="status">{message}</p> : null}
    </form>
  );
}
