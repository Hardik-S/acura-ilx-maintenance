export type UserRole = "admin" | "user";
export type ThemePreference = "light" | "dark" | "system";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  theme: ThemePreference;
  mustChangePassword: boolean;
}

export function mapProfile(row: {
  id: string;
  email: string;
  full_name: string;
  preferences: unknown;
  force_password_change: boolean;
}, role: UserRole): UserProfile {
  const preferences = row.preferences && typeof row.preferences === "object" ? row.preferences : {};
  const theme = "theme" in preferences ? preferences.theme : "system";

  return {
    id: row.id,
    email: row.email,
    displayName: row.full_name,
    role,
    theme: theme === "light" || theme === "dark" || theme === "system" ? theme : "system",
    mustChangePassword: row.force_password_change,
  };
}
