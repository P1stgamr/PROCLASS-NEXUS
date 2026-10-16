import { Router, type IRouter } from "express";
import {
  CreateCommunityCourseBody,
  CreateCommunityCoursePurchaseRequestBody,
  CreateCommunityCoursePurchaseRequestResponse,
  CreateCommunityCourseResponse,
  DecideCommunityCoursePaymentBody,
  DecideCommunityCoursePaymentResponse,
  DecideCommunityWithdrawalBody,
  DecideCommunityWithdrawalResponse,
  GetCommunityCourseAccessResponse,
  EnrollInFreeCommunityCourseResponse,
  GetCommunityCourseContentResponse,
  GetCommunityRevenueResponse,
  RequestCommunityWithdrawalBody,
  RequestCommunityWithdrawalResponse,
  UpdateCommunityCourseBody,
  UpdateCommunityCourseResponse,
} from "@workspace/api-zod";
import { adminDb } from "../lib/firebaseAdmin";
import { requireFirebaseAuth, type AuthenticatedRequest } from "../lib/firebaseAuth";

const router: IRouter = Router();
const ADMIN_ROLES = new Set(["admin", "super_admin", "owner"]);
const MIN_WITHDRAWAL = 100;

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isValidCourseId(value: string) {
  return Boolean(value) && ![".", "#", "$", "/", "[", "]"].some((character) => value.includes(character));
}

async function getProfile(uid: string) {
  const snapshot = await adminDb.ref(`users/${uid}`).get();
  return snapshot.val() as Record<string, any> | null;
}

async function getOwnedCommunity(uid: string): Promise<(Record<string, any> & { id: string }) | null> {
  const profile = await getProfile(uid);
  const communityId = String(profile?.communityId || "");
  if (!isValidCourseId(communityId)) return null;
  const snapshot = await adminDb.ref(`communities/${communityId}`).get();
  const community = snapshot.val() as Record<string, any> | null;
  if (!community || community.ownerUid !== uid || community.status !== "active") return null;
  return { id: communityId, ...community };
}

async function hasAdminAccess(uid: string) {
  const profile = await getProfile(uid);
  return ADMIN_ROLES.has(String(profile?.role || ""));
}

function validateCourseInput(data: ReturnType<typeof CreateCommunityCourseBody.parse>) {
  if (!data.title.trim()) return "Course title is required";
  if (data.price > 0 && data.price < 1) return "Course price must be at least ৳1";
  for (const module of data.modules) {
    for (const lesson of module.lessons) {
      for (const question of lesson.quizQuestions || []) {
        if (question.correctAnswer >= question.options.length) {
          return "A quiz answer must point to an available option";
        }
      }
    }
  }
  return null;
}

function courseFields(
  data: ReturnType<typeof CreateCommunityCourseBody.parse>,
  ownerUid: string,
  community: Record<string, any> & { id: string },
  status: "pending" | "published",
) {
  const lessonCount = data.modules.reduce((total, module) => total + module.lessons.length, 0);
  return {
    title: data.title.trim(),
    desc: data.description.trim(),
    instructor: data.instructor.trim(),
    type: data.price === 0 ? "free" : "premium",
    price: data.price,
    tag: data.tag.trim(),
    category: data.tag.trim(),
    grade: data.grade.trim() || null,
    duration: data.duration.trim(),
    lessons: lessonCount,
    moduleCount: data.modules.length,
    thumbnail: data.thumbnail,
    ownerUid,
    communityId: community.id,
    communityName: String(community.name || "Community academy"),
    communityLogo: community.logo || null,
    sellerType: "community",
    status,
    updatedAt: Date.now(),
  };
}

function hasCourseEnrollment(value: any) {
  return value?.status === "enrolled" ||
    value?.paymentStatus === "free" ||
    value?.paymentStatus === "approved";
}

