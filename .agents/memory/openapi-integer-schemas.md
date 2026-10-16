---
name: OpenAPI integer schemas
description: Orval/Zod code generation constraints for integer-valued API fields in this workspace.
---

Represent integer-constrained API values in OpenAPI as `type: number` with `multipleOf: 1`, rather than `type: integer`.

**Why:** The installed Orval version generated `zod.int()` for OpenAPI integer fields, but the workspace's Zod 3.25 runtime does not provide that validator, so generated schema typechecking failed.

**How to apply:** Use `number` plus `multipleOf: 1` for counts, durations, indexes, and whole-currency amounts when regenerating the API client and schemas.
