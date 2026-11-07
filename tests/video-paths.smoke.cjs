// Run with: node tests/video-paths.smoke.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const mediaDir = path.join(root, "video");
const available = new Set(fs.readdirSync(mediaDir));
const videoTags = html.match(/<video\b[\s\S]*?>/gi) || [];
const sources = videoTags.map(tag => {
    const match = tag.match(/\bdata-src=["']([^"']+)["']/i);
    assert.ok(match, "Each video must have a data-src");
    assert.ok(match[1].startsWith("./video/"), "Unexpected media path: " + match[1]);
    return match[1].slice("./video/".length);
});

const newVideos = ["4085.mp4", "4086.mp4", "4087.mp4", "4088.mp4", "4090.mp4"];
for (const name of newVideos) {
    assert.ok(available.has(name), "Missing new video file: " + name);
    assert.ok(sources.includes(name), "Video not referenced by HTML: " + name);
    assert.ok(!available.has(name.replace(/\.mp4$/, ".MP4")), "Uppercase extension can break case-sensitive hosting: " + name);
}

// Legacy placeholders are known to be absent and intentionally kept in the archive.
const knownMissing = new Set(["n211225.mp4", "35.mp4", "38.mp4", "39.mp4"]);
const unexpectedMissing = [...new Set(sources.filter(name => !available.has(name) && !knownMissing.has(name)))];
assert.deepEqual(unexpectedMissing, [], "HTML references videos missing from the repository (case-sensitive check)");
console.log("PASS: new uploads match HTML references, and no unexpected video paths are missing.");
const legacy = [...new Set(sources.filter(name => !available.has(name) && knownMissing.has(name)))];
if (legacy.length) console.warn("Known legacy missing media (not part of this fix): " + legacy.join(", "));