async function countCourseEnrollment(courseId: string, uid: string) {
  const counterRef = adminDb.ref(`communityCourseEnrollmentCounts/${courseId}`);
  const result = await counterRef.transaction((current: any) => {
    const record = current || {};
    if (record.students?.[uid]) return record;
    return {
      count: Number(record.count || 0) + 1,
      students: { ...(record.students || {}), [uid]: true },
    };
  });
  if (result.committed) {
    await adminDb.ref(`courses/${courseId}/students`).set(Number(result.snapshot.child("count").val() || 0));
  }
}

async function assertAdmin(req: AuthenticatedRequest, res: any) {
  if (!req.firebaseUser || !(await hasAdminAccess(req.firebaseUser.uid))) {
    res.status(403).json({ error: "Admin access is required" });
    return false;
  }
  return true;
}

router.post(
  "/community/courses",
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const parsed = CreateCommunityCourseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const invalid = validateCourseInput(parsed.data);
    if (invalid) {
      res.status(400).json({ error: invalid });
      return;
    }
    const community = await getOwnedCommunity(req.firebaseUser!.uid);
    if (!community) {
      res.status(403).json({ error: "An active community owner account is required" });
      return;
    }

    const approvalSnapshot = await adminDb.ref("platformSettings/requireApprovalCommunityCourses").get();
    const approvalRequired = approvalSnapshot.exists()
      ? approvalSnapshot.val() === true
      : true;
    const status = approvalRequired ? "pending" : "published";
    const courseRef = adminDb.ref("courses").push();
    if (!courseRef.key) {
      res.status(500).json({ error: "Could not create course ID" });
      return;
    }

    const course = {
      ...courseFields(parsed.data, req.firebaseUser!.uid, community, status),
      students: 0,
      rating: 5,
      createdAt: Date.now(),
    };
    await adminDb.ref().update({
      [`courses/${courseRef.key}`]: course,
      [`communityCourseContents/${courseRef.key}`]: {
        ownerUid: req.firebaseUser!.uid,
        communityId: community.id,
        modules: parsed.data.modules,
      },
    });
    res.status(201).json(CreateCommunityCourseResponse.parse({
      id: courseRef.key,
      status,
      approvalRequired,
    }));
  },
);

router.patch(
  "/community/courses/:courseId",
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const courseId = param(req.params.courseId);
    if (!courseId || !isValidCourseId(courseId)) {
      res.status(400).json({ error: "Invalid course ID" });
      return;
    }
    const parsed = UpdateCommunityCourseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const invalid = validateCourseInput(parsed.data);
    if (invalid) {
      res.status(400).json({ error: invalid });
      return;
    }
    const [courseSnapshot, community] = await Promise.all([
      adminDb.ref(`courses/${courseId}`).get(),
      getOwnedCommunity(req.firebaseUser!.uid),
    ]);
    const course = courseSnapshot.val();
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    if (
      !community ||
      course.sellerType !== "community" ||
      course.ownerUid !== req.firebaseUser!.uid ||
      course.communityId !== community.id
    ) {
      res.status(403).json({ error: "The course is not owned by this community" });
      return;
    }

    const approvalSnapshot = await adminDb.ref("platformSettings/requireApprovalCommunityCourses").get();
    const approvalRequired = approvalSnapshot.exists()
      ? approvalSnapshot.val() === true
      : true;
    const status = approvalRequired ? "pending" : "published";
    const fields = courseFields(parsed.data, req.firebaseUser!.uid, community, status);
    await adminDb.ref().update({
      [`courses/${courseId}`]: { ...course, ...fields },
      [`communityCourseContents/${courseId}`]: {
        ownerUid: req.firebaseUser!.uid,
        communityId: community.id,
        modules: parsed.data.modules,
      },
    });
    res.json(UpdateCommunityCourseResponse.parse({ id: courseId, status, approvalRequired }));
  },
);

