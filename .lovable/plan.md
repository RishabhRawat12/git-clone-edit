# Header Redesign — From Webpage to IDE Chrome

The current header reads like a generic SaaS top bar: gradient logo tile, big rounded search input floating in the middle, plain "demo-user ▾" on the right, and a thin border below. Real IDEs (VS Code, Cursor, JetBrains Fleet) treat the header as **app chrome**, not a hero. Here's how to fix it.

## What's wrong right now
- **Gradient logo tile** — purple gradient screams marketing site.
- **Floating pill search** — the rounded `bg-background/60` capsule in the middle is a website pattern. IDEs use a thin, wide, non-rounded omnibar.
- **Empty negative space** — large gaps either side of the search make the bar feel sparse.
- **No menubar** — there's no File / Edit / View, which is the #1 reason it doesn't feel like a real tool.
- **User pill on the right is bland** — just text + chevron, no avatar, no presence dot.
- **Hard horizontal border** below the header gives it a "header / body" website feel instead of integrated chrome.

## Proposed new header (36px tall, 3 zones)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ⚡ CompilerHub │ File  Edit  View  Run  Help │  ⌕ scratch.c — CompilerHub  ⌘K │  ▶ Run │ ⎇ main │ 🟢 DU ▾ │
└────────────────────────────────────────────────────────────────────────────┘
   ── brand ──   ─────── menubar ───────       ──── omnibar (centered) ────    ── actions ──   ── user ──
```

### 1. Brand block (left)
- Replace the gradient tile with a **flat monochrome SVG glyph** in `--primary` (no gradient, no background). A single mark + wordmark in `font-semibold tracking-tight`.
- Add a subtle `text-muted-foreground` separator dot or `│` after the wordmark to visually break into the menubar.

### 2. Menubar (Radix Menubar)
- File / Edit / View / Run / Help — each opens a dropdown mirroring Command Palette actions, with shortcut hints right-aligned in each item.
- Reuses the palette command registry — no new logic, just a second surface.
- This single addition is the biggest "feels like a desktop app" change you can make.

### 3. Omnibar (centered, replaces pill search)
- Drop the rounded `rounded-md bg-background/60` capsule.
- Use a **thin, wide, low-contrast bar** (`h-6 max-w-xl bg-surface-2/60 border border-border/50 rounded-sm`).
- Show **current context** in the omnibar when idle: `scratch.c — CompilerHub` (workspace name + active file), like Chrome's address bar showing the current page.
- `⌘K` chip on the right; `⌕` icon on the left in `text-subtle-foreground`.
- Hover/focus → border brightens to `border-primary/50`, no background change.

### 4. Primary action (right of omnibar)
Promote **Run** out of the editor toolbar into the header as a **compact primary button** (`h-6 px-2.5 bg-primary text-primary-foreground rounded-sm` with a play glyph). One-click compile from anywhere is an IDE staple. Add a split-button caret for "Run with options."

### 5. Branch chip
A small `⎇ main` chip (like GitHub's) next to Run. Static for now; click opens a placeholder branch popover. Even as demo-only it instantly reads "developer tool."

### 6. User block (right)
- Replace text-only `demo-user ▾` with a **24px circular avatar** (initials on a deterministic color from username hash) + a tiny **online presence dot** (`size-1.5 bg-success rounded-full ring-2 ring-surface-1`) on the bottom-right of the avatar.
- Keep the dropdown but add: avatar + full name header, divider, Settings, Theme submenu, Keyboard shortcuts, Log out.

### 7. Chrome treatment
- **Reduce height** from 36px to **32px** to match the status bar's 24px (thin chrome reads professional).
- **Remove the hard `border-b`** — replace with a `shadow-[inset_0_-1px_0_hsl(var(--border)/0.5)]` so the divider is half-strength and feels integrated.
- **Background**: `bg-surface-1` with a 1px top inset highlight (`shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]`) — gives the bar a subtle "lit from above" depth like macOS title bars.
- Add `-webkit-app-region: drag` on empty zones so it feels like a native window chrome (harmless on web, used if ever wrapped in Tauri/Electron).

### 8. Move the layout-direction toggle (`Rows2 / Columns2`) out of the header
It belongs in **View → Editor Layout** in the menubar, or in the Activity Bar. Removes two icons from the header and reclaims space.

### 9. Optional: Workspace switcher
Replace the static `CompilerHub` wordmark with a **clickable workspace dropdown** showing the project name + a chevron. Opens a list of recent workspaces. Even with one workspace today, the affordance reads "this is a real tool."

## Implementation notes (technical)
- Use `@/components/ui/menubar` (already in the project) for the menu.
- Add a `useCommands()` registry hook so menubar + palette pull from the same source.
- Brand glyph: keep `Zap` from lucide but render as `text-primary` only, no background.
- Avatar: small custom component, deterministic HSL from `hashString(username)`.
- Status (online) ring uses `ring-surface-1` so it punches a hole in the avatar correctly.
- Keep `Cmd/Ctrl+K` binding and add `Alt+F`, `Alt+E`, `Alt+V`, `Alt+R`, `Alt+H` for menubar accelerators (Radix Menubar handles this).

## Recommended starting set
If you want one tight pass: **#1 flat brand**, **#2 menubar**, **#3 omnibar restyle + context label**, **#4 Run button in header**, **#6 avatar with presence**, **#7 chrome treatment**. That's the visible 80% of the redesign without touching the rest of the IDE.

Tell me which numbers (or "starting set" / "all of it") and I'll build it.
