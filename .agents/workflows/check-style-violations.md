---
description: Systematic workflow for detecting and fixing STYLING_GUIDE violations in TS/TSX files using 3-file batches.
---

# Check Style Violations Workflow

Use this workflow when asked to audit or fix styling-guide adherence.

## Goal

- Find real violations against `STYLING_GUIDE.md`.
- Fix them in small safe batches (3 files at a time).
- Re-verify each batch before moving on.
- End with a repo-wide confirmation report.

## Sources of truth

- `STYLING_GUIDE.md`
- `src/styles/design-system.css`
- `THEME_CONTRACT.md` (for token surface expectations)

## Core rules to enforce

- No raw/non-semantic presentational classes in JSX/TSX:
  - Disallow: `text-white`, `bg-black/40`, `hover:text-red-400`, `bg-[#...]`, `shadow-[...]`, raw `rgba(...)`, etc.
  - Prefer semantic tokens: `text-foreground`, `text-destructive`, `bg-background-*`, `border-glass-*`, `shadow-xl`, `shadow-glow`.
- Semantic token opacity variants are allowed:
  - Allow: `ring-accent/30`, `bg-accent/10`, `border-glass-border-base/60`.
- Raw hex is allowed only for non-presentational data/state:
  - Example: color picker values stored in state/arrays for `input[type="color"]`.
- Keep layer/motion/size rules tokenized:
  - Avoid hardcoded legacy values like `z-10/20/50/100`, `duration-200/300`, `ease-out/in-out`, banned fixed heights.

## Batch process (3 files at a time)

1. Build file list.

`bash`:

```bash
rg --files src/components/settings/tabs | sort
```

`PowerShell`:

```powershell
rg --files src/components/settings/tabs | Sort-Object
```

2. Run a candidate scan (broad, may include false positives).

`bash`:

```bash
rg -n "\b(text|bg|border|ring|from|to|via)-(white|black|red|rose|amber|emerald|blue|violet|pink|gray|slate|zinc|neutral|stone)(-|/|\b)|bg-\[#|shadow-\[|rgba\(|shadow-2xl|duration-(150|200|300)|ease-(out|in-out)|\bz-(10|20|30|40|50|100)\b" src --glob "*.tsx" --glob "*.ts" || true
```

`PowerShell`:

```powershell
rg -n '\b(text|bg|border|ring|from|to|via)-(white|black|red|rose|amber|emerald|blue|violet|pink|gray|slate|zinc|neutral|stone)(-|/|\b)|bg-\[#|shadow-\[|rgba\(|shadow-2xl|duration-(150|200|300)|ease-(out|in-out)|\bz-(10|20|30|40|50|100)\b' src --glob '*.tsx' --glob '*.ts'
if ($LASTEXITCODE -gt 1) { exit $LASTEXITCODE }
```

3. Take next 3 files only. Open them and confirm which matches are real violations vs exceptions.

4. Apply fixes for those 3 files only.

5. Re-scan those same 3 files only.

`bash`:

```bash
rg -n "text-white|hover:text-white|text-red-|hover:text-red-|bg-red-|border-red-|bg-\[#|shadow-\[|rgba\(|shadow-2xl" <file1> <file2> <file3> || true
```

`PowerShell`:

```powershell
rg -n 'text-white|hover:text-white|text-red-|hover:text-red-|bg-red-|border-red-|bg-\[#|shadow-\[|rgba\(|shadow-2xl' <file1> <file2> <file3>
if ($LASTEXITCODE -gt 1) { exit $LASTEXITCODE }
```

6. Validate compilation after each batch.

```bash
npm run typecheck
```

7. Repeat for next 3 files.

## Preferred replacement patterns

- `text-white` -> `text-foreground` or `text-accent-foreground` (when on accent bg).
- `hover:text-white` -> `hover:text-foreground-hover`.
- `text-red-*` / `hover:text-red-*` -> `text-destructive` / `hover:text-destructive-hover`.
- `bg-red-*/...` -> `bg-destructive/...`.
- `border-red-*/...` -> `border-destructive/...`.
- `bg-[#0a0a0c]` (or similar raw bg) -> `bg-background-deep` (or closest semantic bg token).
- `shadow-2xl` -> `shadow-xl` unless a documented exception exists.

## Final repo-wide verification

Run after all batches:

`bash`:

```bash
rg -n "\b(text|bg|border|ring|from|to|via)-(white|black|red|rose|amber|emerald|blue|violet|pink|gray|slate|zinc|neutral|stone)(-|/|\b)|bg-\[#|shadow-\[|rgba\(|shadow-2xl|duration-(150|200|300)|ease-(out|in-out)|\bz-(10|20|30|40|50|100)\b" src --glob "*.tsx" --glob "*.ts" || true
npm run typecheck
```

`PowerShell`:

```powershell
rg -n '\b(text|bg|border|ring|from|to|via)-(white|black|red|rose|amber|emerald|blue|violet|pink|gray|slate|zinc|neutral|stone)(-|/|\b)|bg-\[#|shadow-\[|rgba\(|shadow-2xl|duration-(150|200|300)|ease-(out|in-out)|\bz-(10|20|30|40|50|100)\b' src --glob '*.tsx' --glob '*.ts'
if ($LASTEXITCODE -gt 1) { exit $LASTEXITCODE }
npm run typecheck
```

If Biome is available in the environment:

```bash
npm run check
```

If Biome is unavailable, explicitly report that limitation.

## Required output format to user

Always report:

1. Files checked in each batch.
2. Violations fixed (file + line + old pattern -> new pattern).
3. Any intentional leftovers and why they are allowed.
4. Validation results:
   - `typecheck` status
   - `check` status (or why it could not run).
