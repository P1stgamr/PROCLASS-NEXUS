---
name: Gemini model availability
description: Provider model deprecations affecting the TaskMint server-side Gemini proxy
---

The Gemini provider may return a 404 for model names that are valid in older examples, even when the API key is configured correctly. In this project, the working server-side model was `gemini-3.6-flash`; older flash model names were explicitly reported as unavailable to new users.

**Why:** A real proxy request initially failed with model-not-found responses, while the server and secret wiring were healthy. Provider responses can therefore distinguish model availability from credential or routing failures.

**How to apply:** Keep Gemini calls behind the API server, avoid exposing the key to the frontend, and verify the configured model with a real non-secret request after model changes. Do not treat a 404 as proof that the key is missing.