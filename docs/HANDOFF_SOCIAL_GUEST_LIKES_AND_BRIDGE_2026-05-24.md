# Artify Handoff — Social Guest Likes + AR/Social Bridge

Date: 2026-05-24  
Repo: `C:\Users\PC\Documents\HackTheSummit`  
Branch observée: `codex/audio-accessibility-integration`

## Objectif produit (priorité actuelle)

Permettre à un visiteur **sans compte** de:

1. liker des artworks dans Social Hub,  
2. conserver ces likes dans la session guest,  
3. arriver à la fin sur un **résumé** + **map musée** (étages/pièces),  
4. sans forcer login/register.

## Architecture actuelle

- AR Web app: `apps/ar-web` (service VM: `hackthesummit-ar`, port `3287`)
- Social Hub app: `apps/social-artify` (service VM: `hackthesummit-socialhub`, port `3290`)
- Bridge côté AR:
  - `apps/ar-web/next.config.ts`
  - rewrite `/social/:path*` -> `SOCIAL_INTERNAL_ORIGIN` (default actuel: `http://127.0.0.1:3290`)

## Ce qui est déjà en place (social guest flow)

Dans `apps/social-artify`:

- `src/store/authStore.ts`
  - `guestSessionId` ajouté
- `src/hooks/useAuth.ts`
  - génération `guestSessionId` au mode guest
- `src/hooks/useLike.ts`
  - guest peut liker/unliker localement (session) sans API auth
- `src/components/social/ActionBar.tsx`
  - état coeur compatible user + guest
- `src/store/feedStore.ts`
  - garde-fou anti-doublon sur like
- `src/app/discover/page.tsx`
  - fin de deck -> écran résumé
  - résumé des likes + map groupée par étage
- `data/artworks.json`
  - `galleryLocation` renseigné par artwork

## Point de vigilance principal

Même si le code est présent, il faut **valider en QA complète via le bridge**:

1. Depuis `http://192.168.0.46:3287/` -> aller sur `/social`  
2. Entrer en guest  
3. Liker plusieurs œuvres  
4. Finir le deck  
5. Vérifier résumé + map sans création de compte  
6. Reload page et confirmer comportement attendu session guest

## Landing demandée

La landing de `apps/landing-page` a été recréée dans `apps/ar-web` sur `/` avec GSAP-like behavior.
À valider visuellement mobile + desktop contre `apps/landing-page`.

## Déploiement

Script utilisé pour AR et Social:

- `apps/ar-web/scripts/deploy_remote_vm.py`

Exemple Social:

```powershell
$env:VM_PASSWORD='***'; @'
import os, sys, getpass
sys.path.insert(0, r'C:\Users\PC\Documents\HackTheSummit\apps\ar-web\scripts')
getpass.getpass = lambda prompt='': os.environ['VM_PASSWORD']
import deploy_remote_vm
sys.argv = [
  'deploy_remote_vm.py',
  '--host', '192.168.0.46',
  '--user', 'yasser',
  '--source', r'C:\Users\PC\Documents\HackTheSummit\apps\social-artify',
  '--remote-src', '~/apps/hackthesummit-socialhub-src',
  '--app-slug', 'hackthesummit-socialhub'
]
raise SystemExit(deploy_remote_vm.main())
'@ | python -; Remove-Item Env:\VM_PASSWORD
```

## Règles importantes

- Ne jamais commiter de mot de passe VM ni secrets.
- `creds`/service account doit rester exclu de git.
- Ne pas toucher la partie `wasm-webp` (un autre agent travaille dessus).

## Next step recommandé (immédiat)

Faire une passe de QA E2E sur Social Guest Likes + Summary/Map via `/social` derrière `3287`, puis corriger les éventuels écarts UX/state persist.
