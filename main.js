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

// Galeria del producto: foto grande, miniaturas, colores, tallas y zoom.
const galleryModal = document.querySelector('[data-gallery-modal]');
const galleryImage = document.querySelector('[data-gallery-image]');
const galleryStage = document.querySelector('[data-gallery-stage]');
const galleryKicker = document.querySelector('[data-gallery-kicker]');
const galleryTitle = document.querySelector('[data-gallery-title]');
const galleryCount = document.querySelector('[data-gallery-count]');
const galleryDots = document.querySelector('[data-gallery-dots]');
const galleryPrev = document.querySelector('[data-gallery-prev]');
const galleryNext = document.querySelector('[data-gallery-next]');
const galleryColorsBlock = document.querySelector('[data-gallery-colors-block]');
const galleryColors = document.querySelector('[data-gallery-colors]');
const galleryColorName = document.querySelector('[data-gallery-color-name]');
const gallerySizesBlock = document.querySelector('[data-gallery-sizes-block]');
const gallerySizes = document.querySelector('[data-gallery-sizes]');
const conMouse = window.matchMedia('(hover: hover) and (pointer: fine)');
const tarjetas = new WeakMap();
let galleryImages = [];
let galleryIndex = 0;
let galleryTitleBase = '';
let galleryOrigen = null;
let ultimoFoco = null;

const ETIQUETAS = {
    mujer: 'Mujer',
    hombre: 'Hombre',
    batas: 'Batas'
};

const leerColores = (carousel) => {
    try {
        return JSON.parse(carousel.dataset.colors || '[]')
            .filter((color) => color && Array.isArray(color.images) && color.images.length > 0);
    } catch (error) {
        return [];
    }
};

const leerImagenes = (carousel) => {
    try {
        return JSON.parse(carousel.dataset.images || '[]');
    } catch (error) {
        return [];
    }
};

const precargar = (src) => {
    if (src) {
        const imagen = new Image();
        imagen.decoding = 'async';
        imagen.src = src;
    }
};

const quitarZoom = () => {
    if (galleryStage) {
        galleryStage.classList.remove('is-zoomed');
    }

    if (galleryImage) {
        galleryImage.style.transformOrigin = '';
    }
};

const updateGallery = () => {
    if (!galleryModal || !galleryImage || galleryImages.length === 0) {
        return;
    }

    galleryIndex = (galleryIndex + galleryImages.length) % galleryImages.length;
    const image = galleryImages[galleryIndex];

    quitarZoom();

    if (galleryImage.getAttribute('src') !== image.src) {
        galleryImage.classList.add('is-loading');
        galleryImage.onload = () => galleryImage.classList.remove('is-loading');
        galleryImage.src = image.src;
    }

    galleryImage.alt = image.alt;

    if (galleryCount) {
        galleryCount.textContent = `${galleryIndex + 1} / ${galleryImages.length}`;
    }

    const variasFotos = galleryImages.length > 1;
    [galleryPrev, galleryNext, galleryCount].forEach((elemento) => {
        if (elemento) {
            elemento.hidden = !variasFotos;
        }
    });

    if (galleryDots) {
        Array.from(galleryDots.children).forEach((dot, index) => {
            const activo = index === galleryIndex;
            dot.classList.toggle('is-active', activo);
            dot.setAttribute('aria-current', activo ? 'true' : 'false');

            // Lleva la miniatura activa a la vista sin mover la pagina.
            if (activo) {
                galleryDots.scrollTo({
                    left: dot.offsetLeft - (galleryDots.clientWidth - dot.offsetWidth) / 2,
                    top: dot.offsetTop - (galleryDots.clientHeight - dot.offsetHeight) / 2,
                    behavior: 'smooth'
                });
            }
        });
    }

    precargar(galleryImages[(galleryIndex + 1) % galleryImages.length]?.src);
    precargar(galleryImages[(galleryIndex - 1 + galleryImages.length) % galleryImages.length]?.src);
};

const renderThumbs = () => {
    if (!galleryDots) {
        return;
    }

    galleryDots.innerHTML = '';
    galleryDots.hidden = galleryImages.length < 2;

    galleryImages.forEach((galleryImageItem, index) => {
        const thumb = document.createElement('button');
        const thumbImage = document.createElement('img');

        thumb.type = 'button';
        thumb.setAttribute('aria-label', `Ver foto ${index + 1} de ${galleryImages.length}`);
        thumbImage.src = galleryImageItem.src;
        thumbImage.alt = '';
        thumbImage.loading = 'lazy';
        thumbImage.decoding = 'async';

        thumb.appendChild(thumbImage);
        thumb.addEventListener('click', () => {
            galleryIndex = index;
            updateGallery();
        });
        galleryDots.appendChild(thumb);
    });
};

