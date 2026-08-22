import { useAuth } from "@/context/AuthContext";

export function useAdminPermissions() {
  const { userProfile } = useAuth();
  const role = userProfile?.role;

  const isSuperAdmin = role === "super_admin" || role === "owner";
  const isBasicAdmin = role === "admin";
  const isAdmin = isSuperAdmin || isBasicAdmin;

  return {
    isSuperAdmin,
    isBasicAdmin,
    isAdmin,
    role,
    can: {
      // Both admin tiers
      manageCourses: isAdmin,
      manageExams: isAdmin,
      manageTasks: isAdmin,
      sendNotifications: isAdmin,
      manageStudentResults: isAdmin,
      approveSubmittedTasks: isAdmin,
      createAnnouncements: isAdmin,
      // Super Admin only
      manageUsers: isSuperAdmin,
      promoteAdmins: isSuperAdmin,
      manageMembership: isSuperAdmin,
      managePricing: isSuperAdmin,
      managePayments: isSuperAdmin,
      manageWallet: isSuperAdmin,
      manageSettings: isSuperAdmin,
      viewLogs: isSuperAdmin,
      viewAnalytics: isSuperAdmin,
      sendGifts: isSuperAdmin,
      manageAI: isSuperAdmin,
      manageFirebase: isSuperAdmin,
      deleteSuperAdmin: false, // No one can delete a super admin via UI
    },
  };
}
