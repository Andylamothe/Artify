# ARtify

> Plateforme **Social + WebAR** créée pour le hackathon **HackTheSummit (Hack le Sommet)**.

[![Hackathon](https://img.shields.io/badge/Hackathon-HackTheSummit-8A2BE2)](#)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-000000?logo=nextdotjs)](#)
[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?logo=react&logoColor=000)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](#)
[![MindAR](https://img.shields.io/badge/WebAR-MindAR-0ea5e9)](#)
[![A-Frame](https://img.shields.io/badge/3D-A--Frame-ef2d5e)](#)
[![Google Vertex AI](https://img.shields.io/badge/AI-Google%20Vertex-4285F4?logo=googlecloud&logoColor=white)](#)

Production: **https://artify.technoboost.ca**

## Vision

ARtify connecte la découverte d'œuvres d'art et l'expérience immersive:
- exploration d'œuvres via un feed social mobile-first,
- ouverture d'expériences AR directement dans le navigateur,
- enrichissement par IA (Q&A, narration, living art).

## Stack (tags)

`Next.js` `React` `TypeScript` `Tailwind CSS` `Framer Motion` `Zustand` `MindAR` `A-Frame` `Three.js` `GSAP` `Google Vertex AI (Gemini)` `Google Cloud STT` `Web Speech API` `Jest`

## Monorepo

```text
apps/
  ar-web/          Expérience WebAR + Workbench de création AR
  social-artify/   App sociale (auth, feed, likes, saved, profil)
  landing-page/    Landing statique de démonstration
  front-ui/        Workspace réservé
  social/          Workspace réservé
tools/
  mind-workshop/   Outils/atelier MindAR
docs/
  Documentation technique, plans, handoff, résumés stack
```

## Fonctionnalités livrées

### 1) App sociale (`apps/social-artify`)
- Authentification complète (register/login/logout/me/profile) avec JWT + bcrypt.
- Mode invité + bannière de conversion.
- Feed de découverte type swipe avec likes/dislikes et filtres.
- Pages artwork détaillées (métadonnées, like, save, partage, lien AR).
- Profil utilisateur + œuvres sauvegardées.
- Parcours onboarding/quiz de goût artistique.
- Routes artist/admin (upload/génération) déjà présentes dans le projet.

### 2) App AR (`apps/ar-web`)
- Expérience WebAR image-tracking (MindAR) sans application native.
- Scènes A-Frame/Three.js avec objets AR variés (`text`, `image`, `gif`, `video`, `model3d`, `button`, `panel`, `portfolio`, `brush`).
- Workbench d’édition AR: gestion artworks, targets `.mind`, placement d’objets, preview.
- Upload/serving d’assets (images/vidéos/WebP animés) avec support byte-range vidéo.
- Audio et accessibilité: narration, TTS, STT vocal.

### 3) IA / Living Art
- API Gemini pour Q&A contextuel autour des œuvres.
- Pipeline AI Motion/Living Art pour analyser une œuvre et générer du contenu animé.
- Intégration Google Cloud (auth + services IA/STT).

## APIs principales

### Social
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/profile`
- `POST /api/auth/logout`
- `GET /api/artworks`
- `GET /api/artworks/[id]`
- `POST /api/artworks/[id]/like`
- `POST /api/artworks/[id]/dislike`
- `POST /api/artworks/[id]/save`

### AR
- `POST /api/gemini`
- `POST /api/stt`
- `POST /api/workbench/ai-motion`
- `POST /api/workbench/mind`
- `GET|POST /api/workbench/artworks`
- `GET|POST /api/workbench/assets`

## Démarrage local

### Social app
```bash
cd /tmp/workspace/Andylamothe/Artify/apps/social-artify
npm install
npm run dev
```

### AR app
```bash
cd /tmp/workspace/Andylamothe/Artify/apps/ar-web
npm install
npm run dev:host
```

## Build, lint, tests

### `apps/ar-web`
```bash
npm run lint
npm run build
npm test
```

### `apps/social-artify`
```bash
npm run lint
npm run build
```

## Variables d’environnement (AR)

Voir:
- `/tmp/workspace/Andylamothe/Artify/apps/ar-web/.env.example`
- `/tmp/workspace/Andylamothe/Artify/apps/ar-web/docs/`

Variables clés utilisées par les features IA:
- `GOOGLE_APPLICATION_CREDENTIALS`
- `GCP_PROJECT_ID`
- `VERTEX_AI_LOCATION`
- `VERTEX_AI_MODEL`

## Collaborateurs

Ajoutez ici les noms des collaborateurs du projet:
- [ ] Nom du collaborateur 1
- [ ] Nom du collaborateur 2
- [ ] Nom du collaborateur 3

## Références projet

- `/tmp/workspace/Andylamothe/Artify/message.txt` (inventaire détaillé des features)
- `/tmp/workspace/Andylamothe/Artify/docs/Stacks Resume/03-artify-full-stack.md`
- `/tmp/workspace/Andylamothe/Artify/apps/ar-web/docs/AR_MUSEUM_EXPERIENCE.md`

---

ARtify · HackTheSummit
