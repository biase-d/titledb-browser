---
trigger: always_on
description: "Core system design and architecture rules for the project."
---

# System Design & Architecture Rules

## Core Architecture Pattern: Service-Repository-Controller

This project follows a strict **Service-Repository-Controller** separation of concerns.

1.  **Repositories (`src/lib/repositories`)**:
    *   **Responsibility**: Direct database access and query construction.
    *   **Rules**:
        *   Must NOT contain business logic.
        *   Must NOT return HTTP responses.
        *   Should return plain objects or Drizzle results.
        *   ALL SQL/Drizzle queries belong here.

2.  **Services (`src/lib/services`)**:
    *   **Responsibility**: Business logic, data transformation, and orchestration.
    *   **Rules**:
        *   Call Repositories to get data.
        *   Apply validation, calculations, and transformations.
        *   Can call other Services.
        *   Must NOT depend on SvelteKit-specific request/response objects (keep them framework-agnostic where possible).

3.  **Controllers (SvelteKit Load Functions & Actions)**:
    *   **Responsibility**: HTTP interface, request parsing, response formatting.
    *   **Rules**:
        *   **THIN Controllers**: Keep logic minimal.
        *   Extract data from `request` / `url`.
        *   Call Services to perform actions.
        *   Return `json`, `fail`, or page data.
        *   No direct DB calls in `+page.server.js` or `+server.js`.

## Code Quality & Best Practices

*   **Type Safety**: Use JSDoc types for all functions and parameters.
*   **Error Handling**: Services should throw specific errors; Controllers should catch them and return appropriate HTTP statuses.
*   **Auditing**: If a step fails, diagnose the root cause and document it to prevent recurrence.
*   **Artifacts**: Maintain `task.md`, `implementation_plan.md`, and `walkthrough.md` for all non-trivial tasks.

## Design System

*   **Components**: Keep components focused and reusable.
*   **Icons**: Use Iconify for icons.