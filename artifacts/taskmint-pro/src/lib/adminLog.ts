import { push, ref } from "firebase/database";
import { db } from "@/firebase";

export type AdminAction =
  | "user.ban" | "user.unban" | "user.suspend" | "user.unsuspend"
  | "user.promote" | "user.demote" | "user.verify" | "user.edit" | "user.delete"
  | "exam.create" | "exam.edit" | "exam.delete" | "exam.publish" | "exam.unpublish" | "exam.duplicate"
  | "task.create" | "task.edit" | "task.delete"
  | "mission.create" | "mission.edit" | "mission.delete"
  | "course.create" | "course.edit" | "course.delete"
  | "quiz.create" | "quiz.edit" | "quiz.delete"
  | "challenge.create" | "challenge.edit" | "challenge.delete"
  | "question.create" | "question.edit" | "question.delete" | "question.import"
  | "test.create" | "test.edit" | "test.delete"
  | "community.approve" | "community.reject" | "community.withdraw.approved" | "community.withdraw.rejected"
  | "membership.create" | "membership.edit" | "membership.delete" | "membership.toggle"
  | "membership.grant" | "membership.extend" | "membership.revoke"
  | "payment.approve" | "payment.reject"
  | "withdraw.approve" | "withdraw.reject"
  | "notification.send" | "gift.send"
  | "prize.paid" | "settings.update";

export async function logAdminAction(
  adminUid: string,
  adminName: string,
  action: AdminAction,
  target?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await push(ref(db, "adminLogs"), {
      adminUid,
      adminName,
      action,
      target: target ?? null,
      details: details ?? null,
      timestamp: Date.now(),
    });
  } catch {
    // Log failures must never break the main action
  }
}
