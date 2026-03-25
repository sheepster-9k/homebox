> **This is a community fork of [sysadminsmedia/homebox](https://github.com/sysadminsmedia/homebox).**
> It adds optional AI-powered companion features (chat, vision capture, QR scanning) via a sidecar service.
> All original Homebox functionality is preserved. Licensed under [AGPL-3.0](LICENSE), same as upstream.

---

<div align="center">
  <img src="/docs/src/assets/lilbox.svg" height="200"/>
</div>

<h1 align="center" style="margin-top: -10px;"> HomeBox </h1>
<p align="center" style="width: 100%;">
   <a href="https://homebox.software/en/">Docs</a>
   |
   <a href="https://demo.homebox.software">Demo</a>
   |
   <a href="https://discord.gg/aY4DCkpNA9">Discord</a>
</p>
<p align="center" style="width: 100%;">
    <img src="https://img.shields.io/github/check-runs/sysadminsmedia/homebox/main" alt="Github Checks"/>
    <img src="https://img.shields.io/github/license/sysadminsmedia/homebox"/>
    <img src="https://img.shields.io/github/v/release/sysadminsmedia/homebox?sort=semver&display_name=release"/>
    <img src="https://img.shields.io/weblate/progress/homebox?server=https%3A%2F%2Ftranslate.sysadminsmedia.com"/>
</p>
<p align="center" style="width: 100%;">
    <img src="https://img.shields.io/reddit/subreddit-subscribers/homebox"/>
    <img src="https://img.shields.io/mastodon/follow/110749314839831923?domain=infosec.exchange"/>
    <img src="https://img.shields.io/lemmy/homebox%40lemmy.world?label=lemmy"/>
</p>

---

## Fork: Homebox Companion (HBC) Integration

This fork extends Homebox with an optional **AI Companion** sidebar, powered by a separate sidecar service called [Homebox Companion (HBC)](https://github.com/sheepster-9k/homebox-companion). When the companion service is not configured, the fork behaves identically to upstream Homebox.

### What this fork adds

| Feature | Description |
|---|---|
| **AI Companion sidebar** | A new "AI Companion" section in the sidebar navigation with sub-pages for Chat, Snap & Catalog, and QR Scanner. |
| **AI Chat** | Natural-language inventory queries with streaming responses (e.g., "Where is my drill?"). |
| **Snap & Catalog** | Camera capture page that uses vision AI to auto-identify and catalog items. |
| **QR Scanner** | Scan QR codes and barcodes to look up or create items. |
| **AI Analyze on items** | An "AI Analyze" action in the item detail dropdown menu that opens a companion chat pre-filled with context about the selected item. |
| **Runtime configuration** | All companion features are gated behind a single environment variable (`NUXT_PUBLIC_HBC_URL`). When unset, no companion UI appears. |
| **Daily upstream sync** | A GitHub Actions workflow that checks for upstream changes daily and opens a PR to merge them. |

### Files added or modified

**New files:**
- `frontend/composables/use-companion.ts` -- composable for all HBC API interactions
- `frontend/pages/companion/index.vue` -- companion landing page
- `frontend/pages/companion/chat.vue` -- streaming AI chat page
- `frontend/pages/companion/capture.vue` -- camera capture (iframe to HBC)
- `frontend/pages/companion/qr.vue` -- QR/barcode scanner (iframe to HBC)
- `.github/workflows/sync-upstream.yml` -- daily upstream sync workflow

**Modified files (integration points):**
- `frontend/layouts/default.vue` -- added companion nav entry to sidebar
- `frontend/pages/item/[id]/index.vue` -- added "AI Analyze" to item dropdown menu
- `frontend/locales/en.json` -- added `companion.*` translation keys
- `frontend/nuxt.config.ts` -- added `hbcUrl` to public runtime config

---

## Setup

### Prerequisites

1. A running **Homebox** instance (this fork).
2. A running **[Homebox Companion](https://github.com/sheepster-9k/homebox-companion)** sidecar service, accessible from the user's browser.

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NUXT_PUBLIC_HBC_URL` | No | `""` (disabled) | Full URL to the Homebox Companion service (e.g., `http://hbc:8080`). When empty, all AI features are hidden. |

All other Homebox environment variables work exactly as documented in the [upstream docs](https://homebox.software/en/quick-start/).

### Docker Build from Fork

```bash
# Clone and build
git clone https://github.com/sheepster-9k/homebox.git
cd homebox
docker build -t homebox-hbc .
```

### Example Docker Compose

```yaml
services:
  homebox:
    build: .
    # Or use a pre-built image if published:
    # image: ghcr.io/sheepster-9k/homebox:latest
    restart: unless-stopped
    ports:
      - "3100:7745"
    environment:
      TZ: "America/New_York"
      # Point to the companion sidecar
      NUXT_PUBLIC_HBC_URL: "http://hbc:8080"
    volumes:
      - homebox-data:/data
    depends_on:
      - hbc

  hbc:
    image: ghcr.io/sheepster-9k/homebox-companion:latest
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      HOMEBOX_URL: "http://homebox:7745"
      # Configure your LLM provider (see HBC docs)
      # LLM_PROVIDER: "openai"
      # OPENAI_API_KEY: "sk-..."
    volumes:
      - hbc-data:/data

volumes:
  homebox-data:
  hbc-data:
```

---

## Upstream Sync

This fork includes a GitHub Actions workflow (`.github/workflows/sync-upstream.yml`) that keeps the fork in sync with upstream.

### How it works

1. Runs daily at 06:00 UTC (or on manual dispatch).
2. Fetches `main` from `sysadminsmedia/homebox`.
3. If new commits exist, creates a `sync/upstream-YYYYMMDD` branch and attempts a merge.
4. Opens a pull request:
   - **Clean merge:** PR is ready to merge directly.
   - **Conflicts:** PR is opened with conflict markers and a `needs-resolution` label.

### Manual sync

```bash
git remote add upstream https://github.com/sysadminsmedia/homebox.git  # once
git fetch upstream main
git merge upstream/main
```

### Expected merge conflict files

When upstream modifies the same files this fork touches, conflicts will appear in:

- `frontend/layouts/default.vue` (sidebar navigation)
- `frontend/pages/item/[id]/index.vue` (item dropdown menu)
- `frontend/locales/en.json` (translation keys)
- `frontend/nuxt.config.ts` (runtime config)

**Resolution:** Keep both upstream changes and the HBC additions. The HBC additions are clearly scoped (companion nav entry, companion translation block, `hbcUrl` config key) so conflicts are straightforward to resolve.

---

## What is HomeBox

HomeBox is the inventory and organization system built for the Home User! With a focus on simplicity and ease of use, Homebox is the perfect solution for your home inventory, organization, and management needs. While developing this project, We've tried to keep the following principles in mind:

- _Simple but Expandable_ - Homebox is designed to be simple and easy to use. No complicated setup or configuration required. But expandable to whatever level of infrastructure you want to put into it.
- _Blazingly Fast_ - Homebox is written in Go, which makes it extremely fast and requires minimal resources to deploy. In general, idle memory usage is less than 50MB for the whole container.
- _Portable_ - Homebox is designed to be portable and run on anywhere. We use SQLite and an embedded Web UI to make it easy to deploy, use, and backup.

### Key Features
- Rich Organization - Organize your items into categories, locations, and tags. You can also create custom fields to store additional information about your items.
- Powerful Search - Quickly find items in your inventory using the powerful search feature.
- Image Upload - Upload images of your items to make it easy to identify them.
- Document and Warranty Tracking - Keep track of important documents and warranties for your items.
- Purchase & Maintenance Tracking - Track purchase dates, prices, and maintenance schedules for your items.
- Responsive Design - Homebox is designed to work on any device, including desktops, tablets, and smartphones.

## Screenshots
![Login Screen](.github/screenshots/1.png)
![Dashboard](.github/screenshots/2.png)
![Item View](.github/screenshots/3.png)
![Create Item](.github/screenshots/9.png)
![Search](.github/screenshots/8.png)

You can also try the demo instances of Homebox:
- [Demo](https://demo.homebox.software)
- [Nightly](https://nightly.homebox.software)

## Quick Start

[Configuration & Docker Compose](https://homebox.software/en/quick-start/)

```bash
# If using the rootless or hardened image, ensure data
# folder has correct permissions
mkdir -p /path/to/data/folder
chown 65532:65532 -R /path/to/data/folder
docker run -d \
  --name homebox \
  --restart unless-stopped \
  --publish 3100:7745 \
  --env TZ=Europe/Bucharest \
  --volume /path/to/data/folder/:/data \
  ghcr.io/sysadminsmedia/homebox:latest
# ghcr.io/sysadminsmedia/homebox:latest-rootless
# ghcr.io/sysadminsmedia/homebox:latest-hardened
```

<!-- CONTRIBUTING -->

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

### To the upstream project

For general Homebox improvements, please contribute directly to [sysadminsmedia/homebox](https://github.com/sysadminsmedia/homebox). See their [contributing guide](https://homebox.software/en/contribute/).

### To this fork

For HBC-specific features and improvements:

1. Fork this repo.
2. Create your feature branch (`git checkout -b feature/my-feature`).
3. Commit your changes.
4. Push to the branch (`git push origin feature/my-feature`).
5. Open a Pull Request.

Please keep fork-specific changes minimal and well-scoped to avoid unnecessary merge conflicts with upstream.

## Help us Translate
We want to make sure that Homebox is available in as many languages as possible. If you are interested in helping us translate Homebox, please help us via our [Weblate instance](https://translate.sysadminsmedia.com/projects/homebox/).

[![Translation status](https://translate.sysadminsmedia.com/widget/homebox/multi-auto.svg)](https://translate.sysadminsmedia.com/engage/homebox/)

## Credits
- Original project by [@hay-kot](https://github.com/hay-kot)
- Maintained by [sysadminsmedia](https://github.com/sysadminsmedia/homebox)
- Logo by [@lakotelman](https://github.com/lakotelman)
- HBC integration by [@sheepster-9k](https://github.com/sheepster-9k)

### Contributors
<a href="https://github.com/sysadminsmedia/homebox/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=sysadminsmedia/homebox" />
</a>
