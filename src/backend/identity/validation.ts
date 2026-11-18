export type FieldErrors = Record<string, string>;

export const maxAvatarSizeBytes = 5 * 1024 * 1024;

export function validateAvatarImage(
  contentType: string,
  size: number,
  bytes: Uint8Array,
): boolean {
  if (size <= 0 || size > maxAvatarSizeBytes || size !== bytes.byteLength) return false;

  if (contentType === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (byte, index) => bytes[index] === byte,
    );
  }

  if (contentType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (contentType === "image/webp") {
    return (
      bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    );
  }

  return false;
}

export type RegistrationInput = {
  username: string;
  displayName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type ProfileUpdateInput = {
  username: string;
  displayName: string;
  bio: string;
};

export type MembershipActionInput = {
  action: "approve" | "suspend" | "change_role";
  reason: string;
  role?: "member" | "moderator" | "admin" | "superadmin";
};

export type ValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; fields: FieldErrors };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateRegistration(input: unknown): ValidationResult<RegistrationInput> {
  const values = isRecord(input) ? input : {};
  const username = readString(values.username).trim().toLowerCase();
  const displayName = readString(values.displayName).trim();
  const email = readString(values.email).trim().toLowerCase();
  const password = readString(values.password);
  const passwordConfirmation = readString(values.passwordConfirmation);
  const fields: FieldErrors = {};

  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    fields.username = "Usa de 3 a 24 letras minúsculas, números o guion bajo.";
  }
  if (displayName.length < 1 || displayName.length > 80) {
    fields.displayName = "El nombre visible debe tener entre 1 y 80 caracteres.";
  }
  if (!isEmail(email)) {
    fields.email = "Ingresa un correo electrónico válido.";
  }
  if (password.length < 8) {
    fields.password = "La contraseña debe tener al menos 8 caracteres.";
  }
  if (passwordConfirmation !== password) {
    fields.passwordConfirmation = "Las contraseñas no coinciden.";
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, fields };
  }

  return {
    valid: true,
    value: { username, displayName, email, password, passwordConfirmation },
  };
}

export function validateLogin(input: unknown): ValidationResult<LoginInput> {
  const values = isRecord(input) ? input : {};
  const email = readString(values.email).trim().toLowerCase();
  const password = readString(values.password);
  const fields: FieldErrors = {};

  if (!isEmail(email)) {
    fields.email = "Ingresa un correo electrónico válido.";
  }
  if (password.length === 0) {
    fields.password = "Ingresa tu contraseña.";
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, fields };
  }

  return { valid: true, value: { email, password } };
}

export function validateProfileUpdate(input: unknown): ValidationResult<ProfileUpdateInput> {
  const values = isRecord(input) ? input : {};
  const username = readString(values.username).trim().toLowerCase();
  const displayName = readString(values.displayName).trim();
  const bio = readString(values.bio).trim();
  const fields: FieldErrors = {};

  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    fields.username = "Usa de 3 a 24 letras minúsculas, números o guion bajo.";
  }
  if (displayName.length < 1 || displayName.length > 80) {
    fields.displayName = "El nombre visible debe tener entre 1 y 80 caracteres.";
  }
  if (bio.length > 500) {
    fields.bio = "La biografía no puede superar los 500 caracteres.";
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, fields };
  }

  return { valid: true, value: { username, displayName, bio } };
}

export function validateMembershipAction(
  input: unknown,
): ValidationResult<MembershipActionInput> {
  const values = isRecord(input) ? input : {};
  const action = readString(values.action);
  const reason = readString(values.reason).trim();
  const role = readString(values.role);
  const fields: FieldErrors = {};

  if (!["approve", "suspend", "change_role"].includes(action)) {
    fields.action = "La acción solicitada no es válida.";
  }
  if (reason.length > 500) {
    fields.reason = "El motivo no puede superar los 500 caracteres.";
  }
  if ((action === "suspend" || action === "change_role") && !reason) {
    fields.reason = "Indica el motivo de esta acción.";
  }
  if (
    action === "change_role" &&
    !["member", "moderator", "admin", "superadmin"].includes(role)
  ) {
    fields.role = "Selecciona un rol válido.";
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, fields };
  }

  if (action === "change_role") {
    return {
      valid: true,
      value: {
        action,
        reason,
        role: role as MembershipActionInput["role"],
      },
    };
  }

  return {
    valid: true,
    value: { action: action as "approve" | "suspend", reason },
  };
}
