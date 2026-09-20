# Frontend Architecture

## Overview

InterviewIQ is a single-page application built with React 19, TypeScript, and Vite. React Router handles navigation, Axios communicates with the backend, and Tailwind CSS with design tokens provides a consistent interface.

The primary dependency flow is:

```text
Page → Component / Hook → Service → apiClient → Backend
                    ↘ Context / Types / Utils
```

Do not call Axios directly from pages or components. Route every request through a domain service so the UI remains independent of API implementation details.

## Directory Structure

| Directory                      | Responsibility                                                    |
| ------------------------------ | ----------------------------------------------------------------- |
| `src/pages/`                   | Route-level components that compose UI and coordinate use cases.  |
| `src/components/ui/`           | Shared design-system primitives exported through `index.ts`.      |
| `src/components/interview/`    | Components specific to the interview domain.                      |
| `src/layouts/`                 | Page shells that render nested routes through `<Outlet />`.       |
| `src/routes/`                  | Route paths, route hierarchy, and access protection.              |
| `src/services/`                | Domain API functions and the shared Axios client.                 |
| `src/contexts/`                | Application-wide state such as authentication and toast messages. |
| `src/hooks/`                   | Reusable React behavior.                                          |
| `src/types/`                   | Shared data types and API contracts.                              |
| `src/styles/`                  | Global CSS and design tokens.                                     |
| `src/utils/`, `src/constants/` | Shared pure functions and constants.                              |

## Application Startup and Routing

`src/main.tsx` mounts the application and loads global CSS. `App.tsx` composes providers in this order: `ToastProvider → AuthProvider → BrowserRouter`. `AppRoutes.tsx` separates routes into three groups:

- Public routes use `MainLayout`.
- Login and registration routes use `AuthLayout`.
- Authenticated routes pass through `ProtectedRoute` before using `MainLayout`.

Add each new path to `src/routes/paths.ts` before declaring its `<Route>`. Do not duplicate hardcoded URLs across the application.

## Data and Authentication

`apiClient.ts` configures the base URL, request timeout, bearer token, and error normalization into `ApiError`. A `401` response clears the local session and redirects to the login page. `AuthProvider` stores the current user and exposes `login`, `register`, and `logout` through `useAuth()`.

Components should only own local presentation state. Put state shared across multiple interface branches in a context, and define API responses and payloads in `src/types/`.

## Adding a Feature

1. Define the domain types and constants.
2. Add API functions to the appropriate service.
3. Build domain components using primitives from `@/components/ui`.
4. Compose the use case in a page and add a route when required.
5. Verify loading, empty, error, unauthenticated, and responsive states.
6. Run `npm run lint`, `npm run format:check`, `npm run typecheck`, and `npm run build`.

## Architecture Rules

- Use the `@/` alias instead of long relative paths.
- Use `import type` for type-only imports; do not use TypeScript `enum`.
- Do not hardcode colors or arbitrary spacing. Add tokens to `src/styles/tokens.css`.
- Import UI primitives from `@/components/ui`; do not deep-import individual files.
- Keep context definitions separate from providers to preserve React Fast Refresh behavior.
