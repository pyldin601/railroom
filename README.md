# Railroom

TypeScript workspace for the Railroom rewrite. The legacy layout and styles are
copied into a standalone `lit-html` template in `src/ui/`. Status, speed, and
distance demonstrate state bindings. Controls, route-map content, canvas drawing,
and audio are not wired yet. The previous implementation is preserved in `legacy/`.

See [state-to-UI architecture](docs/state-to-ui.md) for the proposed update flow.

## Development

Use Node.js 22.13 or newer and npm.

```sh
npm ci
npm run dev
```

Vite serves the app at the local URL printed in the terminal.

## Commands

| Command                | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Start the Vite development server                    |
| `npm run typecheck`    | Check strict TypeScript types without emitting files |
| `npm run lint`         | Run ESLint, including type-aware TypeScript rules    |
| `npm run lint:fix`     | Apply available ESLint fixes                         |
| `npm run format`       | Format the rewrite files with Prettier               |
| `npm run format:check` | Check formatting without changing files              |
| `npm run build`        | Typecheck and bundle into `dist/`                    |
| `npm run preview`      | Preview the production build locally                 |
| `npm run check`        | Run lint, formatting checks, typechecking, and build |

The new tooling excludes `legacy/`. Dependencies are pinned in `package.json`
and `package-lock.json`. ESLint checks correctness; Prettier handles formatting.
