# PrepRoute — Test Management Application

A 5-page admin tool for creating, editing, and publishing MCQ tests. Built for the Preproute
frontend task with **Next.js 16 (App Router) + React 19 + TypeScript**, React Hook Form + Zod,
Zustand, and a TinyMCE rich-text editor, styled to the provided Figma.

Flow: **Login → Dashboard → Create/Edit Test → Add Questions → Preview → Publish (now or scheduled)**.

---

## Getting started

```bash
npm install
cp .env.example .env      # then edit values (see below)
npm run dev               # http://localhost:3000
```

### Environment variables (`.env`)

```env
# Defaults to the staging API if unset.
NEXT_PUBLIC_API_BASE_URL=https://admin-moderator-backend-staging.up.railway.app/api

# Required for the rich-text editor. Get a free key at https://www.tiny.cloud/ and
# register your localhost domain, otherwise TinyMCE renders read-only with a warning.
NEXT_PUBLIC_TINYMCE_API_KEY=your-tinymce-api-key-here
```

### Test credentials

- **User ID:** `vedant-admin`
- **Password:** `vedant123`

### Scripts

`npm run dev` · `npm run build` · `npm run start` · `npm run lint`

---

## Project structure

```
app/
├── layout.tsx                # root layout + toast viewport
├── page.tsx                  # "/" → redirects to /dashboard
├── globals.css               # design system (pr-* classes)
├── login/ dashboard/         # page wrappers (thin — render a screen)
├── tests/new, tests/[id]/{edit,questions,preview}
├── confirmation/{publish-now,schedule-publish}
├── screens/                  # one file per screen (the page bodies)
│   ├── login.tsx  dashboard.tsx  test-form.tsx
│   ├── questions.tsx  preview.tsx  publish.tsx
├── components/
│   ├── app-frame.tsx         # AuthGuard + sidebar + topbar shell
│   ├── ui.tsx                # ErrorMessage, ButtonLabel, searchable selects, summary card…
│   ├── icons.tsx  Modal.tsx  RichTextEditor.tsx  toast-viewport.tsx
├── lib/
│   ├── api.ts                # fetch client, auth/JWT, response unwrapping
│   ├── types.ts              # API + form types
│   ├── schemas.ts            # Zod validation schemas
│   └── test-utils.ts         # pure helpers: payload mapping, name↔id resolution, CSV…
└── store/                    # Zustand: useTestFlowStore, useToastStore
```

Routing follows Next.js 16 conventions (async route params; `useSearchParams` wrapped in
`<Suspense>` on the confirmation pages). Each route `page.tsx` is a thin wrapper around a
`screens/*` component so the page bodies stay testable and isolated.

---

## Architecture & decisions

- **State:** local component state for screen-scoped data; **Zustand** for cross-screen
  concerns — `useTestFlowStore` (in-progress questions / selected test) and `useToastStore`
  (notifications). Form state is owned by **React Hook Form**, validated with **Zod** schemas
  (`lib/schemas.ts`).
- **API layer (`lib/api.ts`):** a small typed `fetch` wrapper that attaches the JWT, unwraps
  the backend's `{ data: … }` envelope defensively, and redirects to `/login` on `401`.
- **Auth:** JWT from `POST /auth/login` stored in `localStorage`; `AuthGuard` gates the app
  shell client-side.
- **Rich text:** TinyMCE, lazy-loaded via `React.lazy`/`Suspense` with a `<textarea>` fallback
  so the form still works before the editor hydrates.

### The name-vs-id mismatch (important)

The backend **returns taxonomy by name on reads** (`subject: "Maths"`, `topics: ["Geometry"]`)
but **requires UUIDs when creating/updating a test**, and the **questions endpoint stores/validates
topic & sub-topic by name** and **requires a `subject` name on every question**. The task's sample
payloads omitted some of this, so the contract was verified directly against the live API. The app
handles it as follows:

- **Create test** — the form already holds ids, so it submits ids directly.
- **Edit test** — `resolveTestTaxonomy()` (`lib/test-utils.ts`) maps the returned names back to
  ids before seeding the form and submitting, so the dropdowns preselect and `PUT` gets valid UUIDs.
- **Add questions** — each question is sent with the test's `subject` name. The endpoint also
  exposes optional per-question `topic`/`sub_topic`, but the live backend's lookup currently
  rejects every value (by name *and* by id), which fails the whole bulk insert — so those fields
  are omitted (see Known limitations).
- `PUT /tests` rejects an empty `sub_topics: []`, so empty taxonomy arrays are omitted from updates.
- Scheduling uses the real field names `scheduled_date` / `expiry_date`.

---

## Known limitations / notes

- **TinyMCE key required** — without a valid `NEXT_PUBLIC_TINYMCE_API_KEY` registered for your
  domain the editor is read-only. The `<textarea>` fallback keeps the form usable meanwhile.
- **Quick-edit modal** (dashboard → Edit) edits name, subject, difficulty, duration, and marking
  only; it intentionally leaves topics/sub-topics untouched server-side. The full
  `/tests/[id]/edit` page edits the complete taxonomy.
- **Per-question topic/sub-topic** selectors are shown (Figma parity) but **not persisted**: the
  staging `POST /questions/bulk` endpoint rejects any `topic`/`sub_topic` value, so sending them
  would fail the entire save. Test-level topics are still saved on the test itself.
- **CSV import** on the questions page accepts a simple format
  (`question, option1, option2, option3, option4, correctOption(1-4), explanation?`), with quoted
  fields supported for commas. It augments the form; it does not replace existing questions.
- **Delete** depends on backend support (`DELETE /tests/:id`), which the staging API provides.
- Preview renders question/explanation HTML produced by the editor.
