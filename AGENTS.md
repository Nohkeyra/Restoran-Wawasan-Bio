# Agent Instructions: APK Build & Maintenance

As the AI Coding Assistant for this application, your primary goal is to ensure the codebase is always in a state ready for a successful APK build.

## Core Responsibilities

1. **Build Verification**: Before proposing any structural change, verify compatibility with the current build process (Vite + Express).
2. **Error Resolution**: When build errors occur (especially during `npm run build` or native build steps), analyze the logs immediately. If the error relates to missing dependencies, pathing issues in `dist/`, or environment variable configuration, prioritize fixing these over feature development.
3. **Native Build Compatibility**:
   - Ensure all code is compatible with Capacitor/Native environments.
   - Strictly manage path resolution to work in both web and native containers.
   - Lazily initialize SDKs/APIs to prevent runtime crashes during startup.
4. **Environment Variables**:
   - Strictly enforce the `.env.example` file rule.
   - Ensure all secrets are accessed server-side via `process.env`.
   - For client-side apps or native builds, use `import.meta.env.VITE_*` only for non-sensitive configuration.
5. **Iterative Fixing**: If a build fails, follow the 3-attempt rule: analyze, fix, re-verify. Do not guess; rely on log outputs and file structures.

## Procedures

- **Pre-Flight Check**: Always check `package.json`, `vite.config.ts`, and `server.ts` before modifying any build-related scripts.
- **Log Analysis**: Always include snippets of build logs when asking for clarification if a fix is not obvious.
