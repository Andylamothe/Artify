# MindAR Source Targets

Put the exact images you want to scan here, in this order:

1. `mona-lisa.jpg`
2. `starry-night.jpg`
3. `the-scream.jpg`

Then compile them into:

```text
public/ar/targets/artworks.mind
```

The order matters because it maps to `targetIndex` in `src/data/artworks.ts`.
