# Login Handle Typeahead Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** As someone types in the Login "Your handle" field, show up to 6 matching AT Protocol accounts (avatar + handle + display name). Picking one fills the field.

**Architecture:** A small `lib/actors.ts` calls Bluesky's public `app.bsky.actor.searchActorsTypeahead` endpoint straight from the browser, with no auth and no server code. A `HandleTypeahead` component owns the input, debounce and combobox dropdown, and replaces the bare `<input>` in `routes/Login.tsx`. Sign-in is unchanged.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest (jsdom, `globals: true`), @testing-library/react 16. The repo uses jj (colocated with git).

**Spec:** `docs/superpowers/specs/2026-11-26-login-handle-typeahead-design.md`

## Global Constraints

- Endpoint: `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=<text>&limit=<n>` (no auth; CORS `*`).
- At most **6** results. Debounce **250 ms**.
- Picking a result fills the field only. It never calls `signIn`; the person presses **Continue →**.
- A failed or slow search never shows an error and never blocks typing. Unmatched handles still sign in.
- atproto/network logic lives in `src/lib/`; components call it (CLAUDE.md).
- Styling uses the tokens in `src/styles/tokens.css` only: dropdown `--surface`, 1px `--hairline`, `--r-card`, `--shadow-elevated`; highlighted row `--page-bg`; handle 14px/500 `--ink`; display name 12px `--faint`; avatar 28px round. Fallback avatar: a disc in one of `--best` / `--fav` / `--first`, chosen deterministically from the DID.
- No new dependencies.
- Run commands from `starter/` unless noted. Commit with `jj commit <paths> -m …` from the repo root.

## Review Focus

- **Fast typing:** results from an earlier, slower request must not replace results for the current text. (Task 2 test: `ignores a stale response`.)
- **Enter with nothing highlighted** must submit the form (sign in) exactly as today. (Task 2 test: `Enter without a highlight submits the form`.)
- **Search fails (offline, 5xx):** no dropdown, no error text, and the typed value is kept. (Task 2 test: `a failed search shows nothing and keeps typing working`.)
- **Selecting a result** must not immediately re-open the dropdown when the value change triggers a new search. (Task 2 test: `selecting closes the list and it stays closed`.)
- **Leading `@` or surrounding spaces** (people paste `@you.bsky.social `) must still search for the bare handle. (Task 1 test: `strips @ and whitespace`.)

---

### Task 1: `searchHandles` in `lib/actors.ts`

**Files:**
- Create: `starter/src/lib/actors.ts`
- Test: `starter/src/lib/actors.test.ts`

**Interfaces:**
- Produces:
  - `export interface ActorHit { did: string; handle: string; displayName?: string; avatar?: string }`
  - `export async function searchHandles(query: string, limit = 6, signal?: AbortSignal): Promise<ActorHit[]>`

- [ ] **Step 1: Write the failing tests** in `actors.test.ts`. Stub `fetch` with `vi.stubGlobal('fetch', vi.fn())` per test and restore with `vi.unstubAllGlobals()` in `afterEach`.
  - `builds the typeahead URL`: `searchHandles('grey')` calls fetch once, with a URL whose origin+path is `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead`, `q=grey` and `limit=6`.
  - `strips @ and whitespace`: `searchHandles('  @grey ')` → URL `q` param equals `grey`.
  - `returns [] for an empty query without fetching`: `searchHandles('  @ ')` resolves `[]`, and fetch is not called.
  - `maps actors to hits`: given the response `{ actors: [{ did: 'did:plc:a', handle: 'a.bsky.social', displayName: 'A', avatar: 'https://x/a.jpg', labels: [] }, { did: 'did:plc:b', handle: 'b.tngl.sh' }] }` → `[{ did: 'did:plc:a', handle: 'a.bsky.social', displayName: 'A', avatar: 'https://x/a.jpg' }, { did: 'did:plc:b', handle: 'b.tngl.sh', displayName: undefined, avatar: undefined }]`. Extra fields are dropped.
  - `throws on a non-OK response`: fetch resolves `{ ok: false, status: 500 }` → `searchHandles('grey')` rejects.
  - `passes the abort signal through`: the second argument given to fetch has `signal === controller.signal`.