router.get(
  "/community/courses/:courseId/access",
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const courseId = param(req.params.courseId);
    if (!courseId || !isValidCourseId(courseId)) {
      res.status(400).json({ error: "Invalid course ID" });
      return;
    }
    const uid = req.firebaseUser!.uid;
    const [courseSnapshot, enrollmentSnapshot, profile, adminAccess] = await Promise.all([
      adminDb.ref(`courses/${courseId}`).get(),
      adminDb.ref(`courseEnrollments/${courseId}/${uid}`).get(),
      getProfile(uid),
      hasAdminAccess(uid),
    ]);
    const course = courseSnapshot.val();
    if (!course || course.sellerType !== "community") {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    const isOwner = course.ownerUid === uid;
    if (course.status !== "published" && !isOwner && !adminAccess) {
      res.status(404).json({ error: "Course is not available" });
      return;
    }
    if (!isOwner && !adminAccess && String(profile?.role || "") !== "student") {
      res.status(403).json({ error: "Student access is required" });
      return;
    }

    const enrolled = hasCourseEnrollment(enrollmentSnapshot.val());
    let purchasePending = false;
    if (!enrolled && !isOwner && !adminAccess) {
      const paymentSnapshot = await adminDb
        .ref("paymentRequests")
        .orderByChild("uid")
        .equalTo(uid)
        .get();
      const requests = paymentSnapshot.val() as Record<string, any> | null;
      purchasePending = Object.values(requests || {}).some(
        (request) =>
          request?.courseId === courseId &&
          request?.type === "course" &&
          request?.sellerType === "community" &&
          request?.status === "pending",
      );
    }
    res.json(GetCommunityCourseAccessResponse.parse({ enrolled, purchasePending }));
  },
);

router.get(
  "/community/courses/:courseId/content",
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const courseId = param(req.params.courseId);
    if (!courseId || !isValidCourseId(courseId)) {
      res.status(400).json({ error: "Invalid course ID" });
      return;
    }
    const [courseSnapshot, enrollmentSnapshot, adminAccess] = await Promise.all([
      adminDb.ref(`courses/${courseId}`).get(),
      adminDb.ref(`courseEnrollments/${courseId}/${req.firebaseUser!.uid}`).get(),
      hasAdminAccess(req.firebaseUser!.uid),
    ]);
    const course = courseSnapshot.val();
    if (!course || course.sellerType !== "community") {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    const isOwner = course.ownerUid === req.firebaseUser!.uid;
    if (course.status !== "published" && !isOwner && !adminAccess) {
      res.status(404).json({ error: "Course is not available" });
      return;
    }
    if (!isOwner && !adminAccess && !hasCourseEnrollment(enrollmentSnapshot.val())) {
      res.status(403).json({ error: "Enrollment is required" });
      return;
    }

    const contentSnapshot = await adminDb.ref(`communityCourseContents/${courseId}/modules`).get();
    const modules = contentSnapshot.val();
    res.json(GetCommunityCourseContentResponse.parse({
      modules: Array.isArray(modules) ? modules : modules ? Object.values(modules) : [],
    }));
  },
);

router.post(
  "/community/courses/:courseId/enroll",
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const courseId = param(req.params.courseId);
    if (!courseId || !isValidCourseId(courseId)) {
      res.status(400).json({ error: "Invalid course ID" });
      return;
    }
    const [courseSnapshot, profile] = await Promise.all([
      adminDb.ref(`courses/${courseId}`).get(),
      getProfile(req.firebaseUser!.uid),
    ]);
    const course = courseSnapshot.val();
    if (!course || course.sellerType !== "community" || course.status !== "published") {
      res.status(404).json({ error: "Course is not available" });
      return;
    }
    if (Number(course.price || 0) > 0) {
      res.status(409).json({ error: "This course requires payment" });
      return;
    }
    if (String(profile?.role || "") !== "student") {
      res.status(403).json({ error: "Student access is required" });
      return;
    }
    const enrollmentRef = adminDb.ref(`courseEnrollments/${courseId}/${req.firebaseUser!.uid}`);
    const claim = await enrollmentRef.transaction((current) => current || {
      uid: req.firebaseUser!.uid,
      courseId,
      communityId: course.communityId,
      status: "enrolled",
      paymentStatus: "free",
      enrolledAt: Date.now(),
    });
    if (claim.committed && claim.snapshot.val()?.paymentStatus === "free") {
      await countCourseEnrollment(courseId, req.firebaseUser!.uid);
    }
    res.json(EnrollInFreeCommunityCourseResponse.parse({ status: "enrolled" }));
  },
);

