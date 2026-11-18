"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type ResponseBody = {
  error?: { message?: string; fields?: Record<string, string> };
};

export function AccessForm({ initialMessage = "" }: { initialMessage?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState(initialMessage);
  const [isError, setIsError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage("");
    setIsError(false);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/identity/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const body = (await response.json()) as ResponseBody;

      if (!response.ok) {
        setIsError(true);
        setMessage(body.error?.message ?? "No se pudo iniciar sesión.");
        const errors = body.error?.fields ?? {};
        setFieldErrors(errors);
        const firstError = Object.keys(errors)[0];
        const fieldIds: Record<string, string> = {
          email: "member-email",
          password: "member-password",
        };
        if (firstError && fieldIds[firstError]) {
          window.requestAnimationFrame(() => document.getElementById(fieldIds[firstError])?.focus());
        }
        return;
      }

      router.push("/miembro");
      router.refresh();
    } catch {
      setIsError(true);
      setMessage("No se pudo conectar con el servicio local de identidad.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form aria-describedby="access-status" className="identity-form" onSubmit={handleSubmit}>
      <p
        className="access-card-copy"
        id="access-status"
        role={isError ? "alert" : "status"}
        aria-live="polite"
      >
        {message || "Ingresa con el correo de tu cuenta de CIAB Community."}
      </p>
      <div className="access-field-group">
        <label htmlFor="member-email">Correo electrónico</label>
        <input
          autoComplete="email"
          id="member-email"
          maxLength={254}
          name="email"
          aria-describedby={fieldErrors.email ? "member-email-error" : undefined}
          aria-invalid={Boolean(fieldErrors.email)}
          required
          spellCheck={false}
          type="email"
        />
        {fieldErrors.email ? <span className="identity-field-error" id="member-email-error" role="alert">{fieldErrors.email}</span> : null}
      </div>
      <div className="access-field-group">
        <label htmlFor="member-password">Contraseña</label>
        <input
          autoComplete="current-password"
          id="member-password"
          name="password"
          aria-describedby={fieldErrors.password ? "member-password-error" : undefined}
          aria-invalid={Boolean(fieldErrors.password)}
          required
          type="password"
        />
        {fieldErrors.password ? <span className="identity-field-error" id="member-password-error" role="alert">{fieldErrors.password}</span> : null}
      </div>
      <button className="access-submit-button" disabled={isPending} type="submit">
        {isPending ? "Ingresando…" : "Iniciar sesión"}
      </button>
      <p className="identity-note">
        Este acceso requiere Supabase local habilitado. La aplicación no se conecta a proyectos remotos.
      </p>
    </form>
  );
}
