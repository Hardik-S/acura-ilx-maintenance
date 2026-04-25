const MIN_PASSWORD_LENGTH = 12;
const BLOCKED_PASSWORDS = new Set(["pass123", "password", "password123", "123456789"]);

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateNewPassword(password: string, confirmation = password): PasswordValidationResult {
  const errors: string[] = [];
  const normalized = password.trim().toLowerCase();

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  if (BLOCKED_PASSWORDS.has(normalized)) {
    errors.push("Choose a stronger password than the temporary bootstrap password.");
  }

  if (password !== confirmation) {
    errors.push("Passwords must match.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
