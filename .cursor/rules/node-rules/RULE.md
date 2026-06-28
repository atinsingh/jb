---
alwaysApply: true
---
- Always inspect both the backend and frontend folder when reviewing or developing features or bugfixes, in order to understand the full context of the code base and avoid unnecessary duplication.
- Check for existing implementations, API routes, types, and utilities that may be relevant before introducing new code, especially for features spanning both frontend and backend.
- If unsure about how data flows between backend and frontend, review both folders to trace the flow, data model, and logic before proceeding.
- When adding new features, ensure consistency in API, data structures, and naming conventions across backend and frontend.
- Before creating new endpoints, components, or types, validate none already exist that can be reused or extended.
- **All UI components must use [Tailwind CSS](https://tailwindcss.com/) for styling and [Catalyst UI](https://www.catalyst-ui.com/) for core component structure, unless there is a strong, documented reason not to.**
- This rule applies to all code changes in this repository to maintain consistency and code quality.

- When developing new features or fixing bugs, always examine the implementation in both the backend and frontend folders. If a new feature overlaps or connects the two, trace existing logic/API/types/utilities to avoid duplication and ensure seamless integration.
- If new logic or utilities are complex and widely useful, extract them into a shared library (e.g., under a `lib` or `utils` directory) rather than implementing them directly in a deeply nested frontend component or backend route.
- For feature consistency, always check that data structures (types, models) and naming conventions are aligned between backend (e.g., API route types) and frontend consumers.
- Before adding a new endpoint, React component, or utility function, search the codebase to ensure one doesn’t already exist that can be imported or extended. Reuse whenever appropriate.
- For all new UI, use Tailwind CSS for styling and build your UI structure around Catalyst UI components. If deviating from this requirement, provide a clear and documented reason in the code.
- Validate how data flows across backend and frontend by tracing calls and payloads in both folders if unsure, before implementing.
- For maintainability, move complex or reusable frontend code to a designated library folder (such as `/frontend/src/lib`), and import where needed—do not duplicate the same logic in multiple places.

- All files must use proper logging practices. Use a logger (not just console.log) appropriate for each environment (e.g., `winston`, `pino`, or similar for Node.js backend; for frontend, use `@sentry/browser`, `loglevel`, or other structured logging libraries).
- Always specify the logging level (e.g., info, warn, error, debug) when logging events.
- Do not use bare console.log, console.error, etc.; instead, wrap with your logging tool and level.
- Ensure logging does not leak sensitive information (like passwords, tokens, or PII).
- Centralize logger configuration where possible (e.g., create a shared logger in `/lib/logger.js` or similar).
- Example (backend/Node.js):
  ```js
  // import logger from '../../lib/logger';
  logger.info('User created successfully', { userId });
  logger.error('Error creating user', { error });
  ```
- Example (frontend):
  ```js
  // import log from 'loglevel';
  log.setLevel('info');
  log.info('User navigated to resume step', { step: stepId });
  ```
- For unhandled errors and exceptions, log at `error` level with relevant context and stack trace where safe.
- For new utility logic that involves logging, define log levels and reuse the shared logger rather than creating new ad hoc logging mechanisms.
- Comply with this rule throughout backend and frontend code.
