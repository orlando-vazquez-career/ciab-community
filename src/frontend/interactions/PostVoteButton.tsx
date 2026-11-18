"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ApiResponse = { error?: { message?: string } };

export function PostVoteButton({ postId, hasVoted }: { postId: string; hasVoted: boolean }) {
  const router = useRouter();
  const [voted, setVoted] = useState(hasVoted);
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function vote() {
    setIsPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/forum/posts/${postId}/vote`, {
        method: "POST",
        credentials: "same-origin",
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setMessage(result.error?.message ?? "No se pudo registrar el voto.");
        return;
      }
      setVoted(true);
      setMessage("Tu voto positivo quedó registrado y no se puede retirar.");
      router.refresh();
    } catch {
      setMessage("No se pudo conectar con el servicio local del foro.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="forum-vote-control">
      <button disabled={voted || isPending} onClick={vote} type="button">
        {voted ? "Ya diste tu voto positivo" : isPending ? "Registrando…" : "Dar voto positivo"}
      </button>
      {message ? <p className="forum-feedback" role="status">{message}</p> : null}
    </div>
  );
}
