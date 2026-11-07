// Run: node tests/video-fullscreen.smoke.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class Element {
    constructor() {
        this.dataset = {};
        this.attributes = {};
        this.listeners = {};
        this.children = [];
        this.hidden = false;
        this.disabled = false;
        this.textContent = "";
        this.innerHTML = "";
        this.muted = true;
        this.readyState = 1;
        this.plays = 0;
    }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    getAttribute(key) { return this.attributes[key] ?? null; }
    hasAttribute(key) { return Object.hasOwn(this.attributes, key); }
    removeAttribute(key) { delete this.attributes[key]; }
    addEventListener(event, handler) { (this.listeners[event] ??= []).push(handler); }
    dispatch(event) { for (const handler of this.listeners[event] ?? []) handler({ stopPropagation() {} }); }
    append(...elements) { elements.forEach(element => this.appendChild(element)); }
    appendChild(element) { this.children.push(element); return element; }
    click() { this.dispatch("click"); }
    pause() {}
    load() {}
    play() { this.plays++; return Promise.resolve(); }
}

const slides = Array.from({ length: 4 }, (_, index) => {
    const video = new Element();
    video.dataset.src = `./video/${index + 1}.mp4`;
    const box = new Element();
    return {
        video, box,
        querySelector(selector) {
            return selector === ".video-slider__video" ? video :
                selector === ".video-slider__video-box" ? box : null;
        }
    };
});
const slider = new Element();
slider.querySelectorAll = () => slides.map(slide => slide.video);

const document = {
    listeners: {},
    fullscreenEnabled: true,
    fullscreenElement: null,
    addEventListener(event, handler) { (this.listeners[event] ??= []).push(handler); },
    dispatch(event) { for (const handler of this.listeners[event] ?? []) handler(); },
    querySelector() { return slider; },
    createElement() { return new Element(); },
    exitFullscreen() {
        this.fullscreenElement = null;
        this.dispatch("fullscreenchange");
        return Promise.resolve();
    }
};
for (const slide of slides) {
    slide.box.requestFullscreen = () => {
        document.fullscreenElement = slide.box;
        document.dispatch("fullscreenchange");
        return Promise.resolve();
    };
}

class Swiper {
    constructor(element, options) {
        this.slides = slides;
        this.activeIndex = 0;
        this.params = options;
        this.options = options;
        Swiper.instance = this;
        options.on.init.call(this);
    }
    slideTo(index) {
        this.activeIndex = index;
        this.options.on.slideChange.call(this);
    }
    update() {}
}

const errors = [];
const script = fs.readFileSync(path.join(__dirname, "..", "js", "script.js"), "utf8");
vm.runInNewContext(script, {
    document, Swiper, window: { addEventListener() {} }, setTimeout() {},
    console: { error: (...args) => errors.push(args), debug() {} }
});
document.dispatch("DOMContentLoaded");

const controls = slides[0].box.children[0];
assert.ok(controls, "The first slide has media controls");
const [sound, fullscreen] = controls.children;
assert.ok(sound, "Existing sound button stays in place");
assert.equal(fullscreen.getAttribute("aria-label"), "Expand video to fullscreen");
assert.equal(fullscreen.disabled, false);
fullscreen.click();
assert.equal(document.fullscreenElement, slides[0].box);
assert.equal(fullscreen.getAttribute("aria-label"), "Exit fullscreen");
fullscreen.click();
assert.equal(document.fullscreenElement, null);
assert.equal(fullscreen.getAttribute("aria-label"), "Expand video to fullscreen");

// iPhone native video fullscreen (standard element fullscreen unavailable).
Swiper.instance.slideTo(1);
document.fullscreenEnabled = false;
let nativeEnters = 0;
let nativeExits = 0;
slides[1].video.webkitEnterFullscreen = () => {
    nativeEnters++;
    slides[1].video.webkitDisplayingFullscreen = true;
    slides[1].video.dispatch("webkitbeginfullscreen");
};
slides[1].video.webkitExitFullscreen = () => {
    nativeExits++;
    slides[1].video.webkitDisplayingFullscreen = false;
    slides[1].video.dispatch("webkitendfullscreen");
};
fullscreen.click();
assert.equal(nativeEnters, 1);
assert.equal(fullscreen.getAttribute("aria-label"), "Exit fullscreen");
fullscreen.click();
assert.equal(nativeExits, 1);
assert.equal(fullscreen.getAttribute("aria-label"), "Expand video to fullscreen");

// Regression: sliding does not suppress existing muted playback.
Swiper.instance.slideTo(2);
assert.equal(slides[2].video.plays, 1);
assert.equal(slides[2].video.muted, true);
assert.equal(fullscreen.disabled, false);
assert.equal(errors.length, 0);
console.log("PASS: transparent control, standard fullscreen, iPhone native fullscreen, exit, and slide playback");
