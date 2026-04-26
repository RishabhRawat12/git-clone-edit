## C-Compiler Web IDE — Frontend (v3)

Frontend-only React + Vite + TypeScript + Tailwind app talking to your Flask backend. Updates from the reference screenshot: the Compilation Panel uses **stacked horizontal tabs** (Output/Warning/Error on top, phase tabs underneath), the file explorer is **hidden behind a sheet** by default, and the Source Code panel gets a small toolbar (filename · A-/A+ · Export · Run).

### Routes
- `/auth` — Login / Sign Up tabs
- `/workspace` — Protected IDE (JWT in localStorage)
- `*` — NotFound

### Auth Screen
- Centered card on dark background, Login/Signup tabs
- Login: email + password · Signup: username + email + password
- Calls `POST /api/auth/login` and `/api/auth/signup`
- Stores JWT + username; toasts on 400/401; zod validation

### Workspace Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ [☰] CompilerHub  [Enterprise]      System Ready · [User ⌄]   │
├──────────────────────────┬───────────────────────────────────┤
│  Source Code             │  [ Output | Warning | Error ]     │
│  filename.c  A- A+       │  [ Lex | Syntax | Sem | Inter ]   │
│  [Export]  [Run ▶]       │  ─────────────────────────────    │
│  ──────────────────      │                                   │
│  Monaco editor           │  contextual content / empty state │
│                          │                                   │
└──────────────────────────┴───────────────────────────────────┘
```

Two main resizable panes via `react-resizable-panels`. The file explorer is **hidden behind a sheet** opened via the `☰` button in the header (and `Ctrl/Cmd+B` shortcut).

### Header
- Left: hamburger (opens explorer sheet), CompilerHub logo + "Enterprise" badge
- Right: "System Ready" status pill, username chip with dropdown (Settings, Logout)
- Settings dialog: configurable backend `baseURL` (default `http://localhost:5000`), persisted to localStorage

### File Explorer (sheet, hidden by default)
- Slide-over from the left with the full file tree
- Fetches `/api/fs/tree`; builds hierarchy from flat files/folders via `parent_id`/`folder_id`
- Recursive render, expand/collapse chevrons
- Hover folder → quick-add (file / folder); right-click + `⋯` → Rename, Delete (with confirm)
- Click file → loads into editor, marks active, closes sheet on mobile
- Empty state: "Create your first file"
- Endpoints: `GET /api/fs/tree`, `POST/PUT/DELETE /api/fs/file|folder/<id>`

### Source Code Panel (left)
Header row:
- Active **filename / breadcrumb** on the left
- **A- / A+** font-size controls (Monaco font size, persisted to localStorage)
- **Export** button (downloads current buffer as `.c`)
- Primary purple **Run Compiler** button (also `Ctrl/Cmd+Enter`)

Editor body:
- `@monaco-editor/react`, language `c`, dark theme
- Tracks dirty state; debounced auto-save (1000ms) → `PUT /api/fs/file/<id>`; `Ctrl/Cmd+S` forces save
- Saving indicator (saving… / saved · timestamp) inline in the header
- Empty state when no file is selected ("Open a file from the explorer or start typing")

### Compilation Panel (right) — Stacked Tabs

Two horizontal tab rows, matching the reference:

**Row 1 — Category (primary tabs):** `Output` · `Warning` · `Error`
- Each shows live count badge (e.g. `Error · 3`) so problems are visible without entering an empty tab.

**Row 2 — Phase (sub-tabs):** `Lexical` · `Syntax` · `Semantic` · `Intermediate Code`
- Active phase highlighted in coral/red (matches reference).
- Single phase active at a time (no `All` tab in this layout — keeps it clean).

**Cell content:**
- **Output + Lexical** → table: Token Type · Lexeme · Line
- **Output + Syntax** → collapsible JSON tree viewer (AST)
- **Output + Semantic** → symbol-table grid
- **Output + Intermediate** → monospace TAC block
- **Warning + <phase>** → list of warnings for that phase: yellow ▲ icon, line (clickable → jumps editor cursor), message
- **Error + <phase>** → same shape, red ● icon
- Empty state per cell: italic muted text ("Compile your code to see lexical output", "No errors in Syntax phase", etc.) — matches the reference's "Compile your code to see icg error".

While `/api/compile` is in flight: skeleton/spinner in panel body, Run button disabled.

### State (Zustand)
- **authStore** — token, username, isAuthenticated, login/logout
- **fsStore** — files/folders, derived tree, activeFileId, dirty, CRUD, refresh
- **compilerStore** — isCompiling, response, `category` (`output|warning|error`), `phase` (`lexical|syntax|semantic|intermediate`), selectors (`errorsByPhase`, `warningsByPhase`, totals), `run`, `setCategory`, `setPhase`
- **uiStore** — explorer sheet open/closed, editor font size, backend baseURL

### API Client
- Single axios instance, `baseURL` from uiStore (Settings dialog)
- Request interceptor: `Authorization: Bearer <token>`
- Response interceptor: 401 → clear auth, redirect to `/auth`
- Adapter normalizes legacy `{ compiler_logs, lexical, syntax, semantic, error }` → expected shape

### Expected `/api/compile` Shape
```json
{
  "success": true,
  "data": {
    "lexical":      { "output": [], "warnings": [], "errors": [] },
    "syntax":       { "output": {}, "warnings": [], "errors": [] },
    "semantic":     { "output": [], "warnings": [], "errors": [] },
    "intermediate": { "output": "", "warnings": [], "errors": [] }
  }
}
```
Each warning/error: `{ line, message }`; frontend tags with phase when flattening.

### Design System (matches reference)
Dark only. HSL tokens in `index.css` + `tailwind.config.ts`:
- Background deep navy (`#0B0F1E`-ish), Panel cards slightly lighter with rounded borders + subtle border glow
- **Primary purple** (~`#7C5CFF`) for Run Compiler and active primary tab
- **Active phase coral** (~`#F87171`) for the highlighted phase sub-tab
- Success green, Warning amber (▲), Destructive red (●)
- Inter for UI, JetBrains Mono for code/logs/tables
- Rounded panel cards (`rounded-2xl`), 4px baseline grid, dense table rows

### Responsiveness & A11y
- Desktop: 2 resizable panes side-by-side
- Tablet/mobile: panes stack vertically; explorer sheet still works the same
- Shortcuts: `Ctrl/Cmd+Enter` (run), `Ctrl/Cmd+S` (force save), `Ctrl/Cmd+B` (toggle explorer sheet)
- ARIA on icon buttons, visible focus rings, live region announces "Compilation finished — N errors, M warnings"

### Dependencies
Add: `@monaco-editor/react`, `monaco-editor`, `zustand`, `axios`. Reuse: `react-resizable-panels`, shadcn (`tabs`, `dialog`, `dropdown-menu`, `context-menu`, `table`, `sheet`), `sonner`, `zod`.

### Out of Scope (v1)
No backend code, single active file (no editor tabs), no collab/Git/debugger, Monaco's built-in C grammar only.

### Note
If Flask runs on a different origin, backend needs `flask-cors`. Out of scope here but expect CORS errors otherwise.