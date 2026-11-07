document.addEventListener("DOMContentLoaded", () => {
    const slider = document.querySelector(".video-slider");
    if (!slider) return;

    const videos = Array.from(slider.querySelectorAll(".video-slider__video"));
    let activeVideo = null;
    let activeVideoBox = null;
    let prefersSound = false;
    let playbackRequest = 0;
    let isScrolling = false;

    // Keep media dormant until a slide is active or directly adjacent to it.
    // Muted inline playback is required for reliable autoplay on iPhone Safari.
    videos.forEach(video => {
        const source = video.dataset.src || video.getAttribute("src");
        if (source) video.dataset.src = source;
        video.removeAttribute("src");
        video.removeAttribute("autoplay");
        video.autoplay = false;
        video.defaultMuted = true;
        video.muted = true;
        video.playsInline = true;
        video.loop = true;
        video.preload = "none";

        video.addEventListener("error", () => {
            if (video !== activeVideo || !video.error) return;
            console.error("Video failed to load:", video.dataset.src, video.error);
            setNotice("Video unavailable");
            soundButton.disabled = true;
            fullscreenButton.disabled = true;
            retryButton.hidden = true;
        });
    });

    const controls = document.createElement("div");
    controls.className = "video-slider__media-controls";

    const soundButton = document.createElement("button");
    soundButton.type = "button";
    soundButton.className = "video-slider__media-button";
    soundButton.textContent = "Enable sound";
    soundButton.setAttribute("aria-label", "Enable sound");
    soundButton.setAttribute("aria-pressed", "false");

    // Keep the expand control subtle but large enough for a touch target.
    const fullscreenButton = document.createElement("button");
    fullscreenButton.type = "button";
    fullscreenButton.className = "video-slider__media-button video-slider__media-button--fullscreen";
    const expandIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/></svg>';
    const collapseIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5"/></svg>';

    const retryButton = document.createElement("button");
    retryButton.type = "button";
    retryButton.className = "video-slider__media-button";
    retryButton.textContent = "Play video";
    retryButton.hidden = true;

    const notice = document.createElement("span");
    notice.className = "video-slider__media-notice";
    notice.setAttribute("role", "status");
    notice.hidden = true;

    controls.append(soundButton, fullscreenButton, retryButton, notice);

    // Swiper handles swipes on the surrounding slide; button taps must remain clicks.
    controls.addEventListener("touchstart", event => event.stopPropagation(), { passive: true });
    controls.addEventListener("pointerdown", event => event.stopPropagation());
    controls.addEventListener("click", event => event.stopPropagation());

    function setNotice(message = "") {
        notice.textContent = message;
        notice.hidden = !message;
    }

    function updateSoundButton() {
        const hasSound = activeVideo && !activeVideo.muted;
        soundButton.textContent = hasSound ? "Mute" : "Enable sound";
        soundButton.setAttribute("aria-label", hasSound ? "Mute video" : "Enable video sound");
        soundButton.setAttribute("aria-pressed", String(Boolean(hasSound)));
    }

    function updateFullscreenButton() {
        const expanded = Boolean(
            activeVideoBox && (
                document.fullscreenElement === activeVideoBox ||
                document.webkitFullscreenElement === activeVideoBox
            )
        ) || Boolean(activeVideo?.webkitDisplayingFullscreen);
        const label = expanded ? "Exit fullscreen" : "Expand video to fullscreen";
        fullscreenButton.setAttribute("aria-label", label);
        fullscreenButton.setAttribute("title", label);
        fullscreenButton.setAttribute("aria-pressed", String(expanded));
        fullscreenButton.innerHTML = expanded ? collapseIcon : expandIcon;
    }

    function fullscreenError(video, error) {
        if (video !== activeVideo) return;
        console.error("Fullscreen failed:", video.dataset.src, error);
        setNotice("Fullscreen unavailable");
        updateFullscreenButton();
    }

    function toggleFullscreen() {
        const video = activeVideo;
        const box = activeVideoBox;
        if (!video || !box || video.error || !video.hasAttribute("src")) return;

        function invoke(action) {
            try {
                const result = action();
                if (result && typeof result.catch === "function") {
                    result.catch(error => fullscreenError(video, error));
                }
            } catch (error) {
                fullscreenError(video, error);
            }
        }

        if (document.fullscreenElement === box || document.webkitFullscreenElement === box) {
            if (typeof document.exitFullscreen === "function") {
                invoke(() => document.exitFullscreen());
            } else if (typeof document.webkitExitFullscreen === "function") {
                invoke(() => document.webkitExitFullscreen());
            }
            return;
        }

        if (video.webkitDisplayingFullscreen && typeof video.webkitExitFullscreen === "function") {
            invoke(() => video.webkitExitFullscreen());
            return;
        }

        // Standard fullscreen keeps our transparent controls inside the enlarged box.
        if (typeof box.requestFullscreen === "function" && document.fullscreenEnabled !== false) {
            invoke(() => box.requestFullscreen());
        } else if (typeof video.webkitEnterFullscreen === "function") {
            // iPhone Safari/Chrome: only the video may open in native fullscreen.
            // Call synchronously inside this button click (a user gesture).
            invoke(() => video.webkitEnterFullscreen());
        } else if (typeof box.webkitRequestFullscreen === "function") {
            invoke(() => box.webkitRequestFullscreen());
        } else {
            setNotice("Fullscreen is not supported in this browser");
        }
    }

    fullscreenButton.addEventListener("click", toggleFullscreen);
    document.addEventListener("fullscreenchange", updateFullscreenButton);
    document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
    videos.forEach(video => {
        video.addEventListener("webkitbeginfullscreen", updateFullscreenButton);
        video.addEventListener("webkitendfullscreen", updateFullscreenButton);
    });

    function prepareVideo(video, preload) {
        if (!video || !video.dataset.src) return false;
        video.preload = preload;
        if (!video.hasAttribute("src")) {
            video.setAttribute("src", video.dataset.src);
            video.load();
        }
        return true;
    }

    function unloadVideo(video) {
        video.pause();
        video.muted = true;
        if (video.hasAttribute("src")) {
            video.removeAttribute("src");
            video.preload = "none";
            video.load(); // Cancel pending downloads and release the media resource.
        }
    }

    function playVideo(video, request) {
        const attempt = video.play();
        if (!attempt || typeof attempt.catch !== "function") return;

        attempt.catch(error => {
            // Switching slides can legitimately interrupt a previous play() call.
            if (video !== activeVideo || request !== playbackRequest || error.name === "AbortError") return;

            // Preserve audio after opt-in where permitted (e.g. desktop), but
            // transparently fall back to muted autoplay on restrictive browsers.
            if (error.name === "NotAllowedError" && !video.muted) {
                video.muted = true;
                updateSoundButton();
                playVideo(video, request);
                return;
            }

            console.error("Video playback failed:", video.dataset.src, error.name, error.message);
            if (error.name === "NotAllowedError") {
                setNotice("Tap Play video to start");
                retryButton.hidden = false;
            } else {
                setNotice("Unable to play video");
            }
        });
    }

    function updateVideos(swiper) {
        const activeIndex = swiper.activeIndex;
        const slides = Array.from(swiper.slides);
        const activeSlide = slides[activeIndex];
        const nextVideo = activeSlide?.querySelector(".video-slider__video") || null;
        const request = ++playbackRequest;

        activeVideo = nextVideo;
        setNotice();
        retryButton.hidden = true;
        soundButton.disabled = false;
        fullscreenButton.disabled = false;

        // A new slide always begins muted. Audible playback requires a fresh tap.
        videos.forEach(video => {
            video.pause();
            video.muted = true;
        });

        slides.forEach((slide, index) => {
            const video = slide.querySelector(".video-slider__video");
            if (!video) return;
            const distance = Math.abs(index - activeIndex);
            if (distance === 0) {
                prepareVideo(video, "auto");
            } else if (distance === 1) {
                prepareVideo(video, "metadata");
            } else {
                unloadVideo(video);
            }
        });

        if (!nextVideo) return;
        const videoBox = activeSlide.querySelector(".video-slider__video-box");
        activeVideoBox = videoBox;
        if (videoBox) videoBox.appendChild(controls);
        fullscreenButton.disabled = !videoBox || !(
            typeof videoBox.requestFullscreen === "function" ||
            typeof videoBox.webkitRequestFullscreen === "function" ||
            typeof nextVideo.webkitEnterFullscreen === "function"
        );
        updateFullscreenButton();
        nextVideo.muted = !prefersSound;
        updateSoundButton();

        if (!nextVideo.dataset.src) {
            setNotice("Video unavailable");
            soundButton.disabled = true;
            fullscreenButton.disabled = true;
            return;
        }
        if (nextVideo.readyState >= 1) {
            try { nextVideo.currentTime = 0; } catch (error) {
                console.debug("Video could not seek yet:", error);
            }
        }
        playVideo(nextVideo, request);
    }

    soundButton.addEventListener("click", () => {
        if (!activeVideo) return;
        const enableSound = activeVideo.muted;
        prefersSound = enableSound;
        activeVideo.muted = !enableSound;
        updateSoundButton();

        // play() is called directly inside the click handler for iOS gesture policy.
        if (enableSound) {
            retryButton.hidden = true;
            setNotice();
            const video = activeVideo;
            const request = playbackRequest;
            const attempt = video.play();
            if (attempt && typeof attempt.catch === "function") {
                attempt.catch(error => {
                    if (video !== activeVideo || request !== playbackRequest) return;
                    console.error("Sound playback failed:", video.dataset.src, error.name, error.message);
                    video.muted = true;
                    prefersSound = false;
                    updateSoundButton();
                    retryButton.hidden = false;
                    setNotice("Tap Play video to start");
                });
            }
        }
    });

    retryButton.addEventListener("click", () => {
        if (!activeVideo) return;
        retryButton.hidden = true;
        setNotice();
        playVideo(activeVideo, playbackRequest);
    });

    const swiper = new Swiper(slider, {
        slidesPerView: "auto",
        centeredSlides: true,
        spaceBetween: 40,
        speed: 1000,
        allowTouchMove: true,
        on: {
            init() { updateVideos(this); },
            slideChange() { updateVideos(this); }
        },
        breakpoints: {
            575: { spaceBetween: 90 }
        }
    });

    slider.addEventListener("wheel", event => {
        if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
        event.preventDefault();
        if (isScrolling || Math.abs(event.deltaX) < 30) return;

        isScrolling = true;
        if (event.deltaX > 0) {
            swiper.activeIndex === swiper.slides.length - 1
                ? swiper.slideTo(0)
                : swiper.slideNext();
        } else {
            swiper.activeIndex === 0
                ? swiper.slideTo(swiper.slides.length - 1)
                : swiper.slidePrev();
        }
        setTimeout(() => { isScrolling = false; }, swiper.params.speed + 100);
    }, { passive: false });

    window.addEventListener("resize", () => swiper.update());
});
