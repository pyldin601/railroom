# State to UI

## Template foundation

`src/ui/template.ts` copies the legacy page body into a standalone `lit-html`
template. `src/ui/style.css` copies its styles. No legacy JavaScript is imported.
`trainTemplate(state)` is a pure description of the DOM; call
`render(trainTemplate(nextState), container)` again to update bound values while
retaining existing elements. Status, speed, and distance are bound today; the
remaining markup is a visual reference with unwired controls and empty drawing
surfaces. The copied audio credits describe the legacy sound pack.

## Recommended simulation integration (not implemented yet)

```text
UI actions → commands → simulation state
                              ├── crossing events → audio scheduler
                              └── UI projection → latest snapshot
                                                     ↓ animation frame
                                               Lit render + canvas draw
```

1. Keep one authoritative simulation state. Commands change simulation inputs;
   DOM values must not become a second state store.
2. If the simulation uses RxJS, share its stateful pipeline before consumers
   subscribe. UI and audio must not create independent clocks or integrators.
3. Project state into a small immutable view model with explicit units. Round
   displayed values and suppress unchanged projections before DOM rendering.
4. Coalesce updates: retain the latest snapshot and schedule at most one pending
   `requestAnimationFrame`. Render the latest state when the frame arrives. When
   paused, render only on changes; refresh from current state on visibility return.
5. Draw moving track/wheels on canvas separately from DOM text. Preserve its canvas
   element across template updates. Use the latest motion snapshot for both views.
6. Keep every crossing event in the audio path and schedule it against the audio
   clock. UI frame coalescing must never discard audio events or drive simulation
   time. Background animation-frame throttling must not become the audio clock.
7. Bind controls using Lit event expressions such as `@click=${onPlay}` and
   dispatch commands. Use property bindings such as `.value=${value}` for form
   controls and boolean bindings such as `?disabled=${disabled}` where appropriate.
8. Have a session owner dispose subscriptions, pending frames, event listeners,
   and audio resources when the session ends.

Start with one template and split panels only as their state and behavior grow.
A second reactive state library or a web-component layer is not needed for this
foundation.

Reference: [Lit standalone templates](https://lit.dev/docs/libraries/standalone-templates/).