const selectGalleryColor = (colors, colorIndex, fotoInicial = 0) => {
    const color = colors[colorIndex];

    if (!color) {
        return;
    }

    galleryImages = color.images.map((src, index) => ({
        src,
        alt: `${galleryTitleBase} - ${color.name}, foto ${index + 1}`
    }));
    galleryIndex = fotoInicial;

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

    // La tarjeta del catalogo queda en el mismo color que se eligio aqui.
    tarjetas.get(galleryOrigen)?.ponerColor(colorIndex);

    renderThumbs();
    updateGallery();
};

const pintarTallas = (tallas) => {
    if (!gallerySizes || !gallerySizesBlock) {
        return;
    }

    const lista = (tallas || '').split(/[·,]/).map((talla) => talla.trim()).filter(Boolean);
    gallerySizes.innerHTML = '';
    lista.forEach((talla) => {
        const item = document.createElement('li');
        item.textContent = talla;
        gallerySizes.appendChild(item);
    });
    gallerySizesBlock.hidden = lista.length === 0;
};

const openGallery = (carousel, colorIndex = 0, startIndex = 0) => {
    if (!galleryModal || !galleryImage) {
        return;
    }

    const card = carousel.closest('.plp-card');
    const colors = leerColores(carousel);

    galleryOrigen = carousel;
    ultimoFoco = document.activeElement;
    galleryTitleBase = carousel.dataset.productTitle || '';

    if (galleryTitle) {
        galleryTitle.textContent = galleryTitleBase;
    }

    if (galleryKicker) {
        const categorias = (card?.dataset.categoria || '').split(' ').filter((cat) => ETIQUETAS[cat]);
        galleryKicker.textContent = card?.hasAttribute('data-campana')
            ? 'Colección SANTÉ 2026'
            : categorias.map((cat) => ETIQUETAS[cat]).join(' · ');
    }

    pintarTallas(carousel.dataset.tallas);

    if (galleryColorsBlock && galleryColors) {
        galleryColors.innerHTML = '';
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
        selectGalleryColor(colors, Math.min(colorIndex, colors.length - 1), startIndex);
    } else {
        galleryImages = leerImagenes(carousel).map((src, index) => ({
            src,
            alt: `${galleryTitleBase}, foto ${index + 1}`
        }));
        galleryIndex = startIndex;
        renderThumbs();
        updateGallery();
    }

    galleryModal.querySelector('.gallery-close')?.focus({ preventScroll: true });
};

const closeGallery = () => {
    if (!galleryModal || !galleryModal.classList.contains('is-open')) {
        return;
    }

    quitarZoom();
    galleryModal.classList.remove('is-open');
    galleryModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');

    if (ultimoFoco && typeof ultimoFoco.focus === 'function') {
        ultimoFoco.focus({ preventScroll: true });
    }
};

const moverGaleria = (paso) => {
    galleryIndex += paso;
    updateGallery();
};

if (galleryPrev && galleryNext) {
    galleryPrev.addEventListener('click', () => moverGaleria(-1));
    galleryNext.addEventListener('click', () => moverGaleria(1));
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
    } else if (event.key === 'ArrowLeft') {
        moverGaleria(-1);
    } else if (event.key === 'ArrowRight') {
        moverGaleria(1);
    } else if (event.key === 'Tab') {
        // El foco no se escapa de la galeria mientras esta abierta.
        const enfocables = Array.from(galleryModal.querySelectorAll('button, a[href]'))
            .filter((elemento) => !elemento.hidden && elemento.offsetParent !== null);
        const primero = enfocables[0];
        const ultimo = enfocables[enfocables.length - 1];

        if (event.shiftKey && document.activeElement === primero) {
            event.preventDefault();
            ultimo.focus();
        } else if (!event.shiftKey && document.activeElement === ultimo) {
            event.preventDefault();
            primero.focus();
        }
    }
});