router.post(
  "/community/courses/:courseId/purchase-requests",
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const courseId = param(req.params.courseId);
    if (!courseId || !isValidCourseId(courseId)) {
      res.status(400).json({ error: "Invalid course ID" });
      return;
    }
    const parsed = CreateCommunityCoursePurchaseRequestBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const uid = req.firebaseUser!.uid;
    const [courseSnapshot, profile, enrollmentSnapshot] = await Promise.all([
      adminDb.ref(`courses/${courseId}`).get(),
      getProfile(uid),
      adminDb.ref(`courseEnrollments/${courseId}/${uid}`).get(),
    ]);
    const course = courseSnapshot.val();
    if (!course || course.sellerType !== "community" || course.status !== "published") {
      res.status(404).json({ error: "Course is not available" });
      return;
    }
    if (String(profile?.role || "") !== "student") {
      res.status(403).json({ error: "Student access is required" });
      return;
    }
    if (Number(course.price || 0) <= 0 || enrollmentSnapshot.exists()) {
      res.status(409).json({ error: "This course does not need a new payment request" });
      return;
    }

    const paymentSnapshot = await adminDb
      .ref("paymentRequests")
      .orderByChild("uid")
      .equalTo(uid)
      .get();
    const existing = paymentSnapshot.val() as Record<string, any> | null;
    if (existing && Object.values(existing).some(
      (request) => request?.courseId === courseId && request?.status === "pending",
    )) {
      res.status(409).json({ error: "A payment request for this course is already pending" });
      return;
    }
    const requestRef = adminDb.ref("paymentRequests").push();
    if (!requestRef.key) {
      res.status(500).json({ error: "Could not create payment request" });
      return;
    }
    await requestRef.set({
      type: "course",
      sellerType: "community",
      uid,
      userName: String(profile?.name || "Student"),
      courseId,
      courseTitle: course.title,
      communityId: course.communityId,
      ownerUid: course.ownerUid,
      amount: Number(course.price),
      txnId: parsed.data.transactionId.trim(),
      bkashNumber: parsed.data.bkashNumber.trim(),
      status: "pending",
      createdAt: Date.now(),
    });
    res.status(201).json(CreateCommunityCoursePurchaseRequestResponse.parse({
      id: requestRef.key,
      status: "pending",
    }));
  },
);

