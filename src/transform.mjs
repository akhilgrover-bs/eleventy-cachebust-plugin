import path from "node:path";
import { resolveExtensions } from "./asset-types.mjs";
import { hashStrategy, buildTimeStrategy } from "./strategies.mjs";

/**
 * Rewrite a single URL string by appending the cache-bust token.
 *
 * @param {string}   url         Original URL value from the HTML attribute
 * @param {Set}      allowedExts Set of extensions that should be rewritten
 * @param {object}   options     Plugin options
 * @param {string}   outputDir   Eleventy output directory (absolute)
 * @returns {string}             Rewritten URL (or original if skipped)
 */
export function rewriteUrl(url, allowedExts, options, outputDir) {
  if (!url || url.startsWith("data:") || url.startsWith("#")) return url;

  let pathname;

  try {
    const parsed = new URL(url);
    if (!options.processCdnUrls) return url;
    pathname = parsed.pathname;
  } catch {
    pathname = url.split("?")[0].split("#")[0];
  }

  const ext = path.extname(pathname).toLowerCase();
  if (!allowedExts.has(ext)) return url;

  if (url.includes("?v=") || url.includes("&v=")) return url;

  let token;

  if (options.strategy === "hash") {
    const filePath = path.join(outputDir, pathname);
    token = hashStrategy(filePath, options.hashAlgorithm);
  } else {
    token = buildTimeStrategy();
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${token}`;
}

/**
 * Walk all `src`, `href`, `data-src`, and `srcset` attributes in an HTML
 * string and rewrite matching ones.
 *
 * @param {string} content    HTML string
 * @param {Set}    allowedExts
 * @param {object} options
 * @param {string} outputDir
 * @returns {string}
 */
export function transformHtml(content, allowedExts, options, outputDir) {
  content = content.replace(
    /\b(src|href|data-src)=(["'])([^"']+)\2/gi,
    (match, attr, quote, url) => {
      const rewritten = rewriteUrl(url, allowedExts, options, outputDir);
      return `${attr}=${quote}${rewritten}${quote}`;
    }
  );

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
