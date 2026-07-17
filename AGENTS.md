# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is
This is **not a runnable app** — it is a catalog of [Hayase](https://github.com/EffNine/hayase-extensions)
extensions. Each `*.js` file is a standalone ES module (`export default`) implementing a torrent/NZB
indexer source, and `index.json` is the manifest catalog Hayase loads them from. There is no server,
no build step, and no automated test framework in this repo.

### Dependencies
`npm install` (already run by the startup update script) installs `@ejnshtein/nyaasi` (used only by
`nyaasi.js`) and `chokidar` (used only by the `auto-commit` tool). No lockfile is tracked.

### Running / exercising an extension (the "app")
The extensions normally run inside the Hayase browser sandbox, but you can exercise them directly in
Node to verify behavior. Non-obvious gotchas:
- **ESM vs CJS mismatch:** files use `export default` but `package.json` has no `"type": "module"`, so
  Node treats bare `.js` as CommonJS and importing one directly fails. Copy the file to a temporary
  `.mjs` **inside the repo root** (so bare imports like `@ejnshtein/nyaasi` resolve against
  `node_modules`) and `import()` that, or run inside Hayase.
- **Browser globals:** extensions rely on `navigator.onLine`, `fetch`, and `atob`. Node 22 provides
  `fetch`/`atob`, but `navigator.onLine` is `undefined` — extension guards like
  `if (!navigator.onLine) return []` then return empty. Shim it before importing:
  `Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })`.
- **Injected fetch:** Hayase passes a CORS-bypassing `fetch` via the query/options argument
  (`query.fetch`). In Node just pass the global `fetch`.
- **Method contract:** torrent sources implement `test()`, `single(query)`, `batch(query)`,
  `movie(query)`; NZB/URL sources implement `test()` and `search(hash)`. See `index.d.ts`.
- **Live network required:** extensions call live third-party indexers (nyaa.si, subsplease.org,
  animetosho, nekobt, etc.). Results depend on outbound HTTPS and what those sites currently host, so
  an empty result array is not necessarily a failure — use `test()` for a connectivity check.

### Lint / test / build
There is no lint config, no test runner, and no build. The only npm script is `auto-commit`.

### Do NOT run `npm run auto-commit`
`tools/auto-commit.js` is a `chokidar` watcher that automatically `git add -A`, commits, and **pushes**
on every file change. Never start it in an agent session — it will make unintended commits/pushes.