- [ ] **Step 2: Run and confirm failure**

  Run: `npx vitest run src/lib/actors.test.ts`
  Expected: FAIL. Cannot resolve `./actors`.

- [ ] **Step 3: Implement `searchHandles`** in `actors.ts`. Normalise with `query.trim().replace(/^@/, '').trim()`, build the URL with `URL` + `searchParams`, pass `{ signal }` to `fetch`, and throw `Error(\`handle search failed: ${status}\`)` when `!res.ok`. Add a one-line comment saying this is Bluesky's public index and covers any handle it knows (not just `.bsky.social`).

- [ ] **Step 4: Run and confirm pass**

  Run: `npx vitest run src/lib/actors.test.ts && npx tsc --noEmit`
  Expected: 6 tests pass. tsc prints nothing.

- [ ] **Step 5: Commit** (repo root)

  ```bash
  jj commit starter/src/lib/actors.ts starter/src/lib/actors.test.ts -m "feat: searchHandles — Bluesky public handle typeahead lookup"
  ```

---

### Task 2: `HandleTypeahead` component, wired into Login

**Files:**
- Create: `starter/src/components/HandleTypeahead.tsx`
- Test: `starter/src/components/HandleTypeahead.test.tsx`
- Modify: `starter/src/routes/Login.tsx` (replace the `<input …/>` inside the bordered field row)

