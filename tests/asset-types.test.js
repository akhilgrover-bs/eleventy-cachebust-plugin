"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { resolveExtensions } = require("../src/asset-types");

describe("resolveExtensions", () => {
  it('"all" includes js, css, and image extensions', () => {
    const exts = resolveExtensions("all");
    assert.ok(exts.has(".js"));
    assert.ok(exts.has(".css"));
    assert.ok(exts.has(".png"));
    assert.ok(exts.has(".woff2"));
  });

  it("named category js returns js extensions only", () => {
    const exts = resolveExtensions("js");
    assert.ok(exts.has(".js"));
    assert.ok(exts.has(".mjs"));
    assert.ok(!exts.has(".css"));
    assert.ok(!exts.has(".png"));
  });

  it("named category css returns css extensions only", () => {
    const exts = resolveExtensions("css");
    assert.ok(exts.has(".css"));
    assert.ok(!exts.has(".js"));
  });

  it("array of named categories merges extensions", () => {
    const exts = resolveExtensions(["js", "css"]);
    assert.ok(exts.has(".js"));
    assert.ok(exts.has(".css"));
    assert.ok(!exts.has(".png"));
  });

  it("explicit extension with dot is included", () => {
    const exts = resolveExtensions(".woff2");
    assert.ok(exts.has(".woff2"));
    assert.ok(!exts.has(".css"));
  });

  it("explicit extension without dot is normalised", () => {
    const exts = resolveExtensions("woff2");
    assert.ok(exts.has(".woff2"));
  });

  it("mixed array of category and extension", () => {
    const exts = resolveExtensions(["css", ".woff2"]);
    assert.ok(exts.has(".css"));
    assert.ok(exts.has(".woff2"));
    assert.ok(!exts.has(".js"));
  });

  it("images category includes common image extensions", () => {
    const exts = resolveExtensions("images");
    [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".ico"].forEach(
      (e) => assert.ok(exts.has(e), `expected ${e}`)
    );
  });
});
