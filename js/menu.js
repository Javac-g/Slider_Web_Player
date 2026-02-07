document.addEventListener("DOMContentLoaded", () => {
    const menu = document.createElement("aside");

    menu.setAttribute("id", "contact-menu");
    menu.setAttribute("aria-label", "Bato Web Agency - Contact Us");
    menu.classList.add("contact-menu");

    menu.innerHTML = `
        <input type="checkbox" id="contact-menu-trigger">

        <label tabindex="0" role="button" for="contact-menu-trigger" class="contact-menu__toggle">
            <div class="contact-menu__trigger">
                <img src="./img/contact.svg" alt="contact.svg">
                <img src="./img/close.svg" alt="close.svg">
            </div>

            <div class="contact-menu__label">Contact Us</div>
        </label>

        <ul class="contact-menu__list">
            <li>
                <a href="https://www.tiktok.com/@wkifwa?lang=en" target="_blank" title="tiktok" class="contact-menu__link">
                    <img src="./img/img.png" alt="Bato Web Agency - Website">
                </a>
            </li>
            
        </ul>
    `;

    document.body.appendChild(menu);
});
