# 1k GitHub Stars

![Next.js](https://img.shields.io/badge/next.js-16-black)
![TypeScript](https://img.shields.io/badge/typescript-5-blue)
![License](https://img.shields.io/github/license/xiaoxiunique/1k-github-stars)

Interactive treemap of 60k+ GitHub repositories with daily momentum, curated discovery, and language-level exploration.

**Live site:** [ustars.dev](https://ustars.dev)

## Table of Contents
- [Highlights](#highlights)
- [Screenshots](#screenshots)
- [How It Works](#how-it-works)
- [Data Files](#data-files)
- [Installation](#installation)
- [Usage](#usage)
- [Deployment](#deployment)
- [Repository Structure](#repository-structure)
- [Notes](#notes)

## Highlights
- **Projects tab** for the default treemap view
- **Daily tab** for star-growth momentum
- **Awesome tab** for curated and guide-style repositories
- **Language drill-down** for focused exploration by ecosystem
- **Search** across repository name, description, and language labels
- **Static hover metadata** to avoid per-hover API requests

## Screenshots
### Homepage overview
![Homepage overview](./public/readme/ustars-home.png)

### Search example
![Search results for "skills"](./public/readme/skills-search.png)

## How It Works
The app renders a static Next.js site backed by repository snapshot data. It separates the main visualization dataset from hover metadata so the UI stays responsive without runtime server calls.

## Data Files
- `data/repos.json`, main repository dataset
- `public/repo-meta.json`, lightweight hover metadata index
- `data/snapshots/`, previous snapshots used for growth calculations

Each repository row currently stores:
1. `fullName`
2. `stars`
3. `forks`
4. `langIdx`
5. `description`
6. `growth`
7. `createdAt`
8. `updatedAt`

## Installation
```bash
git clone https://github.com/xiaoxiunique/1k-github-stars.git
cd 1k-github-stars
npm install
```

## Usage
### Start local development
```bash
npm run dev
```

Then open `http://localhost:3000`.

### Refresh GitHub data
```bash
npm run refresh:growth
```

This script refreshes repository stats, computes growth against the previous snapshot, writes resumable progress, archives the previous dataset, and regenerates `public/repo-meta.json`.

### Build the static site
```bash
npm run build
```

## Deployment
### Cloudflare Pages
```bash
npm run build
npx wrangler pages deploy out --project-name github-treemap --branch main
```

## Repository Structure
```text
app/                  Next.js App Router pages
components/           treemap canvas, header, tooltip, panel
data/                 repository snapshot data
lib/                  grouping, filtering, classifier, metrics
public/repo-meta.json hover metadata index
scripts/              data refresh scripts
```

## Notes
- Curated repositories are filtered at the data layer, not only in the UI.
- The project is configured as a static export.
