const revealElements = document.querySelectorAll('.reveal-up');

if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.18,
            rootMargin: '0px 0px -20px 0px'
        }
    );

    revealElements.forEach((element) => observer.observe(element));
} else {
    revealElements.forEach((element) => element.classList.add('visible'));
}

const toggleButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('.menu');

if (toggleButton && menu) {
    toggleButton.addEventListener('click', () => {
        menu.classList.toggle('open');
    });
}

const galleryModal = document.querySelector('[data-gallery-modal]');
const galleryImage = document.querySelector('[data-gallery-image]');
const galleryTitle = document.querySelector('[data-gallery-title]');
const galleryCount = document.querySelector('[data-gallery-count]');
const galleryDots = document.querySelector('[data-gallery-dots]');
const galleryPrev = document.querySelector('[data-gallery-prev]');
const galleryNext = document.querySelector('[data-gallery-next]');
const galleryColorsBlock = document.querySelector('[data-gallery-colors-block]');
const galleryColors = document.querySelector('[data-gallery-colors]');
const galleryColorName = document.querySelector('[data-gallery-color-name]');
let galleryImages = [];
let galleryIndex = 0;
let galleryTitleBase = '';

const updateGallery = () => {
    if (!galleryModal || !galleryImage || galleryImages.length === 0) {
        return;
    }

    galleryIndex = (galleryIndex + galleryImages.length) % galleryImages.length;
    const image = galleryImages[galleryIndex];

    galleryImage.src = image.src;
    galleryImage.alt = image.alt;

    if (galleryCount) {
        galleryCount.textContent = `${galleryIndex + 1} / ${galleryImages.length}`;
    }

    if (galleryDots) {
        Array.from(galleryDots.children).forEach((dot, index) => {
            dot.classList.toggle('is-active', index === galleryIndex);
        });
    }
};

const renderThumbs = () => {
    if (!galleryDots) {
        return;
    }

    galleryDots.innerHTML = '';
    galleryImages.forEach((galleryImageItem, index) => {
        const thumb = document.createElement('button');
        const thumbImage = document.createElement('img');

        thumb.type = 'button';
        thumb.setAttribute('aria-label', `Ver foto ${index + 1} de ${galleryImages.length}`);
        thumbImage.src = galleryImageItem.src;
        thumbImage.alt = galleryImageItem.alt;
        thumbImage.loading = 'lazy';

        thumb.appendChild(thumbImage);
        thumb.addEventListener('click', () => {
            galleryIndex = index;
            updateGallery();
        });
        galleryDots.appendChild(thumb);
    });
};

const selectGalleryColor = (colors, colorIndex) => {
    const color = colors[colorIndex];

    if (!color) {
        return;
    }

    galleryImages = color.images.map((src) => ({
        src,
        alt: `${galleryTitleBase} - ${color.name}`
    }));
    galleryIndex = 0;

    if (galleryColorName) {
        galleryColorName.textContent = color.name;
    }

    if (galleryColors) {
        Array.from(galleryColors.children).forEach((swatch, index) => {
            const isActive = index === colorIndex;
            swatch.classList.toggle('is-active', isActive);
            swatch.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    renderThumbs();
    updateGallery();
};

const openGallery = (carousel, startIndex) => {
    if (!galleryModal || !galleryImage) {
        return;
    }

    const fallbackImages = Array.from(carousel.querySelectorAll('.carousel-track img')).map((image) => ({
        src: image.currentSrc || image.src,
        alt: image.alt
    }));

    galleryTitleBase = carousel.dataset.productTitle || fallbackImages[0]?.alt || '';

    if (galleryTitle) {
        galleryTitle.textContent = galleryTitleBase;
    }

    let colors = [];

    try {
        colors = JSON.parse(carousel.dataset.colors || '[]');
    } catch (error) {
        colors = [];
    }

    colors = colors.filter((color) => color && Array.isArray(color.images) && color.images.length > 0);

    if (galleryColorsBlock && galleryColors) {
        galleryColors.innerHTML = '';
        // Con un solo color no hay nada que elegir: se oculta la paleta.
        galleryColorsBlock.hidden = colors.length < 2;

        colors.forEach((color, index) => {
            const swatch = document.createElement('button');

            swatch.type = 'button';
            swatch.className = 'gallery-color';
            swatch.style.setProperty('--swatch', color.hex || '#ccc');
            swatch.title = color.name;
            swatch.setAttribute('aria-label', color.name);
            swatch.setAttribute('aria-pressed', 'false');
            swatch.addEventListener('click', () => selectGalleryColor(colors, index));
            galleryColors.appendChild(swatch);
        });
    }

    galleryModal.classList.add('is-open');
    galleryModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    if (colors.length > 0) {
        selectGalleryColor(colors, 0);
        galleryIndex = startIndex;
        updateGallery();
        return;
    }

    try {
        const storedImages = JSON.parse(carousel.dataset.images || '[]');
        galleryImages = storedImages.map((src) => ({
            src,
            alt: galleryTitleBase
        }));
    } catch (error) {
        galleryImages = fallbackImages;
    }

    if (galleryImages.length === 0) {
        galleryImages = fallbackImages;
    }

    galleryIndex = startIndex;
    renderThumbs();
    updateGallery();
};

const closeGallery = () => {
    if (!galleryModal) {
        return;
    }

    galleryModal.classList.remove('is-open');
    galleryModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
};

if (galleryPrev && galleryNext) {
    galleryPrev.addEventListener('click', () => {
        galleryIndex -= 1;
        updateGallery();
    });

    galleryNext.addEventListener('click', () => {
        galleryIndex += 1;
        updateGallery();
    });
}

document.querySelectorAll('[data-gallery-close]').forEach((button) => {
    button.addEventListener('click', closeGallery);
});

document.addEventListener('keydown', (event) => {
    if (!galleryModal || !galleryModal.classList.contains('is-open')) {
        return;
    }

    if (event.key === 'Escape') {
        closeGallery();
    }

    if (event.key === 'ArrowLeft') {
        galleryIndex -= 1;
        updateGallery();
    }

    if (event.key === 'ArrowRight') {
        galleryIndex += 1;
        updateGallery();
    }
});

document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    const images = Array.from(carousel.querySelectorAll('.carousel-track img'));
    const dots = Array.from(carousel.querySelectorAll('.carousel-dots span'));
    const prev = carousel.querySelector('.carousel-prev');
    const next = carousel.querySelector('.carousel-next');
    let current = 0;

    const showImage = (index) => {
        current = (index + images.length) % images.length;

        images.forEach((image, imageIndex) => {
            image.classList.toggle('is-active', imageIndex === current);
        });

        dots.forEach((dot, dotIndex) => {
            dot.classList.toggle('is-active', dotIndex === current);
        });
    };

    if (prev && next && images.length > 1) {
        prev.addEventListener('click', (event) => {
            event.stopPropagation();
            showImage(current - 1);
        });

        next.addEventListener('click', (event) => {
            event.stopPropagation();
            showImage(current + 1);
        });
    }

    carousel.addEventListener('click', (event) => {
        if (event.target.closest('.carousel-btn')) {
            return;
        }

        openGallery(carousel, 0);
    });
});
