"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type ResolutionStatus = "reviewed" | "dismissed" | "actioned";
type ApiResponse = { error?: { message?: string } };

export function ReportResolutionActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<ResolutionStatus>("reviewed");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/forum/reports/${reportId}/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status, reason }),
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setMessage(result.error?.message ?? "No se pudo resolver el reporte.");
        return;
      }
      setMessage("Reporte resuelto y decisión auditada.");
      router.refresh();
    } catch {
      setMessage("No se pudo conectar con el servicio local del foro.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="forum-report-resolution" onSubmit={submit}>
      <label htmlFor={`report-status-${reportId}`}>Resolución</label>
      <select id={`report-status-${reportId}`} onChange={(event) => setStatus(event.target.value as ResolutionStatus)} value={status}>
        <option value="reviewed">Revisado</option>
        <option value="dismissed">Descartado</option>
        <option value="actioned">Acción realizada</option>
      </select>
      <label htmlFor={`report-reason-${reportId}`}>Nota de moderación</label>
      <textarea
        id={`report-reason-${reportId}`}
        maxLength={500}
        onChange={(event) => setReason(event.target.value)}
        required
        rows={2}
        value={reason}
      />
      <button disabled={isPending} type="submit">{isPending ? "Guardando…" : "Resolver reporte"}</button>
      {status === "actioned" ? <p className="forum-form-note">Esta resolución registra una acción ya realizada; ocultar o restaurar un comentario es un paso separado.</p> : null}
      {message ? <p className="forum-feedback" role="status">{message}</p> : null}
    </form>
  );
}
