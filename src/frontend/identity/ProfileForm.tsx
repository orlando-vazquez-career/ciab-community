"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type ProfileFormValues = {
  username: string;
  display_name: string;
  bio: string;
};

type ResponseBody = {
  error?: { message?: string; fields?: Record<string, string> };
};

const fieldIds: Record<string, string> = {
  username: "profile-username",
  displayName: "profile-display-name",
  bio: "profile-bio",
};

export function ProfileForm({
  profile,
  avatarUrl,
}: {
  profile: ProfileFormValues;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarPending, setAvatarPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFieldErrors({});
    setSaved(false);
    setIsPending(true);

    const values = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/membership/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          username: values.get("username"),
          displayName: values.get("displayName"),
          bio: values.get("bio"),
        }),
      });
      const body = (await response.json()) as ResponseBody;
      if (!response.ok) {
        setMessage(body.error?.message ?? "No se pudo guardar el perfil.");
        const errors = body.error?.fields ?? {};
        setFieldErrors(errors);
        const firstError = Object.keys(errors)[0];
        if (firstError && fieldIds[firstError]) {
          window.requestAnimationFrame(() => document.getElementById(fieldIds[firstError])?.focus());
        }
        return;
      }
      setSaved(true);
      setMessage("Perfil actualizado.");
    } catch {
      setMessage("No se pudo conectar con el servicio local de identidad.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleAvatarSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAvatarMessage("");
    const form = new FormData(event.currentTarget);
    const avatar = form.get("avatar");
    if (!(avatar instanceof File)) {
      setAvatarMessage("Selecciona una imagen antes de continuar.");
      return;
    }

    setAvatarPending(true);
    try {
      const response = await fetch("/api/membership/avatar", {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      const body = (await response.json()) as ResponseBody;
      if (!response.ok) {
        setAvatarMessage(body.error?.fields?.avatar ?? body.error?.message ?? "No se pudo actualizar el avatar.");
        return;
      }
      setAvatarMessage("Avatar actualizado.");
      router.refresh();
    } catch {
      setAvatarMessage("No se pudo conectar con el servicio local de identidad.");
    } finally {
      setAvatarPending(false);
    }
  }

  return (
    <div className="profile-editor">
      <section aria-labelledby="profile-avatar-title" className="profile-avatar-section">
        <div aria-hidden="true" className="profile-avatar-preview">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" src={avatarUrl} />
          ) : <span>CIAB</span>}
        </div>
        <form className="profile-avatar-form identity-form" onSubmit={handleAvatarSubmit}>
          <h2 id="profile-avatar-title">Imagen de perfil</h2>
          <label htmlFor="profile-avatar">Subir avatar</label>
          <input
            accept="image/png,image/jpeg,image/webp"
            id="profile-avatar"
            name="avatar"
            required
            type="file"
            aria-describedby="profile-avatar-note"
          />
          <span className="identity-note" id="profile-avatar-note">
            PNG, JPEG o WebP; máximo 5 MiB. La imagen será pública junto a tu perfil.
          </span>
          {avatarMessage ? <p className="identity-feedback" role="status">{avatarMessage}</p> : null}
          <button className="access-submit-button" disabled={avatarPending} type="submit">
            {avatarPending ? "Subiendo…" : "Actualizar avatar"}
          </button>
        </form>
      </section>

      <form className="profile-form identity-form" onSubmit={handleSubmit}>
        <div className="access-field-group">
          <label htmlFor="profile-username">Nombre de usuario</label>
          <input
            autoComplete="username"
            defaultValue={profile.username}
            id="profile-username"
            maxLength={24}
            minLength={3}
            name="username"
            pattern="[A-Za-z0-9_]{3,24}"
            aria-describedby={fieldErrors.username ? "profile-username-error" : undefined}
            aria-invalid={Boolean(fieldErrors.username)}
            required
            spellCheck={false}
          />
          {fieldErrors.username ? <span className="identity-field-error" id="profile-username-error" role="alert">{fieldErrors.username}</span> : null}
        </div>
        <div className="access-field-group">
          <label htmlFor="profile-display-name">Nombre visible</label>
          <input
            autoComplete="name"
            defaultValue={profile.display_name}
            id="profile-display-name"
            maxLength={80}
            name="displayName"
            aria-describedby={fieldErrors.displayName ? "profile-display-name-error" : undefined}
            aria-invalid={Boolean(fieldErrors.displayName)}
            required
          />
          {fieldErrors.displayName ? (
            <span className="identity-field-error" id="profile-display-name-error" role="alert">{fieldErrors.displayName}</span>
          ) : null}
        </div>
        <div className="access-field-group">
          <label htmlFor="profile-bio">Biografía</label>
          <textarea
            defaultValue={profile.bio}
            id="profile-bio"
            maxLength={500}
            name="bio"
            rows={5}
            autoComplete="off"
            aria-describedby={fieldErrors.bio ? "profile-bio-error" : undefined}
            aria-invalid={Boolean(fieldErrors.bio)}
          />
          <span className="identity-note">Hasta 500 caracteres. El correo no aparece en el perfil público.</span>
          {fieldErrors.bio ? <span className="identity-field-error" id="profile-bio-error" role="alert">{fieldErrors.bio}</span> : null}
        </div>
        {message ? (
          <p
            className={`identity-feedback ${saved ? "identity-feedback-success" : "identity-feedback-error"}`}
            role={saved ? "status" : "alert"}
          >
            {message}
          </p>
        ) : null}
        <button className="access-submit-button" disabled={isPending} type="submit">
          {isPending ? "Guardando…" : "Guardar perfil"}
        </button>
      </form>
    </div>
  );
}
