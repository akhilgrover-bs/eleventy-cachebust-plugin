"use strict";

const path = require("path");
const { resolveExtensions } = require("./asset-types");
const { hashStrategy, buildTimeStrategy } = require("./strategies");

/**
 * Rewrite a single URL string by appending the cache-bust token.
 *
 * The token is appended as a query-string parameter so that the
 * path itself (and therefore CDN routing rules) are not disturbed.
 *
 * e.g.  /assets/app.js  →  /assets/app.js?v=a1b2c3d4
 *
 * @param {string}   url         Original URL value from the HTML attribute
 * @param {Set}      allowedExts Set of extensions that should be rewritten
 * @param {object}   options     Plugin options
 * @param {string}   outputDir   Eleventy output directory (absolute)
 * @returns {string}             Rewritten URL (or original if skipped)
 */
function rewriteUrl(url, allowedExts, options, outputDir) {
  // Skip empty, data URIs, anchors, and already-busted URLs
  if (!url || url.startsWith("data:") || url.startsWith("#")) return url;

  // Parse the URL to extract the pathname, ignoring existing query/hash
  let pathname;
  let isAbsoluteUrl = false;

  try {
    const parsed = new URL(url);
    // Absolute URL with a host — only process if cdnBase matches or if
    // processCdnUrls option is enabled
    if (!options.processCdnUrls) return url;
    pathname = parsed.pathname;
    isAbsoluteUrl = true;
  } catch {
    // Relative / root-relative URL
    pathname = url.split("?")[0].split("#")[0];
  }

  const ext = path.extname(pathname).toLowerCase();
  if (!allowedExts.has(ext)) return url;

  // Already has a cache-bust param — skip to avoid double-busting
  if (url.includes("?v=") || url.includes("&v=")) return url;

  let token;

  if (options.strategy === "hash") {
    // Resolve the file path relative to the output directory
    const filePath = path.join(outputDir, pathname);
    token = hashStrategy(filePath, options.hashAlgorithm);
  } else {
    token = buildTimeStrategy();
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${token}`;
}

/**
 * Walk all `src` and `href` attributes in an HTML string and rewrite
 * matching ones.  Uses a regex approach so the transform has no
 * dependency on an HTML parser — keeping the plugin lightweight.
 *
 * Attributes handled:
 *   src, href, data-src, srcset (individual descriptors)
 *
 * @param {string} content    HTML string
 * @param {Set}    allowedExts
 * @param {object} options
 * @param {string} outputDir
 * @returns {string}
 */
function transformHtml(content, allowedExts, options, outputDir) {
  // src="..." and href="..."
  content = content.replace(
    /\b(src|href|data-src)=(["'])([^"']+)\2/gi,
    (match, attr, quote, url) => {
      const rewritten = rewriteUrl(url, allowedExts, options, outputDir);
      return `${attr}=${quote}${rewritten}${quote}`;
    }
  );

  // srcset="url [descriptor], url [descriptor]"
  content = content.replace(
    /\bsrcset=(["'])([^"']+)\1/gi,
    (match, quote, srcset) => {
      const rewritten = srcset
        .split(",")
        .map((entry) => {
          const parts = entry.trim().split(/\s+/);
          parts[0] = rewriteUrl(parts[0], allowedExts, options, outputDir);
          return parts.join(" ");
        })
        .join(", ");
      return `srcset=${quote}${rewritten}${quote}`;
    }
  );

  return content;
}

module.exports = { rewriteUrl, transformHtml };
