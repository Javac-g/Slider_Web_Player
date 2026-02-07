document.addEventListener("DOMContentLoaded", () => {
	const slider = document.querySelector(".video-slider");
	if (!slider) return;

	let isScrolling = false;
	let soundUnlocked = false;

	/* ===============================
	   SOUND UNLOCK (browser-safe)
	================================ */

	function unlockSound() {
		if (soundUnlocked) return;

		document.querySelectorAll(".video-slider__video").forEach(video => {
			video.muted = false;
		});

		soundUnlocked = true;

		document.removeEventListener("click", unlockSound);
		document.removeEventListener("touchstart", unlockSound);
		document.removeEventListener("keydown", unlockSound);
	}

	document.addEventListener("click", unlockSound);
	document.addEventListener("touchstart", unlockSound);
	document.addEventListener("keydown", unlockSound);

	/* ===============================
	   SWIPER INIT
	================================ */

	const swiper = new Swiper(slider, {
		slidesPerView: "auto",
		centeredSlides: true,
		spaceBetween: 40,
		speed: 1000,
		allowTouchMove: true,
		on: {
			init() {
				updateVideos(this);
			},
			slideChange() {
				updateVideos(this);
			}
		},
		breakpoints: {
			575: {
				spaceBetween: 90
			}
		}
	});

	/* ===============================
	   VIDEO CONTROL
	================================ */

	function updateVideos(swiper) {
		swiper.slides.forEach((slide, index) => {
			const video = slide.querySelector("video");
			if (!video) return;

			const isActive = index === swiper.activeIndex;
			const isReady = video.readyState >= 3;

			if (isActive) {
				const playVideo = () => {
					video.muted = !soundUnlocked;
					video.currentTime = 0;
					video.play().catch(() => {});

					video.onended = () => {
						video.currentTime = 0;
						video.play().catch(() => {});
					};
				};

				if (isReady) {
					setTimeout(playVideo, 250);
				} else {
					video.addEventListener(
						"canplay",
						function handler() {
							video.removeEventListener("canplay", handler);
							setTimeout(playVideo, 250);
						},
						{ once: true }
					);
				}
			} else {
				video.pause();
			}
		});
	}

	/* ===============================
	   HORIZONTAL WHEEL NAVIGATION
	================================ */

	slider.addEventListener(
		"wheel",
		(event) => {
			const isHorizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
			if (!isHorizontal) return;

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

			setTimeout(() => {
				isScrolling = false;
			}, swiper.params.speed + 100);
		},
		{ passive: false }
	);

	/* ===============================
	   RESIZE FIX
	================================ */

	window.addEventListener("resize", () => {
		swiper.update();
	});
});
