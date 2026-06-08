# eleventy-cachebust-plugin

An [Eleventy](https://www.11ty.dev/) plugin that automatically appends cache-busting tokens to asset URLs in your HTML output — keeping your CDN fresh after every deploy without manual version strings.

## Features

- **Two strategies** — content hash (per-file fingerprint) or build timestamp (global token)
- **Selective asset control** — target named categories (`js`, `css`, `images`, `fonts`, `video`, `audio`), explicit file extensions, or all assets at once
- **Zero-config HTML transform** — rewrites `src`, `href`, `data-src`, and `srcset` attributes automatically on every HTML output file
- **Template filter & shortcode** — opt-in per-URL rewriting from Nunjucks, Liquid, or JS templates
- **CDN-friendly** — appends `?v=<token>` as a query parameter so CDN routing paths stay intact
- **Graceful fallback** — if a file can't be read (e.g. external CDN assets), falls back to the build-time token automatically

---

## Installation

```bash
npm install eleventy-cachebust-plugin --save-dev
```

---

## Quick Start

```js
// .eleventy.js
const cacheBustPlugin = require("eleventy-cachebust-plugin");

module.exports = (eleventyConfig) => {
  eleventyConfig.addPlugin(cacheBustPlugin);
};
```

That's it. Every `.html` file in your output will have its asset URLs rewritten automatically.

---

## Configuration

Pass an options object as the second argument to `addPlugin`:

```js
eleventyConfig.addPlugin(cacheBustPlugin, {
  strategy:       "hash",       // "hash" | "buildtime"  (default: "hash")
  hashAlgorithm:  "md5",        // "md5" | "sha1" | "sha256"  (default: "md5")
  assets:         "all",        // see Asset Types below  (default: "all")
  processCdnUrls: false,        // rewrite absolute https:// URLs too  (default: false)
  enabled:        true,         // set false to disable entirely  (default: true)
  templateFormats: ["html"],    // output formats that get the transform  (default: ["html"])
});
```

### Options reference

| Option | Type | Default | Description |
|---|---|---|---|
| `strategy` | `"hash"` \| `"buildtime"` | `"hash"` | Cache-busting strategy (see below) |
| `hashAlgorithm` | `"md5"` \| `"sha1"` \| `"sha256"` | `"md5"` | Hash algorithm when `strategy` is `"hash"` |
| `assets` | `string` \| `string[]` | `"all"` | Which asset types to process (see Asset Types) |
| `processCdnUrls` | `boolean` | `false` | When `true`, absolute URLs like `https://cdn.example.com/app.js` are also rewritten |
| `enabled` | `boolean` | `true` | Master switch — set `false` to disable entirely (useful in dev mode) |
| `templateFormats` | `string[]` | `["html"]` | Eleventy output formats that receive the HTML transform |

---

## Strategies

### `"hash"` (recommended for production)

Computes an 8-character hex fingerprint from each file's contents using the chosen `hashAlgorithm`. Only files that actually changed between builds will get a new cache-bust token — unchanged files keep the same URL, preserving cached copies on the CDN.

```
/assets/app.js   →   /assets/app.js?v=a1b2c3d4
/assets/style.css  →  /assets/style.css?v=9f3e21ab
```

### `"buildtime"`

Generates a single unix timestamp once at build start and applies it to every matching asset. Simpler to reason about, but invalidates **all** asset caches on every deploy regardless of whether anything changed.

```
/assets/app.js   →   /assets/app.js?v=1749394800
/assets/style.css  →  /assets/style.css?v=1749394800
```

---

## Asset Types

The `assets` option controls which file extensions are processed. It accepts:

| Value | What it matches |
|---|---|
| `"all"` | Every known asset type (default) |
| `"js"` | `.js`, `.mjs`, `.cjs` |
| `"css"` | `.css` |
| `"images"` | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.svg`, `.ico` |
| `"fonts"` | `.woff`, `.woff2`, `.ttf`, `.otf`, `.eot` |
| `"video"` | `.mp4`, `.webm`, `.ogg`, `.mov` |
| `"audio"` | `.mp3`, `.wav`, `.flac`, `.aac`, `.ogg` |
| `".woff2"` | Any explicit extension (with or without leading dot) |
| `["js", "css"]` | Array — any mix of named categories and explicit extensions |

### Examples

```js
// Only JS and CSS
assets: ["js", "css"]

// JS, CSS, and a specific custom extension
assets: ["js", "css", ".woff2"]

// Just one explicit extension
assets: ".svg"

// Everything (default)
assets: "all"
```

---

## Usage

### 1. Automatic HTML transform (zero template changes)

The plugin registers an Eleventy transform that post-processes every HTML output file. `src`, `href`, `data-src`, and `srcset` attributes are rewritten automatically.

**Input HTML:**
```html
<link rel="stylesheet" href="/assets/style.css">
<script src="/assets/app.js"></script>
<img src="/images/logo.png" alt="Logo">
<img srcset="/img/hero-sm.png 480w, /img/hero-lg.png 1080w">
```

**Output HTML (hash strategy):**
```html
<link rel="stylesheet" href="/assets/style.css?v=9f3e21ab">
<script src="/assets/app.js?v=a1b2c3d4"></script>
<img src="/images/logo.png?v=fc820011" alt="Logo">
<img srcset="/img/hero-sm.png?v=3d91bc02 480w, /img/hero-lg.png?v=8ae44f61 1080w">
```

URLs that are already cache-busted (`?v=`), are data URIs, or are anchor-only (`#section`) are left untouched.

### 2. Template filter

Use the `cachebust` filter directly in your templates when you need explicit control:

**Nunjucks:**
```njk
<script src="{{ "/assets/app.js" | cachebust }}"></script>
```

**Liquid:**
```liquid
<link rel="stylesheet" href="{{ "/assets/style.css" | cachebust }}">
```

### 3. Universal shortcode

Available in Nunjucks, Liquid, and JS templates:

**Nunjucks / Liquid:**
```njk
<img src="{% cachebustUrl "/images/hero.png" %}">
```

---

## Recommended Setup

### Disable in development, enable in production

```js
// .eleventy.js
const cacheBustPlugin = require("eleventy-cachebust-plugin");

module.exports = (eleventyConfig) => {
  eleventyConfig.addPlugin(cacheBustPlugin, {
    enabled: process.env.NODE_ENV === "production",
    strategy: "hash",
    assets: ["js", "css", "images", "fonts"],
  });
};
```

### Use `"buildtime"` for CI/CD speed

If your build is large and file I/O is a bottleneck, `"buildtime"` skips per-file reads entirely:

```js
eleventyConfig.addPlugin(cacheBustPlugin, {
  strategy: "buildtime",
  assets: ["js", "css"],
});
```

### Rewrite absolute CDN URLs

If you self-host assets on a CDN with a consistent base URL and want those rewritten too:

```js
eleventyConfig.addPlugin(cacheBustPlugin, {
  processCdnUrls: true,
  strategy: "hash",   // Falls back to buildtime if the file isn't local
});
```

---

## Using strategies directly

The strategy functions are exported if you need them outside the plugin context:

```js
const { strategies, resolveExtensions } = require("eleventy-cachebust-plugin");

const token = strategies.hashStrategy("/path/to/file.js", "sha256");
const buildToken = strategies.buildTimeStrategy();

const exts = resolveExtensions(["js", "css"]);
// => Set { '.js', '.mjs', '.cjs', '.css' }
```

---

## Requirements

- Node.js 18+
- Eleventy 2.x or 3.x

---

## License

MIT
