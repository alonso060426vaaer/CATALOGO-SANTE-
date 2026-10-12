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

const header = document.querySelector('.header');
const toggleButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('.menu');
const esCelular = window.matchMedia('(max-width: 860px)');

const abrirMenu = (abrir) => {
    if (!header || !toggleButton) {
        return;
    }

    header.classList.toggle('is-menu-open', abrir);
    toggleButton.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    toggleButton.setAttribute('aria-label', abrir ? 'Cerrar menu' : 'Abrir menu');

    if (abrir) {
        header.classList.remove('is-hidden');
    }
};

const cerrarMenu = () => abrirMenu(false);

if (header && toggleButton && menu) {
    toggleButton.addEventListener('click', () => {
        abrirMenu(!header.classList.contains('is-menu-open'));
    });

    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', cerrarMenu));

    document.addEventListener('click', (event) => {
        if (header.classList.contains('is-menu-open') && !header.contains(event.target)) {
            cerrarMenu();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            cerrarMenu();
        }
    });

    esCelular.addEventListener('change', cerrarMenu);
}

// Encabezado: sombra al bajar; en celular se esconde al bajar y vuelve al subir.
if (header) {
    let ultimoY = window.scrollY;
    let pendiente = false;

    const actualizarEncabezado = () => {
        pendiente = false;
        const y = Math.max(window.scrollY, 0);
        const delta = y - ultimoY;
        // offsetTop no sirve: en un elemento sticky cambia mientras se baja.
        const franja = document.querySelector('.top-strip');
        const cercaDeArriba = y < (franja ? franja.offsetHeight : 0) + header.offsetHeight + 80;

        header.classList.toggle('is-scrolled', y > 8);

        if (!esCelular.matches || cercaDeArriba || header.classList.contains('is-menu-open') || document.body.classList.contains('modal-open')) {
            header.classList.remove('is-hidden');
        } else if (delta > 8) {
            header.classList.add('is-hidden');
        } else if (delta < -8) {
            header.classList.remove('is-hidden');
        }

        // Pequeños temblores del dedo no cuentan como cambio de direccion.
        if (Math.abs(delta) > 8 || cercaDeArriba) {
            ultimoY = y;
        }
    };

    window.addEventListener('scroll', () => {
        if (!pendiente) {
            pendiente = true;
            window.requestAnimationFrame(actualizarEncabezado);
        }
    }, { passive: true });

    actualizarEncabezado();
}

// Franja de avisos: en celular se muestra un aviso a la vez.
const avisos = document.querySelector('.top-strip-inner');

if (avisos && avisos.children.length > 1) {
    const items = Array.from(avisos.children);
    let avisoActual = 0;

    avisos.classList.add('rota');
    items[0].classList.add('is-active');

    window.setInterval(() => {
        if (!esCelular.matches || document.hidden) {
            return;
        }

        items[avisoActual].classList.remove('is-active');
        avisoActual = (avisoActual + 1) % items.length;
        items[avisoActual].classList.add('is-active');
    }, 4000);
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

// Catalogo: filtro por categoria (?cat=mujer|hombre|batas) y busqueda (?q=).
const plpGrid = document.querySelector('.plp-grid');

if (plpGrid) {
    const CATEGORIAS = {
        todo: 'Todos los modelos',
        mujer: 'Mujer',
        hombre: 'Hombre',
        batas: 'Batas'
    };
    const cards = Array.from(plpGrid.querySelectorAll('.plp-card'));
    const plpTitle = document.querySelector('[data-plp-title]');
    const plpCount = document.querySelector('[data-plp-count]');
    const plpEmpty = document.querySelector('[data-plp-empty]');
    const searchNote = document.querySelector('[data-plp-search-note]');
    const searchQuery = document.querySelector('[data-plp-query]');
    const searchForms = Array.from(document.querySelectorAll('[data-search]'));

    const normalizar = (texto) => texto
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();

    // Texto donde se busca: nombre, tallas, colores y categoria de cada modelo.
    cards.forEach((card) => {
        const carousel = card.querySelector('[data-carousel]');
        let colores = [];

        try {
            colores = JSON.parse(carousel?.dataset.colors || '[]').map((color) => color.name);
        } catch (error) {
            colores = [];
        }

        card.dataset.busqueda = normalizar(`${card.textContent} ${colores.join(' ')} ${card.dataset.categoria || ''}`);
    });

    const leerUrl = () => {
        const params = new URLSearchParams(window.location.search);
        const cat = params.get('cat');

        return {
            cat: CATEGORIAS[cat] ? cat : 'todo',
            q: (params.get('q') || '').trim()
        };
    };

    const aplicarFiltro = ({ cat, q }) => {
        const terminos = normalizar(q).split(/\s+/).filter(Boolean);
        let visibles = 0;
        let modelos = 0;

        cards.forEach((card) => {
            const categorias = (card.dataset.categoria || '').split(' ');
            const enCategoria = cat === 'todo' || categorias.includes(cat);
            const enBusqueda = terminos.every((termino) => card.dataset.busqueda.includes(termino));
            const mostrar = enCategoria && enBusqueda;

            card.hidden = !mostrar;

            if (mostrar) {
                visibles += 1;

                if (!card.hasAttribute('data-campana')) {
                    modelos += 1;
                }
            }
        });

        // Filtrado: cuadricula pareja; en "Todo" se queda el diseño por filas.
        plpGrid.classList.toggle('is-filtered', cat !== 'todo' || terminos.length > 0);

        if (plpTitle) {
            plpTitle.textContent = CATEGORIAS[cat];
        }

        if (plpCount) {
            plpCount.textContent = `${modelos} ${modelos === 1 ? 'modelo' : 'modelos'}`;
        }

        if (plpEmpty) {
            plpEmpty.hidden = visibles > 0;
        }

        if (searchNote && searchQuery) {
            searchNote.hidden = terminos.length === 0;
            searchQuery.textContent = `"${q}"`;
        }

        searchForms.forEach((form) => {
            const input = form.querySelector('input');

            if (input && document.activeElement !== input) {
                input.value = q;
            }
        });

        document.querySelectorAll('[data-cat]').forEach((link) => {
            const activo = link.dataset.cat === cat && terminos.length === 0;

            link.classList.toggle('is-active', activo);

            if (activo) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });

        document.title = cat === 'todo' ? 'SANTÉ | Productos' : `SANTÉ | ${CATEGORIAS[cat]}`;
    };

    const irA = (estado) => {
        const params = new URLSearchParams();

        if (estado.cat !== 'todo') {
            params.set('cat', estado.cat);
        }

        if (estado.q) {
            params.set('q', estado.q);
        }

        const query = params.toString();
        window.history.pushState(null, '', query ? `?${query}` : window.location.pathname);
        aplicarFiltro(estado);
        cerrarMenu();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Los enlaces de categoria de esta misma pagina filtran sin recargar.
    document.querySelectorAll('a[data-cat]').forEach((link) => {
        link.addEventListener('click', (event) => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) {
                return;
            }

            event.preventDefault();
            irA({ cat: link.dataset.cat, q: '' });
        });
    });

    searchForms.forEach((form) => {
        const input = form.querySelector('input');

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            irA({ cat: 'todo', q: input.value.trim() });
            input.blur();
        });
    });

    window.addEventListener('popstate', () => aplicarFiltro(leerUrl()));
    aplicarFiltro(leerUrl());
}
