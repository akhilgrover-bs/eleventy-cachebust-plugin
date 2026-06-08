import path from "node:path";
import { resolveExtensions } from "./asset-types.mjs";
import { hashStrategy, buildTimeStrategy } from "./strategies.mjs";
import { rewriteUrl, transformHtml } from "./transform.mjs";

/**
 * @typedef {object} CacheBustOptions
 * @property {"hash"|"buildtime"}    [strategy="hash"]
 * @property {"md5"|"sha1"|"sha256"} [hashAlgorithm="md5"]
 * @property {string|string[]}       [assets="all"]
 * @property {boolean}               [processCdnUrls=false]
 * @property {boolean}               [enabled=true]
 * @property {string[]}              [templateFormats=["html"]]
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
 * Eleventy cache-busting plugin (ESM).
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {CacheBustOptions} userOptions
 */
export function cacheBustPlugin(eleventyConfig, userOptions = {}) {
  const options = { ...DEFAULTS, ...userOptions };

  if (!options.enabled) return;

  const allowedExts = resolveExtensions(options.assets);

  const getOutputDir = () => {
    const dir = eleventyConfig.dir?.output ?? "_site";
    return path.resolve(process.cwd(), dir);
  };

  // ── HTML transform ──────────────────────────────────────────────────────
  for (const format of options.templateFormats) {
    eleventyConfig.addTransform(
      `cachebust-${format}`,
      function (content, outputPath) {
        if (!outputPath || !outputPath.endsWith(".html")) return content;
        return transformHtml(content, allowedExts, options, getOutputDir());
      }
    );
  }

  // ── Filter ──────────────────────────────────────────────────────────────
  eleventyConfig.addFilter("cachebust", function (url) {
    if (!url) return url;
    const ext = path.extname(url.split("?")[0]).toLowerCase();
    if (!allowedExts.has(ext)) return url;

    const token =
      options.strategy === "hash"
        ? hashStrategy(path.join(getOutputDir(), url.split("?")[0]), options.hashAlgorithm)
        : buildTimeStrategy();

    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${token}`;
  });

  // ── Shortcode ───────────────────────────────────────────────────────────
  eleventyConfig.addShortcode("cachebustUrl", function (url) {
    if (!url) return url;
    const ext = path.extname(url.split("?")[0]).toLowerCase();
    if (!allowedExts.has(ext)) return url;

    const token =
      options.strategy === "hash"
        ? hashStrategy(path.join(getOutputDir(), url.split("?")[0]), options.hashAlgorithm)
        : buildTimeStrategy();

    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${token}`;
  });
}

export default cacheBustPlugin;

// Named exports for direct use
export { hashStrategy, buildTimeStrategy } from "./strategies.mjs";
export { resolveExtensions } from "./asset-types.mjs";
