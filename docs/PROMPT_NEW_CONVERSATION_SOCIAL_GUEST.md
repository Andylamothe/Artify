Tu reprends le projet Artify dans `C:\Users\PC\Documents\HackTheSummit`.

Lis d'abord ce handoff:
`C:\Users\PC\Documents\HackTheSummit\docs\HANDOFF_SOCIAL_GUEST_LIKES_AND_BRIDGE_2026-05-24.md`

Objectif prioritaire:
Dans Social Hub, un guest (sans compte) doit pouvoir liker, finir le deck, puis voir le résumé + map des œuvres likées, sans login obligatoire.

Contexte d’architecture:
- AR app: `apps/ar-web` (VM service `hackthesummit-ar`, port `3287`)
- Social app: `apps/social-artify` (VM service `hackthesummit-socialhub`, port `3290`)
- Bridge via `apps/ar-web/next.config.ts`:
  `/social/:path*` rewrite vers `SOCIAL_INTERNAL_ORIGIN` (par défaut `http://127.0.0.1:3290`)

Ce que tu dois faire maintenant:
1. Audit du flow guest like actuel dans `apps/social-artify`
2. Vérifier que le résumé + map apparaissent à la fin sans compte
3. Corriger tout bug de state/session guest
4. Vérifier le flow via bridge depuis `http://192.168.0.46:3287/social`
5. Déployer les changements sur la VM
6. Donner un rapport final: bug trouvé, fix appliqué, tests faits, URLs de vérification

Contraintes importantes:
- Ne pas casser AR runtime/workbench.
- Ne pas toucher la partie wasm-webp (un autre agent travaille dessus).
- Ne jamais exposer de secrets/mot de passe dans git.
