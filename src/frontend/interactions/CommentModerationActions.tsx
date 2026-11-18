"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Action = "hide" | "delete" | "restore";
type ApiResponse = { error?: { message?: string } };

export function CommentModerationActions({
  commentId,
  status,
}: {
  commentId: string;
  status: "published" | "hidden" | "deleted";
}) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) return;
    setIsPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/forum/comments/${commentId}/moderate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action, reason }),
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setMessage(result.error?.message ?? "No se pudo completar la moderación.");
        return;
      }
      setAction(null);
      setReason("");
      setMessage("La decisión quedó registrada en la auditoría.");
      router.refresh();
    } catch {
      setMessage("No se pudo conectar con el servicio local del foro.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="forum-comment-moderation" aria-label="Moderación del comentario">
      <div className="forum-comment-form-actions">
        {status === "published" ? (
          <>
            <button className="forum-inline-action" onClick={() => setAction("hide")} type="button">Ocultar</button>
            <button className="forum-inline-action" onClick={() => setAction("delete")} type="button">Eliminar lógicamente</button>
          </>
        ) : <button className="forum-inline-action" onClick={() => setAction("restore")} type="button">Restaurar</button>}
      </div>
      {action ? (
        <form className="forum-report-form" onSubmit={submit}>
          <p>{action === "delete" ? "El contenido se conservará en la auditoría y dejará de mostrarse." : `Confirma la acción: ${action}.`}</p>
          <label htmlFor={`moderate-${commentId}`}>Motivo (obligatorio)</label>
          <textarea
            id={`moderate-${commentId}`}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            required
            rows={2}
            value={reason}
          />
          <div className="forum-comment-form-actions">
            <button disabled={isPending} type="submit">{isPending ? "Guardando…" : "Confirmar"}</button>
            <button className="forum-inline-action" disabled={isPending} onClick={() => setAction(null)} type="button">Cancelar</button>
          </div>
        </form>
      ) : null}
      {message ? <p className="forum-feedback" role="status">{message}</p> : null}
    </section>
  );
}
