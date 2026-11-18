"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type ResponseBody = {
  message?: string;
  confirmationRequired?: boolean;
  error?: { message?: string; fields?: Record<string, string> };
};

const fieldIds: Record<string, string> = {
  username: "member-username",
  displayName: "member-display-name",
  email: "registration-email",
  password: "registration-password",
  passwordConfirmation: "registration-password-confirmation",
};

export function RegistrationForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFieldErrors({});
    setIsSuccess(false);
    setIsPending(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const response = await fetch("/api/identity/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          username: formData.get("username"),
          displayName: formData.get("displayName"),
          email: formData.get("email"),
          password: formData.get("password"),
          passwordConfirmation: formData.get("passwordConfirmation"),
        }),
      });
      const body = (await response.json()) as ResponseBody;

      if (!response.ok) {
        setMessage(body.error?.message ?? "No se pudo completar el registro.");
        const errors = body.error?.fields ?? {};
        setFieldErrors(errors);
        const firstError = Object.keys(errors)[0];
        if (firstError && fieldIds[firstError]) {
          window.requestAnimationFrame(() => document.getElementById(fieldIds[firstError])?.focus());
        }
        return;
      }

      if (!body.confirmationRequired) {
        router.replace("/miembro");
        router.refresh();
        return;
      }

      setIsSuccess(true);
      setMessage(
        body.message ?? "Revisa el correo de confirmación. Tu membresía empezará pendiente.",
      );
      form.reset();
    } catch {
      setMessage("No se pudo conectar con el servicio local de identidad.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form aria-describedby="registration-status" className="identity-form" onSubmit={handleSubmit}>
      <p className="registration-card-copy" id="registration-status" role="status" aria-live="polite">
        Crea tu cuenta. La membresía inicia en estado pendiente y requiere aprobación.
      </p>
      <div className="access-field-group">
        <label htmlFor="member-username">Nombre de usuario</label>
        <input
          autoComplete="username"
          id="member-username"
          maxLength={24}
          minLength={3}
          name="username"
          pattern="[A-Za-z0-9_]{3,24}"
          aria-describedby={fieldErrors.username ? "member-username-error" : undefined}
          aria-invalid={Boolean(fieldErrors.username)}
          required
          spellCheck={false}
          title="De 3 a 24 letras, números o guion bajo."
        />
        {fieldErrors.username ? <span className="identity-field-error" id="member-username-error" role="alert">{fieldErrors.username}</span> : null}
      </div>
      <div className="access-field-group">
        <label htmlFor="member-display-name">Nombre visible</label>
        <input
          autoComplete="name"
          id="member-display-name"
          maxLength={80}
          name="displayName"
          aria-describedby={fieldErrors.displayName ? "member-display-name-error" : undefined}
          aria-invalid={Boolean(fieldErrors.displayName)}
          required
        />
        {fieldErrors.displayName ? <span className="identity-field-error" id="member-display-name-error" role="alert">{fieldErrors.displayName}</span> : null}
      </div>
      <div className="access-field-group">
        <label htmlFor="registration-email">Correo electrónico</label>
        <input
          autoComplete="email"
          id="registration-email"
          maxLength={254}
          name="email"
          aria-describedby={fieldErrors.email ? "registration-email-error" : undefined}
          aria-invalid={Boolean(fieldErrors.email)}
          required
          spellCheck={false}
          type="email"
        />
        {fieldErrors.email ? <span className="identity-field-error" id="registration-email-error" role="alert">{fieldErrors.email}</span> : null}
      </div>
      <div className="access-field-group">
        <label htmlFor="registration-password">Contraseña</label>
        <input
          autoComplete="new-password"
          id="registration-password"
          minLength={8}
          name="password"
          aria-describedby={fieldErrors.password ? "registration-password-error" : undefined}
          aria-invalid={Boolean(fieldErrors.password)}
          required
          type="password"
        />
        {fieldErrors.password ? <span className="identity-field-error" id="registration-password-error" role="alert">{fieldErrors.password}</span> : null}
      </div>
      <div className="access-field-group">
        <label htmlFor="registration-password-confirmation">Confirmar contraseña</label>
        <input
          autoComplete="new-password"
          id="registration-password-confirmation"
          minLength={8}
          name="passwordConfirmation"
          aria-describedby={fieldErrors.passwordConfirmation ? "registration-password-confirmation-error" : undefined}
          aria-invalid={Boolean(fieldErrors.passwordConfirmation)}
          required
          type="password"
        />
        {fieldErrors.passwordConfirmation ? (
          <span className="identity-field-error" id="registration-password-confirmation-error" role="alert">{fieldErrors.passwordConfirmation}</span>
        ) : null}
      </div>
      {message ? (
        <p
          className={`identity-feedback ${isSuccess ? "identity-feedback-success" : "identity-feedback-error"}`}
          role={isSuccess ? "status" : "alert"}
        >
          {message}
        </p>
      ) : null}
      <button className="access-submit-button" disabled={isPending} type="submit">
        {isPending ? "Enviando…" : "Crear cuenta"}
      </button>
      <p className="identity-note">
        El correo se usa para autenticar la cuenta y no se muestra en el perfil público.
      </p>
      <p className="identity-note">
        El registro requiere Supabase local habilitado. La aplicación no se conecta a proyectos remotos.
      </p>
    </form>
  );
}