// Zoom con el mouse: clic para acercar, mover para recorrer la prenda.
if (galleryStage && galleryImage) {
    galleryImage.addEventListener('click', (event) => {
        if (!conMouse.matches) {
            return;
        }

        const acercar = !galleryStage.classList.contains('is-zoomed');
        galleryStage.classList.toggle('is-zoomed', acercar);

        if (acercar) {
            const caja = galleryImage.getBoundingClientRect();
            galleryImage.style.transformOrigin = `${((event.clientX - caja.left) / caja.width) * 100}% ${((event.clientY - caja.top) / caja.height) * 100}%`;
        } else {
            galleryImage.style.transformOrigin = '';
        }
    });

    galleryImage.addEventListener('mousemove', (event) => {
        if (!galleryStage.classList.contains('is-zoomed')) {
            return;
        }

        const caja = galleryImage.getBoundingClientRect();
        galleryImage.style.transformOrigin = `${((event.clientX - caja.left) / caja.width) * 100}% ${((event.clientY - caja.top) / caja.height) * 100}%`;
    });

    galleryStage.addEventListener('mouseleave', quitarZoom);

    // En celular se desliza con el dedo para cambiar de foto.
    let toqueX = 0;
    let toqueY = 0;

    galleryStage.addEventListener('touchstart', (event) => {
        toqueX = event.touches[0].clientX;
        toqueY = event.touches[0].clientY;
    }, { passive: true });

    galleryStage.addEventListener('touchend', (event) => {
        const dx = event.changedTouches[0].clientX - toqueX;
        const dy = event.changedTouches[0].clientY - toqueY;

        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
            moverGaleria(dx < 0 ? 1 : -1);
        }
    }, { passive: true });
}

// Tarjetas del catalogo: circulos de color, segunda foto al pasar el mouse.
document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    const card = carousel.closest('.plp-card');
    const track = carousel.querySelector('.carousel-track');
    const principal = track?.querySelector('img');
    const swatches = card?.querySelector('[data-card-swatches]');
    const colores = leerColores(carousel);
    const titulo = carousel.dataset.productTitle || principal?.alt || '';
    let colorActual = 0;
    let segunda = null;

    const fotosActuales = () => (colores.length ? colores[colorActual].images : leerImagenes(carousel));

    // La segunda foto se descarga recien la primera vez que se pasa el mouse.
    const prepararSegunda = () => {
        const fotos = fotosActuales();

        if (!track || fotos.length < 2) {
            return;
        }

        if (!segunda) {
            segunda = document.createElement('img');
            segunda.className = 'plp-card-alt';
            segunda.alt = '';
            segunda.decoding = 'async';
            segunda.setAttribute('aria-hidden', 'true');
            track.appendChild(segunda);
        }

        if (segunda.getAttribute('src') !== fotos[1]) {
            segunda.src = fotos[1];
        }
    };

    const ponerColor = (indice) => {
        if (!colores[indice] || !principal) {
            return;
        }

        colorActual = indice;
        principal.src = colores[indice].images[0];
        principal.alt = `${titulo} - ${colores[indice].name}`;

        if (segunda) {
            prepararSegunda();
        }

        swatches?.querySelectorAll('.plp-swatch').forEach((swatch, i) => {
            swatch.setAttribute('aria-pressed', i === indice ? 'true' : 'false');
        });
    };

    tarjetas.set(carousel, { ponerColor });

    if (swatches && colores.length > 1) {
        colores.forEach((color, indice) => {
            const swatch = document.createElement('button');

            swatch.type = 'button';
            swatch.className = 'plp-swatch';
            swatch.style.setProperty('--swatch', color.hex || '#ccc');
            swatch.title = color.name;
            swatch.setAttribute('aria-label', `Ver en ${color.name}`);
            swatch.setAttribute('aria-pressed', indice === 0 ? 'true' : 'false');
            swatch.addEventListener('click', (event) => {
                event.stopPropagation();
                ponerColor(indice);
            });
            swatches.appendChild(swatch);
        });

        const cuenta = document.createElement('span');
        cuenta.className = 'plp-swatch-count';
        cuenta.textContent = `${colores.length} colores`;
        swatches.appendChild(cuenta);
    }

    if (card && conMouse.matches) {
        card.addEventListener('mouseenter', prepararSegunda);
    }

    const abrir = () => openGallery(carousel, colorActual, 0);

    carousel.setAttribute('role', 'button');
    carousel.setAttribute('tabindex', '0');
    carousel.setAttribute('aria-label', `Ver fotos de ${titulo}`);
    carousel.addEventListener('click', abrir);
    carousel.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            abrir();
        }
    });

    card?.querySelector('h2')?.addEventListener('click', abrir);
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
