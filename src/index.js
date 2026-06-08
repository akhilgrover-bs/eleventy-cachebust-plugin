"use strict";

const path = require("path");
const { resolveExtensions } = require("./asset-types");
const { hashStrategy, buildTimeStrategy } = require("./strategies");
const { rewriteUrl, transformHtml } = require("./transform");

/**
 * @typedef {object} CacheBustOptions
 *
 * @property {"hash"|"buildtime"}   [strategy="hash"]
 *   Cache-busting strategy.
 *   - "hash"      → fingerprint derived from each file's contents (MD5/SHA).
 *                   Each file gets a unique token; only changed files get new
 *                   cache entries after a deploy.
 *   - "buildtime" → single timestamp token shared by all assets.  Simpler;
 *                   invalidates everything on every build.
 *
 * @property {"md5"|"sha1"|"sha256"} [hashAlgorithm="md5"]
 *   Hashing algorithm used when strategy is "hash".
 *
 * @property {string|string[]} [assets="all"]
 *   Which asset types to cache-bust.  Accepts:
 *   - "all"                       → every known asset type
 *   - named category / categories → "js", "css", "images", "fonts",
 *                                    "video", "audio"
 *   - explicit extension(s)       → ".woff2", ".mp4"
 *   - mixed array                 → ["js", "css", ".woff2"]
 *
 * @property {boolean} [processCdnUrls=false]
 *   When true, absolute URLs (e.g. https://cdn.example.com/…) are also
 *   rewritten.  Disabled by default since most CDN URLs are already versioned.
 *
 * @property {boolean} [enabled=true]
 *   Set to false to disable the plugin entirely (useful in dev mode).
 *
 * @property {string[]} [templateFormats=["html"]]
 *   Eleventy template output formats that receive the HTML transform.
 */

const DEFAULTS = {
  strategy: "hash",
  hashAlgorithm: "md5",
  assets: "all",
  processCdnUrls: false,
  enabled: true,
  templateFormats: ["html"],
};

/**
 * Eleventy cache-busting plugin.
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {CacheBustOptions} userOptions
 */
function cacheBustPlugin(eleventyConfig, userOptions = {}) {
  const options = { ...DEFAULTS, ...userOptions };

  if (!options.enabled) return;

  const allowedExts = resolveExtensions(options.assets);

  // Resolve the Eleventy output directory.  We need an absolute path so
  // hash strategy can locate files on disk after Eleventy has written them.
  // eleventyConfig.dir.output is relative to the project root.
  const getOutputDir = () => {
    const dir = eleventyConfig.dir?.output ?? "_site";
    return path.resolve(process.cwd(), dir);
  };

  // ── HTML transform ───────────────────────────────────────────────────────
  // Runs as a post-processor on every HTML output file.

  for (const format of options.templateFormats) {
    eleventyConfig.addTransform(
      `cachebust-${format}`,
      function (content, outputPath) {
        if (!outputPath || !outputPath.endsWith(".html")) return content;
        const outputDir = getOutputDir();
        return transformHtml(content, allowedExts, options, outputDir);
      }
    );
  }

  // ── Nunjucks / Liquid / JS filter ────────────────────────────────────────
  // Usage in templates:
  //   Nunjucks: {{ "/assets/app.js" | cachebust }}
  //   Liquid:   {{ "/assets/app.js" | cachebust }}

  eleventyConfig.addFilter("cachebust", function (url) {
    if (!url) return url;
    const ext = path.extname(url.split("?")[0]).toLowerCase();
    if (!allowedExts.has(ext)) return url;

    let token;
    if (options.strategy === "hash") {
      const outputDir = getOutputDir();
      const filePath = path.join(outputDir, url.split("?")[0]);
      token = hashStrategy(filePath, options.hashAlgorithm);
    } else {
      token = buildTimeStrategy();
    }

    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${token}`;
  });

  // ── Universal shortcode ──────────────────────────────────────────────────
  // Usage:
  //   Nunjucks: {% cachebustUrl "/assets/app.js" %}
  //   Liquid:   {% cachebustUrl "/assets/app.js" %}

  eleventyConfig.addShortcode("cachebustUrl", function (url) {
    if (!url) return url;
    const ext = path.extname(url.split("?")[0]).toLowerCase();
    if (!allowedExts.has(ext)) return url;

    let token;
    if (options.strategy === "hash") {
      const outputDir = getOutputDir();
      const filePath = path.join(outputDir, url.split("?")[0]);
      token = hashStrategy(filePath, options.hashAlgorithm);
    } else {
      token = buildTimeStrategy();
    }

    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${token}`;
  });
}

module.exports = cacheBustPlugin;
module.exports.cacheBustPlugin = cacheBustPlugin;

// Named exports for consumers who want to use the strategies directly
module.exports.strategies = { hashStrategy, buildTimeStrategy };
module.exports.resolveExtensions = resolveExtensions;
