document.addEventListener("DOMContentLoaded", () => {
	const slider = document.querySelector(".video-slider");

	if (!slider) return;

	let isScrolling = false;

	// Slider Functionality

	const swiper = new Swiper(slider, {
		slidesPerView: "auto",
		centeredSlides: true,
		spaceBetween: 40,
		speed: 1000,
		allowTouchMove: true,
		on: {
			init: function () {
				updateVideos(this);
			},
			slideChange: function () {
				updateVideos(this);
			}
		},
		breakpoints: { 575: { spaceBetween: 90 } }
	});

	// Video Update

	function updateVideos(swiper) {
		const slides = swiper.slides;

		if (slides && slides.length) {
			slides.forEach((slide, index) => {
				const video = slide.querySelector("video");

				if (!video) return;

				const isReady = video.readyState >= 3;

				if (index === swiper.activeIndex) {
					const playVideo = () => {
						if (video.paused) video.play();

						video.onended = () => {
							video.currentTime = 0;
							video.play();
						};
					};

					if (isReady) {
						setTimeout(playVideo, 250);
					} else {
						video.addEventListener("canplay", function handler() {
							video.removeEventListener("canplay", handler);
							setTimeout(playVideo, 250);
						});
					}
				} else {
					if (!video.paused && isReady) {
						video.pause();
					}
				}
			});
		}
	}

	// Horizontal Scroll Functionality

	slider.addEventListener(
		"wheel",
		(event) => {
			const isHorizontalScroll = Math.abs(event.deltaX) > Math.abs(event.deltaY);

			if (!isHorizontalScroll) return;

			event.preventDefault();

			if (isScrolling || Math.abs(event.deltaX) < 30) return;

			isScrolling = true;

			if (event.deltaX > 0 && swiper) {
				if (swiper.activeIndex === swiper.slides.length - 1) {
					swiper.slideTo(0);
				} else {
					swiper.slideNext();
				}
			} else {
				if (swiper.activeIndex === 0) {
					swiper.slideTo(swiper.slides.length - 1);
				} else {
					swiper.slidePrev();
				}
			}

			setTimeout(() => (isScrolling = false), swiper.params.speed + 100);
		},
		{ passive: false }
	);

	window.addEventListener("resize", () => {
		if (swiper) swiper.update();
	});
});
