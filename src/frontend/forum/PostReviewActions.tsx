"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ReviewDecision = "publish" | "reject";

type ApiResponse = { error?: { message?: string } };

export function PostReviewActions({ postId }: { postId: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function review() {
    if (!decision) return;
    if (decision === "reject" && !reason.trim()) {
      setMessage("Indica un motivo para rechazar la publicación.");
      return;
    }

    setIsPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/forum/review/${postId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ decision, reason }),
      });
      const body = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setMessage(body.error?.message ?? "No se pudo completar la revisión.");
        return;
      }
      setMessage(decision === "publish" ? "Publicación publicada." : "Envío rechazado.");
      setDecision(null);
      router.refresh();
    } catch {
      setMessage("No se pudo conectar con el servicio local del foro.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section aria-label="Acciones de revisión" className="forum-review-actions">
      <label htmlFor={`review-reason-${postId}`}>Motivo (obligatorio para rechazar)</label>
      <textarea
        id={`review-reason-${postId}`}
        maxLength={500}
        onChange={(event) => {
          setReason(event.target.value);
          setMessage("");
        }}
        rows={2}
        value={reason}
      />
      <div className="forum-review-buttons">
        <button disabled={isPending} onClick={() => { setDecision("publish"); setMessage(""); }} type="button">
          Publicar
        </button>
        <button className="forum-review-reject" disabled={isPending} onClick={() => { setDecision("reject"); setMessage(""); }} type="button">
          Rechazar
        </button>
      </div>
      {decision ? (
        <div className="forum-review-confirmation" role="group" aria-label="Confirmar revisión">
          <p aria-live="polite">
            {decision === "publish"
              ? "Confirma que esta publicación cumple los criterios editoriales."
              : "Confirma el rechazo. El motivo se guardará en la auditoría de moderación."}
          </p>
          <button disabled={isPending} onClick={review} type="button">
            {isPending ? "Guardando…" : "Confirmar"}
          </button>
          <button className="forum-review-cancel" disabled={isPending} onClick={() => setDecision(null)} type="button">
            Cancelar
          </button>
        </div>
      ) : null}
      {message ? <p className="forum-feedback" role="status">{message}</p> : null}
    </section>
  );
}
