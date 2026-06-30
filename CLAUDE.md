# Project conventions

## Images in markdown docs

All images referenced from root-level `.md` files (e.g. `Recording.md`,
`MultiDomainSSO.md`, `NewFeatures.md`, `Improvement.md`) live under [docs/](docs/), not
the repo root. Link to them with a relative path: `![alt text](docs/image.png)`.

If a new screenshot lands at the repo root (e.g. from pasting into a doc), move it into
`docs/` and update the markdown link to match, rather than leaving it at the root.
