document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const preview = document.querySelector(".preview");

    if (preview) {
        if (!window.location.href.includes("fullcpgrid")) {
            preview.style.display = "none";

            document.documentElement.style.overflow = "";
            document.body.style.overflow = "";
        }
    }
});