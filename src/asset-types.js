"use strict";

/**
 * Extension sets for every recognised asset category.
 * Users may reference these names in the `assets` option.
 */
const ASSET_EXTENSIONS = {
  js:     [".js", ".mjs", ".cjs"],
  css:    [".css"],
  images: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".ico"],
  fonts:  [".woff", ".woff2", ".ttf", ".otf", ".eot"],
  video:  [".mp4", ".webm", ".ogg", ".mov"],
  audio:  [".mp3", ".wav", ".flac", ".aac", ".ogg"],
};

/**
 * Build a Set of extensions that should be cache-busted from the
 * user-supplied `assets` option.
 *
 * @param {string|string[]} assets  "all" | category name(s) | extension(s)
 * @returns {Set<string>}
 */
function resolveExtensions(assets = "all") {
  if (assets === "all") {
    return new Set(Object.values(ASSET_EXTENSIONS).flat());
  }

  const list = Array.isArray(assets) ? assets : [assets];
  const exts = new Set();

  for (const item of list) {
    const lower = item.toLowerCase();
    if (ASSET_EXTENSIONS[lower]) {
      // Named category  e.g. "js", "css", "images"
      ASSET_EXTENSIONS[lower].forEach((e) => exts.add(e));
    } else {
      // Explicit extension  e.g. ".woff2" or "woff2"
      exts.add(lower.startsWith(".") ? lower : `.${lower}`);
    }
  }

  return exts;
}

module.exports = { ASSET_EXTENSIONS, resolveExtensions };
