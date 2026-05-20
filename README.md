# Hayase Extensions — fork for Hayase compatibility

This repository contains extensions formatted for the Hayase app. To import the full index into Hayase, use the following URL in Hayase's "Import extensions" field:

https://raw.githubusercontent.com/afnanrudy/extensions/hayase-update/index.json

What I changed in this branch (`hayase-update`):
- Updated `nekobt.js`, `seadex.js`, `animetosho.js`, and `animetosho-nzb.js` to match upstream optimized implementations.
- Updated `index.json` to point at raw files on the `hayase-update` branch so Hayase can import the updated extensions.

How to publish to users:
1. Review the changes on the `hayase-update` branch and create a Pull Request into `main`.
2. After merging, update `index.json` on `main` (if needed) and the raw links will be available at `https://raw.githubusercontent.com/afnanrudy/extensions/main/index.json`.

Auto-commit helper:
- A small Node watcher is included at `tools/auto-commit.js`. Install dev deps and run `npm run auto-commit` to auto-stage/commit/push changes when files change.

If you want me to create the PR body and open it in your browser, request it and I'll do that next.