**Interfaces:**
- Consumes: `searchHandles`, `ActorHit` from `../lib/actors` (Task 1).
- Produces:
  ```ts
  export default function HandleTypeahead(props: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }): JSX.Element
  ```
  The component renders the `<input>` (keeping Login's current input props and styles: placeholder `you.bsky.social`, `autoComplete="username"`, `autoCapitalize="none"`, `spellCheck={false}`) plus the dropdown. The dropdown is absolutely positioned against a `position: relative` wrapper that the component renders around the input, at `top: calc(100% + 6px)`, full width, `zIndex: 50`. It must not live inside Login's `overflow: hidden` field row: render the wrapper so Login's field row sits inside it, or lift `overflow: hidden` off the row. Choose whichever keeps the field's look pixel-identical.

- [ ] **Step 1: Write the failing tests** in `HandleTypeahead.test.tsx`. Use `vi.mock('../lib/actors', () => ({ searchHandles: vi.fn() }))` and `vi.useFakeTimers()`. Render through a small harness that holds `value` in `useState` and wraps the component in `<form onSubmit={submitSpy}>` with a submit button, so form behaviour is real. Advance the debounce with `await act(() => vi.advanceTimersByTimeAsync(250))`. Query with `getByRole('combobox')`, `queryByRole('listbox')` and `getAllByRole('option')`.
  - `shows matches after the debounce`: type `grey`. Before 250 ms there is no listbox and `searchHandles` hasn't been called. After 250 ms, `searchHandles` was called with `'grey'` and there are 2 options showing `a.bsky.social` and `b.tngl.sh`. The `displayName` 'A' is shown for the first option. The input has `aria-expanded="true"`.
  - `ArrowDown + Enter fills the handle without submitting`: after results, ArrowDown, then Enter → input value `a.bsky.social`, `submitSpy` not called, no listbox.
  - `clicking an option fills the handle`: `mouseDown` + `click` on option 2 → value `b.tngl.sh`, no listbox.
  - `Enter without a highlight submits the form`: after results, press Enter with no ArrowDown → `submitSpy` called once.
  - `Escape closes the list`: after results, Escape → no listbox, value unchanged.
  - `selecting closes the list and it stays closed`: select option 1, advance 250 ms → still no listbox. `searchHandles` must not be called again with the selected handle, or if it is, its results are not shown.
  - `ignores a stale response`: type `gr`, advance 250 ms (this call's promise stays pending, via a deferred), type `grey`, advance 250 ms (resolves `[{handle:'new.bsky.social'}]`), then resolve the first deferred with `[{handle:'old.bsky.social'}]` → only `new.bsky.social` is shown.
  - `a failed search shows nothing and keeps typing working`: `searchHandles` rejects → no listbox, no element with role `alert`, input value equals what was typed, and typing more still updates the value.
  - `clearing the field closes the list`: after results, change to `''` → no listbox.
  - `disabled closes the list`: rerender with `disabled` → no listbox, input disabled.

- [ ] **Step 2: Run and confirm failure**

  Run: `npx vitest run src/components/HandleTypeahead.test.tsx`
  Expected: FAIL. Cannot resolve `./HandleTypeahead`.

- [ ] **Step 3: Implement `HandleTypeahead`.** Follow `ArtistSearch.tsx`'s structure (debounced `useEffect` on the query, `activeIndex`, `handleKeyDown`), with these decisions:
  - **Stale guard:** keep a request counter in a ref. Only the latest request may set results, and abort the previous request's `AbortController` on each new query and on unmount.
  - **No re-open after a pick:** keep a ref with the handle just selected. Skip the search while `value === justSelected`, and clear the ref on the next user edit.
  - **Enter:** only `preventDefault` when the list is open and `activeIndex >= 0`. Otherwise let it submit.
  - **Closing:** Escape and blur close the list. Options use `onMouseDown={e => e.preventDefault()}` so the click lands before blur.
  - **Errors:** swallow them by setting the results to `[]`. Render no error text.
  - **ARIA:** input `role="combobox"` with `aria-autocomplete="list"`, `aria-expanded`, `aria-controls={listId}` and `aria-activedescendant` (the active option's id). List `role="listbox"` with `id={listId}`, and each row `role="option"` with `aria-selected`. Use `useId()`.
  - **Row:** 28px round avatar `<img alt="">` with `loading="lazy"`. With no `avatar`, show a 28px disc whose background comes from `['var(--best)','var(--fav)','var(--first)'][hash(did) % 3]`, where hash is any stable string hash. Then the handle (14px/500 `--ink`) and, if present, the `displayName` (12px `--faint`). Highlighted row uses `--page-bg`. Container styles are listed in Global Constraints.

- [ ] **Step 4: Run and confirm pass**

  Run: `npx vitest run src/components/HandleTypeahead.test.tsx`
  Expected: 10 tests pass.

- [ ] **Step 5: Wire into Login.** In `routes/Login.tsx`, replace the `<input …/>` with `<HandleTypeahead value={handle} onChange={setHandle} disabled={pending} />`, and adjust the wrapper and `overflow` per the Interfaces note. `handleSubmit`, the error state and the button stay untouched.

- [ ] **Step 6: Full check**

  Run (repo root): `mise run test && (cd starter && npx tsc --noEmit)`
  Expected: all Vitest tests pass (prior 9 + 16 new), server tests 5/5, tsc clean.

- [ ] **Step 7: Check it in the browser** (repo root): start `mise run dev` in the background, open `http://127.0.0.1:5173/login`, and confirm each of these:
  - typing `grey` shows ≤ 6 rows with avatars under the field, and the field border and `@` addon look unchanged
  - ↓/↑ moves the highlight, Enter fills, Esc closes, a click fills
  - Enter on a fully typed handle with no highlight starts sign-in (redirects toward the PDS)
  - typing is never laggy, and no console errors appear

  Stop the server with `mise run stop`.

- [ ] **Step 8: Commit** (repo root)

  ```bash
  jj commit starter/src/components/HandleTypeahead.tsx starter/src/components/HandleTypeahead.test.tsx starter/src/routes/Login.tsx -m "feat: handle typeahead on Login (Bluesky public search, combobox dropdown)"
  ```
