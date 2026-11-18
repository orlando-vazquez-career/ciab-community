"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");

  async function signOut() {
    setIsPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/identity/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) {
        setMessage("No se pudo cerrar la sesión.");
        return;
      }
      router.replace("/acceso");
      router.refresh();
    } catch {
      setMessage("No se pudo conectar con el servicio local de identidad.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="identity-signout">
      <button className="identity-secondary-button" disabled={isPending} onClick={signOut} type="button">
        {isPending ? "Saliendo…" : "Cerrar sesión"}
      </button>
      {message ? <span role="alert">{message}</span> : null}
    </div>
  );
}
