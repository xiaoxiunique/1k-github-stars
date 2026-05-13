# 1k GitHub Stars

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](#local-development)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?logo=typescript&logoColor=white)](#local-development)
[![License](https://img.shields.io/github/license/xiaoxiunique/1k-github-stars)](LICENSE)
[![Live Site](https://img.shields.io/badge/Live-ustars.dev-0ea5e9)](https://ustars.dev)

Interactive treemap of 60k+ GitHub repositories with daily momentum, curated discovery, and language-level exploration.

**Live site:** [ustars.dev](https://ustars.dev)

![Homepage overview](./public/readme/ustars-home.png)

## Table of Contents

- [What it shows](#what-it-shows)
- [Key features](#key-features)
- [Local development](#local-development)
- [Refresh GitHub data](#refresh-github-data)
- [Build and deploy](#build-and-deploy)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [Notes](#notes)

## What it shows

This project turns a large GitHub repo snapshot into an explorable treemap so you can quickly spot:

- large repos by stars
- fast-moving repos by 30-day growth
- curated “awesome” style projects
- language-specific pockets of activity

## Key features

- **Projects / Daily / Awesome views** for different exploration modes
- **Metric switcher** for stars, 30-day growth, and forks
- **Search** across repository name, description, and language labels
- **Hover metadata index** for lightweight detail lookups
- **Static export** workflow for simple deployment
- **Cloudflare Pages** deployment path already wired into scripts

## Local development

### Requirements

- Node.js 20+
- npm

### Install

```bash
git clone https://github.com/xiaoxiunique/1k-github-stars.git
cd 1k-github-stars
npm install
```

### Run locally

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Refresh GitHub data

To rebuild growth metrics from the current repo dataset:

```bash
npm run refresh:growth
```

The refresh script:

- updates stars, forks, and timestamps from GitHub
- computes growth against the previous local snapshot
- writes a resumable progress file for long runs
- snapshots prior data into `data/snapshots/`
- regenerates `public/repo-meta.json`

## Build and deploy

### Build static output

```bash
npm run build
```

### Deploy to Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy out --project-name github-treemap --branch main
```

## Project structure

```text
app/                  Next.js App Router pages
components/           treemap canvas, header, tooltip, panel
data/                 repo snapshot data
lib/                  grouping, filtering, classifier, metrics
public/repo-meta.json static hover metadata index
scripts/              data refresh scripts
```

## Data model

The app is driven mainly by:

- `data/repos.json`: main repository dataset
- `public/repo-meta.json`: lightweight hover metadata index

Each row currently stores:

1. `fullName`
2. `stars`
3. `forks`
4. `langIdx`
5. `description`
6. `growth`
7. `createdAt`
8. `updatedAt`

## Notes

- The project intentionally separates treemap data from hover metadata to reduce runtime latency.
- Curated repositories are filtered at the data layer so views stay consistent.
- The repo is configured as a static export, which keeps hosting simple and cheap.