router.patch(
  "/admin/course-payment-requests/:requestId",
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    if (!(await assertAdmin(req, res))) return;
    const requestId = param(req.params.requestId);
    const parsed = DecideCommunityCoursePaymentBody.safeParse(req.body);
    if (!requestId || !isValidCourseId(requestId) || !parsed.success) {
      res.status(400).json({ error: parsed.success ? "Invalid request ID" : parsed.error.message });
      return;
    }
    const requestRef = adminDb.ref(`paymentRequests/${requestId}`);
    const requestSnapshot = await requestRef.get();
    const request = requestSnapshot.val();
    if (!request || request.type !== "course" || request.sellerType !== "community") {
      res.status(404).json({ error: "Course payment request not found" });
      return;
    }
    if (request.status !== "pending") {
      res.status(409).json({ error: "Payment request has already been processed" });
      return;
    }
    const timestamp = Date.now();
    if (parsed.data.action === "reject") {
      await requestRef.update({ status: "rejected", processedAt: timestamp, processedBy: req.firebaseUser!.uid });
      res.json(DecideCommunityCoursePaymentResponse.parse({ id: requestId, status: "rejected" }));
      return;
    }

    const [courseSnapshot, communitySnapshot] = await Promise.all([
      adminDb.ref(`courses/${request.courseId}`).get(),
      adminDb.ref(`communities/${request.communityId}`).get(),
    ]);
    const course = courseSnapshot.val();
    const community = communitySnapshot.val();
    if (
      !course ||
      course.sellerType !== "community" ||
      course.status !== "published" ||
      course.ownerUid !== request.ownerUid ||
      course.communityId !== request.communityId ||
      !community ||
      community.ownerUid !== request.ownerUid
    ) {
      res.status(409).json({ error: "The course or seller is no longer eligible for payment" });
      return;
    }
    const amount = Number(request.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(409).json({ error: "Payment amount is invalid" });
      return;
    }

    const revenueRef = adminDb.ref(`communityCourseRevenue/${request.communityId}`);
    const credit = await revenueRef.transaction((current: any) => {
      const record = current || {};
      const credits = record.credits || {};
      if (credits[requestId]) return record;
      return {
        ...record,
        availableBalance: Number(record.availableBalance || 0) + amount,
        totalEarned: Number(record.totalEarned || 0) + amount,
        credits: {
          ...credits,
          [requestId]: {
            amount,
            courseId: request.courseId,
            courseTitle: String(request.courseTitle || course.title || "Community course"),
            createdAt: timestamp,
          },
        },
      };
    });
    if (!credit.committed) {
      res.status(409).json({ error: "Could not record course revenue" });
      return;
    }

    const enrollmentRef = adminDb.ref(`courseEnrollments/${request.courseId}/${request.uid}`);
    const enrollment = await enrollmentRef.transaction((current: any) => current || {
      uid: request.uid,
      courseId: request.courseId,
      communityId: request.communityId,
      status: "enrolled",
      paymentStatus: "approved",
      paymentRequestId: requestId,
      paidAmount: amount,
      enrolledAt: timestamp,
    });
    const updates: Record<string, unknown> = {
      [`paymentRequests/${requestId}/status`]: "approved",
      [`paymentRequests/${requestId}/processedAt`]: timestamp,
      [`paymentRequests/${requestId}/processedBy`]: req.firebaseUser!.uid,
    };
    await adminDb.ref().update(updates);
    await countCourseEnrollment(request.courseId, request.uid);
    res.json(DecideCommunityCoursePaymentResponse.parse({ id: requestId, status: "approved" }));
  },
);

router.get(
  "/community/revenue",
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const community = await getOwnedCommunity(req.firebaseUser!.uid);
    if (!community) {
      res.status(403).json({ error: "An active community owner account is required" });
      return;
    }
    const snapshot = await adminDb.ref(`communityCourseRevenue/${community.id}`).get();
    const revenue = snapshot.val() || {};
    const sales = Object.entries(revenue.credits || {})
      .map(([id, value]: [string, any]) => ({
        id,
        courseId: String(value?.courseId || ""),
        courseTitle: String(value?.courseTitle || "Community course"),
        amount: Number(value?.amount || 0),
        createdAt: Number(value?.createdAt || 0),
      }))
      .filter((item) => item.courseId && item.amount > 0)
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, 20);
    res.json(GetCommunityRevenueResponse.parse({
      balance: Number(revenue.availableBalance || 0),
      totalEarned: Number(revenue.totalEarned || 0),
      sales,
    }));
  },
);

router.post(
  "/community/withdrawals",
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const parsed = RequestCommunityWithdrawalBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const community = await getOwnedCommunity(req.firebaseUser!.uid);
    if (!community) {
      res.status(403).json({ error: "An active community owner account is required" });
      return;
    }
    const { amount, revenueSource, bkashNumber } = parsed.data;
    if (amount < MIN_WITHDRAWAL || !Number.isInteger(amount)) {
      res.status(400).json({ error: `Minimum withdrawal is ৳${MIN_WITHDRAWAL}` });
      return;
    }

    const [withdrawalsSnapshot, balanceSnapshot] = await Promise.all([
      adminDb.ref(`communityWithdrawals/${community.id}`).get(),
      revenueSource === "course"
        ? adminDb.ref(`communityCourseRevenue/${community.id}/availableBalance`).get()
        : adminDb.ref(`communityBalances/${community.id}/balance`).get(),
    ]);
    const requests = withdrawalsSnapshot.val() as Record<string, any> | null;
    const pending = Object.values(requests || {})
      .filter((item) => item?.status === "pending" && (item?.revenueSource || "commission") === revenueSource)
      .reduce((sum, item) => sum + Number(item?.amount || 0), 0);
    const balance = Number(balanceSnapshot.val() || 0);
    if (pending + amount > balance) {
      res.status(409).json({ error: "Insufficient available balance for this revenue source" });
      return;
    }

    const requestRef = adminDb.ref(`communityWithdrawals/${community.id}`).push();
    if (!requestRef.key) {
      res.status(500).json({ error: "Could not create withdrawal request" });
      return;
    }
    await requestRef.set({
      communityId: community.id,
      ownerUid: req.firebaseUser!.uid,
      communityName: community.name,
      amount,
      bkashNumber: bkashNumber.trim(),
      revenueSource,
      status: "pending",
      createdAt: Date.now(),
    });
    res.status(201).json(RequestCommunityWithdrawalResponse.parse({
      id: requestRef.key,
      status: "pending",
      revenueSource,
    }));
  },
);

