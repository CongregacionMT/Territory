# Code Review Rules

## General
- Follow Clean Architecture and SOLID principles.
- Use meaningful, descriptive variable and function names in English.
- Keep components and functions small and single-purpose.

## TypeScript & Angular
- Strict typing: avoid `any`, prefer explicit interfaces and types.
- Follow Angular style guide conventions (`@angular-eslint` rules).
- Unsubscribe from RxJS Observables to prevent memory leaks (`takeUntilDestroyed`, `async` pipe, or `takeUntil`).
- Avoid direct DOM manipulation; use Angular abstractions (`Renderer2`, `ElementRef` when strictly necessary).
- Keep business logic inside injectable Services, keeping components focused on presentation and user interaction.

## Styles & HTML
- Use SCSS and maintain modular styles.
- Ensure semantic HTML and accessibility (a11y) standards.
