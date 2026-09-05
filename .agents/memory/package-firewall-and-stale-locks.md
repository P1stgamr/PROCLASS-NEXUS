---
name: Package firewall and stale locks
description: Replit package-firewall behavior encountered while installing this workspace
---

When a frozen pnpm install is blocked on an older package tarball, first check the current package release and update the direct dependency plus lockfile rather than bypassing the firewall.

**Why:** The imported workspace’s older `orval` release was rejected by the package firewall, while a current release installed cleanly and preserved the existing codegen interface.

**How to apply:** For future dependency setup in this workspace, treat firewall rejection of a stale direct dependency as a signal to inspect and safely refresh that dependency before considering alternatives.