router.patch(
  "/admin/community-withdrawals/:communityId/:requestId",
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    if (!(await assertAdmin(req, res))) return;
    const communityId = param(req.params.communityId);
    const requestId = param(req.params.requestId);
    const parsed = DecideCommunityWithdrawalBody.safeParse(req.body);
    if (
      !communityId ||
      !requestId ||
      !isValidCourseId(communityId) ||
      !isValidCourseId(requestId) ||
      !parsed.success
    ) {
      res.status(400).json({ error: parsed.success ? "Invalid request ID" : parsed.error.message });
      return;
    }
    const requestRef = adminDb.ref(`communityWithdrawals/${communityId}/${requestId}`);
    const requestSnapshot = await requestRef.get();
    const request = requestSnapshot.val();
    if (!request || request.communityId !== communityId) {
      res.status(404).json({ error: "Community withdrawal not found" });
      return;
    }
    if (request.status !== "pending") {
      res.status(409).json({ error: "Withdrawal request has already been processed" });
      return;
    }
    const revenueSource = request.revenueSource === "course" ? "course" : "commission";
    const amount = Number(request.amount);
    if (!Number.isInteger(amount) || amount < MIN_WITHDRAWAL) {
      res.status(409).json({ error: "Withdrawal amount is invalid" });
      return;
    }
    const timestamp = Date.now();

    if (parsed.data.action === "approve") {
      const balanceRef = revenueSource === "course"
        ? adminDb.ref(`communityCourseRevenue/${communityId}`)
        : adminDb.ref(`communityBalances/${communityId}`);
      const debit = await balanceRef.transaction((current: any) => {
        if (!current) return;
        const balance = revenueSource === "course"
          ? Number(current.availableBalance || 0)
          : Number(current.balance || 0);
        if (revenueSource === "commission" && current.withdrawalDebits?.[requestId]) return current;
        if (revenueSource === "course" && current.withdrawals?.[requestId]) return current;
        if (!Number.isFinite(balance) || balance < amount) return;
        if (revenueSource === "course") {
          return {
            ...current,
            availableBalance: balance - amount,
            withdrawals: {
              ...(current.withdrawals || {}),
              [requestId]: { amount, status: "approved", createdAt: timestamp },
            },
          };
        }
        return {
          ...current,
          balance: balance - amount,
          withdrawalDebits: {
            ...(current.withdrawalDebits || {}),
            [requestId]: { amount, createdAt: timestamp },
          },
        };
      });
      if (!debit.committed) {
        res.status(409).json({ error: "Insufficient available balance" });
        return;
      }
    } else if (revenueSource === "course") {
      await adminDb.ref(`communityCourseRevenue/${communityId}/withdrawals/${requestId}`).update({
        amount,
        status: "rejected",
        createdAt: timestamp,
      });
    }

    await requestRef.update({
      status: parsed.data.action === "approve" ? "approved" : "rejected",
      processedAt: timestamp,
      processedBy: req.firebaseUser!.uid,
    });
    res.json(DecideCommunityWithdrawalResponse.parse({
      id: requestId,
      status: parsed.data.action === "approve" ? "approved" : "rejected",
      revenueSource,
    }));
  },
);

export default router;
