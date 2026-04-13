# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Chrome Extension

A standalone Chrome extension lives in `/chrome-extension/`. It extracts transcripts from YouTube videos.

**Files:**
- `manifest.json` — Manifest V3 extension config
- `content.js` — Content script that runs on YouTube, fetches transcript XML via YouTube's caption API
- `popup.html/css/js` — The extension popup UI with search, copy, and playback sync
- `icons/` — Extension icons (16px, 48px, 128px)

**Load in Chrome:** `chrome://extensions` → Developer mode → Load unpacked → select `chrome-extension/`
