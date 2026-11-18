"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type ApiResponse = { error?: { message?: string } };

export function ReportForm({
  targetType,
  targetId,
  canReport,
  isAuthenticated,
}: {
  targetType: "post" | "comment";
  targetId: string;
  canReport: boolean;
  isAuthenticated: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage("");
    const payload = targetType === "post"
      ? { postId: targetId, reason }
      : { commentId: targetId, reason };
    try {
      const response = await fetch("/api/forum/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setMessage(result.error?.message ?? "No se pudo registrar el reporte.");
        return;
      }
      setIsSent(true);
      setIsOpen(false);
      setMessage("Reporte recibido. La moderación revisará el contenido.");
    } catch {
      setMessage("No se pudo conectar con el servicio local del foro.");
    } finally {
      setIsPending(false);
    }
  }

  if (!canReport) {
    return isAuthenticated
      ? <p className="forum-form-note">Los reportes están disponibles para miembros activos.</p>
      : <p className="forum-form-note"><Link href="/acceso">Inicia sesión</Link> para reportar contenido.</p>;
  }
  if (isSent) return <p className="forum-feedback" role="status">{message}</p>;
  if (!isOpen) {
    return <button className="forum-inline-action" onClick={() => setIsOpen(true)} type="button">Reportar</button>;
  }

  return (
    <form className="forum-report-form" onSubmit={submit}>
      <label htmlFor={`report-${targetType}-${targetId}`}>Motivo del reporte</label>
      <textarea
        id={`report-${targetType}-${targetId}`}
        maxLength={1000}
        onChange={(event) => setReason(event.target.value)}
        required
        rows={3}
        value={reason}
      />
      <div className="forum-comment-form-actions">
        <button disabled={isPending} type="submit">{isPending ? "Enviando…" : "Enviar reporte"}</button>
        <button className="forum-inline-action" disabled={isPending} onClick={() => setIsOpen(false)} type="button">Cancelar</button>
      </div>
      {message ? <p className="forum-feedback" role="status">{message}</p> : null}
    </form>
  );
}
