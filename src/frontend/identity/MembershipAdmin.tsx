"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MembershipListItem, MemberRole } from "@/backend/identity/membership";

const statusLabels = { pending: "Pendiente", active: "Activa", suspended: "Suspendida" } as const;
const roleLabels = {
  member: "Miembro",
  moderator: "Moderador",
  admin: "Administrador",
  superadmin: "Superadministrador",
} as const;
const dateFormatter = new Intl.DateTimeFormat("es-BO", { dateStyle: "medium" });

function formatMembershipDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Sin fecha" : dateFormatter.format(date);
}

type MembershipAdminProps = {
  members: MembershipListItem[];
  currentUserId: string;
  currentRole: MemberRole;
  canAssignRoles: boolean;
};

function MembershipRow({
  member,
  currentUserId,
  canAssignRoles,
}: {
  member: MembershipListItem;
  currentUserId: string;
  canAssignRoles: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [role, setRole] = useState<MemberRole>(member.role);
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<"suspend" | "change_role" | null>(null);
  const isSelf = member.userId === currentUserId;

  function requestConfirmation(action: "suspend" | "change_role") {
    if (!reason.trim()) {
      setMessage("Indica un motivo para esta acción.");
      setConfirmingAction(null);
      return;
    }
    setMessage("");
    setConfirmingAction(action);
  }

  async function updateMembership(action: "approve" | "suspend" | "change_role") {
    if ((action === "suspend" || action === "change_role") && !reason.trim()) {
      setMessage("Indica un motivo para esta acción.");
      return;
    }

    setIsPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/membership/members/${member.userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action, reason, ...(action === "change_role" ? { role } : {}) }),
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setMessage(body.error?.message ?? "No se pudo actualizar la membresía.");
        return;
      }
      setMessage("Membresía actualizada.");
      setConfirmingAction(null);
      router.refresh();
    } catch {
      setMessage("No se pudo conectar con el servicio local de identidad.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <article className="membership-row">
      <div className="membership-row-heading">
        <div>
          <h3>{member.profile?.display_name ?? "Perfil sin nombre"}</h3>
          <p>@{member.profile?.username ?? "sin-usuario"}</p>
        </div>
        <span className={`membership-status membership-status-${member.status}`}>
          {statusLabels[member.status]}
        </span>
      </div>
      <dl className="membership-details">
        <div><dt>Rol</dt><dd>{roleLabels[member.role]}</dd></div>
        <div><dt>Solicitud</dt><dd>{formatMembershipDate(member.createdAt)}</dd></div>
        {member.approvedAt ? (
          <div><dt>Aprobación</dt><dd>{formatMembershipDate(member.approvedAt)}</dd></div>
        ) : null}
      </dl>
      {!isSelf ? (
        <div className="membership-row-actions">
          <label className="membership-reason-label" htmlFor={`reason-${member.userId}`}>
            Motivo de gestión
          </label>
          <textarea
            id={`reason-${member.userId}`}
            maxLength={500}
            onChange={(event) => {
              setReason(event.target.value);
              setConfirmingAction(null);
              setMessage("");
            }}
            autoComplete="off"
            rows={2}
            value={reason}
          />
          <span className="identity-note">Describe el motivo; es obligatorio para suspender o cambiar un rol.</span>
          <div className="membership-buttons">
            {member.status === "pending" ? (
              <button disabled={isPending} onClick={() => updateMembership("approve")} type="button">
                Aprobar
              </button>
            ) : null}
            {member.status !== "suspended" && (member.role === "member" || canAssignRoles) ? (
              <button className="membership-danger-button" disabled={isPending} onClick={() => requestConfirmation("suspend")} type="button">
                Suspender
              </button>
            ) : null}
            {canAssignRoles ? (
              <div className="membership-role-control">
                <label htmlFor={`role-${member.userId}`}>Asignar rol</label>
                <select
                  id={`role-${member.userId}`}
                  onChange={(event) => {
                    setRole(event.target.value as MemberRole);
                    setConfirmingAction(null);
                    setMessage("");
                  }}
                  value={role}
                >
                  <option value="member">Miembro</option>
                  <option value="moderator">Moderador</option>
                  <option value="admin">Administrador</option>
                  <option value="superadmin">Superadministrador</option>
                </select>
                <button disabled={isPending || role === member.role} onClick={() => requestConfirmation("change_role")} type="button">
                  Guardar rol
                </button>
              </div>
            ) : null}
          </div>
          {confirmingAction ? (
            <div aria-labelledby={`confirmation-${member.userId}`} className="membership-confirmation" role="group">
              <p aria-live="polite" id={`confirmation-${member.userId}`}>
                {confirmingAction === "suspend"
                  ? "Confirma la suspensión. No se puede revertir desde esta pantalla."
                  : `Confirma el cambio de rol a ${roleLabels[role]}.`}
              </p>
              <button disabled={isPending} onClick={() => updateMembership(confirmingAction)} type="button">
                {isPending ? "Guardando…" : "Confirmar acción"}
              </button>
              <button
                className="membership-cancel-button"
                disabled={isPending}
                onClick={() => setConfirmingAction(null)}
                type="button"
              >
                Cancelar
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="identity-note">No puedes cambiar tu propia membresía ni tu rol.</p>
      )}
      {message ? <p className="identity-feedback" role="status">{message}</p> : null}
    </article>
  );
}

export function MembershipAdmin({
  members,
  currentUserId,
  currentRole,
  canAssignRoles,
}: MembershipAdminProps) {
  const pendingCount = members.filter((member) => member.status === "pending").length;

  return (
    <section aria-labelledby="membership-admin-title" className="membership-admin">
      <div className="membership-admin-intro">
        <p className="eyebrow">GESTIÓN DE COMUNIDAD</p>
        <h1 id="membership-admin-title">Membresías</h1>
        <p>{pendingCount} solicitudes pendientes · sesión con rol {roleLabels[currentRole]}.</p>
      </div>
      {members.length ? (
        <div className="membership-list">
          {members.map((member) => (
            <MembershipRow
              canAssignRoles={canAssignRoles}
              currentUserId={currentUserId}
              key={member.userId}
              member={member}
            />
          ))}
        </div>
      ) : (
        <p className="identity-feedback">Todavía no hay solicitudes de membresía.</p>
      )}
      <p className="identity-note">
        El correo de autenticación no se muestra. Una suspensión no se puede revertir desde esta pantalla.
      </p>
    </section>
  );
}
