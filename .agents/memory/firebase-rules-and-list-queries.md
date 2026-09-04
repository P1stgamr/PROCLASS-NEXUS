---
name: Firebase rules and list queries
description: Durable constraint for Realtime Database security rules and existing list screens.
---

The app uses root-level list listeners for admin data and query-scoped listeners for a student's own withdrawal requests. Realtime Database child `.read` rules do not grant permission to a parent `onValue` listener, so every parent listener needs an explicit matching rule. Sensitive user-owned collections should use `orderByChild("uid")` plus `equalTo(auth.uid)` rather than exposing the entire collection.

**Why:** Tightening the root `.read` rule without adding matching parent/query rules causes otherwise valid student and admin screens to fail with permission denied.

**How to apply:** When adding or tightening a Firebase path, inspect the exact `ref()`/`query()` used by every reader, then authorize only that query shape; keep root `.read` and `.write` denied.

Role and balance authority must come from Firebase state, not an email address or client-supplied role. New client-created profiles may initialize only the safe student defaults; later role and coin changes belong to an admin/backend path.

**Why:** An email-based bootstrap can grant privileges before the database role is checked, and a client-controlled balance undermines withdrawal safety.

**How to apply:** Read the existing profile role after authentication, gate sensitive listeners on the resolved role, and use transactions against the live balance for deductions.