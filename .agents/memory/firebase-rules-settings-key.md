---
name: Firebase rules settings key
description: Prevents silent loss of Firebase settings validations and access rules.
---

The Firebase Realtime Database rules file must contain exactly one top-level `settings` object. Keep ad settings, Motivation validation, and withdrawal cooldown validation as children of that same object.

**Why:** JSON parsers accept duplicate object keys but retain only the last value, which can silently remove earlier security rules before deployment.

**How to apply:** After editing `database.rules.json`, parse it as JSON and assert that every expected `settings` child is present before considering the rules change verified.