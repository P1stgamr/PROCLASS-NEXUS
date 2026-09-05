export type AppRole = "student" | "teacher" | "moderator" | "admin" | "super_admin" | "owner";

const ROLE_ALIASES: Record<string, AppRole> = {
  student: "student",
  teacher: "teacher",
  moderator: "moderator",
  admin: "admin",
  "basic admin": "admin",
  basic_admin: "admin",
  "super admin": "super_admin",
  superadmin: "super_admin",
  super_admin: "super_admin",
  owner: "owner",
};

export function normalizeRole(role: unknown): AppRole {
  const normalized = String(role || "student").trim().toLowerCase().replace(/-/g, "_");
  return ROLE_ALIASES[normalized] || "student";
}

export function roleLabel(role: unknown): string {
  switch (normalizeRole(role)) {
    case "super_admin": return "Super Admin";
    case "admin": return "Basic Admin";
    case "owner": return "Owner";
    case "moderator": return "Moderator";
    case "teacher": return "Teacher";
    default: return "Student";
  }
}

export function isAdminRole(role: unknown): boolean {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "super_admin" || normalized === "owner";
}

export function isSuperAdminRole(role: unknown): boolean {
  const normalized = normalizeRole(role);
  return normalized === "super_admin" || normalized === "owner";
}

export function isTeacherRole(role: unknown): boolean {
  return normalizeRole(role) === "teacher";
}

export function isStudentRole(role: unknown): boolean {
  return normalizeRole(role) === "student";
}