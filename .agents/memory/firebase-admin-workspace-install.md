---
name: Firebase Admin workspace installation
description: Workspace package management detail for server-side Firebase Admin support.
---

Firebase Admin must be added to the API workspace package rather than the monorepo root; the generic package installer targets the root and refuses the workspace-root change.

**Why:** Adding the dependency at the wrong workspace level fails before dependency resolution and can temporarily leave frontend links incomplete until the workspace install is restored.

**How to apply:** Use the API package filter when adding the dependency, then run the workspace install and typecheck both the API and web artifacts.