(() => {
    'use strict';

    const $ = (selector, scope = document) => scope.querySelector(selector);
    const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ------------------------------------------------------------------
       Mobile menu
       ------------------------------------------------------------------ */
    const menuBtn = $('#menu-btn');
    const mobileMenu = $('#mobile-menu');

    const setMenu = (open) => {
        menuBtn.setAttribute('aria-expanded', String(open));
        mobileMenu.classList.toggle('open', open);
        mobileMenu.inert = !open;
        document.body.classList.toggle('menu-open', open);
    };

    menuBtn.addEventListener('click', () => {
        setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });

    // إغلاق القائمة تلقائياً عند الضغط على أي رابط
    $$('#mobile-menu a').forEach((link) => link.addEventListener('click', () => setMenu(false)));

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setMenu(false);
    });

    window.matchMedia('(min-width: 960px)').addEventListener('change', (e) => {
        if (e.matches) setMenu(false);
    });

    /* ------------------------------------------------------------------
       Theme toggle (stored under the same "theme" key as before)
       ------------------------------------------------------------------ */
    const themeBtn = $('#theme-toggle');
    const themeMeta = $('meta[name="theme-color"]');

    const syncThemeUI = () => {
        const dark = root.classList.contains('dark');
        themeBtn.setAttribute('aria-pressed', String(dark));
        themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
        if (themeMeta) themeMeta.setAttribute('content', dark ? '#052A21' : '#FBFCFA');
    };

    const readStoredTheme = () => {
        try { return localStorage.getItem('theme'); } catch (e) { return null; }
    };

    const setTheme = (dark, persist) => {
        root.classList.add('theme-transition');
        root.classList.toggle('dark', dark);
        if (persist) {
            try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) { /* storage unavailable */ }
        }
        syncThemeUI();
        window.setTimeout(() => root.classList.remove('theme-transition'), 500);
    };

    themeBtn.addEventListener('click', () => {
        setTheme(!root.classList.contains('dark'), true);
        themeBtn.classList.remove('pop');
        void themeBtn.offsetWidth; // restart the animation
        themeBtn.classList.add('pop');
    });
    themeBtn.addEventListener('animationend', () => themeBtn.classList.remove('pop'), true);

    // Follow the OS setting until the visitor makes an explicit choice
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!readStoredTheme()) setTheme(e.matches, false);
    });

    syncThemeUI();

    /* ------------------------------------------------------------------
       Scroll: progress bar + header state
       ------------------------------------------------------------------ */
    const progress = $('#scroll-progress');
    const header = $('#site-header');
    let ticking = false;

    const cssProgress = window.CSS && CSS.supports('animation-timeline', 'scroll()');

    const onScroll = () => {
        const scrollTop = window.scrollY || root.scrollTop;
        const max = root.scrollHeight - root.clientHeight;
        if (!cssProgress) progress.style.width = (max > 0 ? (scrollTop / max) * 100 : 0) + '%';
        header.classList.toggle('is-scrolled', scrollTop > 8);
        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(onScroll);
        }
    }, { passive: true });
    onScroll();

    /* ------------------------------------------------------------------
       Active section in the navigation
       ------------------------------------------------------------------ */
    const navLinks = $$('.nav-links a');
    const sections = navLinks
        .map((a) => $(a.getAttribute('href')))
        .filter(Boolean);

    if ('IntersectionObserver' in window && sections.length) {
        const spy = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                navLinks.forEach((a) => {
                    const active = a.getAttribute('href') === '#' + entry.target.id;
                    a.classList.toggle('is-active', active);
                    if (active) a.setAttribute('aria-current', 'true');
                    else a.removeAttribute('aria-current');
                });
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        sections.forEach((s) => spy.observe(s));
    }

    /* ------------------------------------------------------------------
       Scroll reveal
       ------------------------------------------------------------------ */
    const startReveal = () => {
        const items = $$('.reveal');
        if (!('IntersectionObserver' in window) || reduceMotion) {
            items.forEach((el) => el.classList.add('is-visible'));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        items.forEach((el) => io.observe(el));
    };

    /* ------------------------------------------------------------------
       Stat counters
       ------------------------------------------------------------------ */
    const counters = $$('.counter');

    const runCounter = (el) => {
        const target = Number(el.getAttribute('data-target'));
        if (reduceMotion) {
            el.textContent = target;
            return;
        }
        const duration = 1400;
        const start = performance.now();
        const tick = (now) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 4);
            el.textContent = Math.round(target * eased);
            if (p < 1) window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
    };

    const statsEl = $('#stats');
    if (statsEl && 'IntersectionObserver' in window) {
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    counters.forEach(runCounter);
                    statsObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.4 });
        statsObserver.observe(statsEl);
    } else {
        counters.forEach((el) => { el.textContent = el.getAttribute('data-target'); });
    }

    /* ------------------------------------------------------------------
       Preloader exit
       ------------------------------------------------------------------ */
    const loader = $('#loading-screen');
    let loaderDone = false;

    const hideLoader = () => {
        if (loaderDone) return;
        loaderDone = true;
        if (loader) {
            loader.style.opacity = '0';
            window.setTimeout(() => { loader.style.visibility = 'hidden'; }, 500);
        }
        startReveal();
    };

    if (document.readyState === 'complete') hideLoader();
    else window.addEventListener('load', hideLoader);
    window.setTimeout(hideLoader, 4000); // safety net so the page can never stay covered


    /* ------------------------------------------------------------------
       Sparkles on the award caption (hover, and once when it scrolls in)
       ------------------------------------------------------------------ */
    const trophy = $('.trophy');
    if (trophy && !reduceMotion) {
        const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z"/></svg>';
        let last = 0;

        const burst = (count) => {
            for (let i = 0; i < count; i++) {
                const s = document.createElement('span');
                s.className = 'sparkle';
                s.innerHTML = STAR;
                const size = 8 + Math.random() * 10;
                s.style.width = s.style.height = size + 'px';
                s.style.left = (Math.random() * 110 - 5) + '%';
                s.style.top = (Math.random() * 140 - 20) + '%';
                s.style.animationDelay = (Math.random() * 250) + 'ms';
                s.addEventListener('animationend', () => s.remove());
                trophy.appendChild(s);
            }
        };

        trophy.addEventListener('pointerenter', () => {
            const now = performance.now();
            if (now - last < 700) return;
            last = now;
            burst(6);
        });

        if ('IntersectionObserver' in window) {
            const once = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    window.setTimeout(() => burst(8), 600);
                    once.disconnect();
                }
            }, { threshold: 0.9 });
            once.observe(trophy);
        }
    }

    /* ------------------------------------------------------------------
       Copy email to clipboard
       ------------------------------------------------------------------ */
    window.copyEmailToClipboard = function () {
        const textToCopy = $('#email-text').innerText.trim();
        const label = $('#copy-btn-label');

        const done = () => {
            label.innerText = 'Copied!';
            window.setTimeout(() => { label.innerText = 'Copy'; }, 2000);
        };

        const legacyCopy = () => {
            const field = document.createElement('textarea');
            field.value = textToCopy;
            field.setAttribute('readonly', '');
            field.style.cssText = 'position:fixed;opacity:0;inset-block-start:0;';
            document.body.appendChild(field);
            field.select();
            try { if (document.execCommand('copy')) done(); } catch (e) { /* ignore */ }
            field.remove();
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy).then(done).catch(legacyCopy);
        } else {
            legacyCopy();
        }
    };

    /* ------------------------------------------------------------------
       Lightbox (openLightbox was referenced in the markup but never defined)
       Usage: openLightbox('Title')  or  openLightbox('Title', 'images/certificate.png')
       ------------------------------------------------------------------ */
    const lightbox = $('#lightbox');
    const lightboxTitle = $('#lightbox-title');
    const lightboxMedia = $('#lightbox-media');

    window.openLightbox = function (title, imageSrc) {
        lightboxTitle.textContent = title;
        lightboxMedia.replaceChildren();

        if (imageSrc) {
            const img = document.createElement('img');
            img.src = imageSrc;
            img.alt = title;
            lightboxMedia.appendChild(img);
        } else {
            const NS = 'http://www.w3.org/2000/svg';
            const icon = document.createElementNS(NS, 'svg');
            icon.setAttribute('class', 'ico');
            icon.setAttribute('aria-hidden', 'true');
            const use = document.createElementNS(NS, 'use');
            use.setAttribute('href', '#i-image');
            icon.appendChild(use);
            lightboxMedia.appendChild(icon);
        }

        if (typeof lightbox.showModal === 'function') lightbox.showModal();
        else lightbox.setAttribute('open', '');
    };

    const closeLightbox = () => {
        if (typeof lightbox.close === 'function') lightbox.close();
        else lightbox.removeAttribute('open');
    };

    $('#lightbox-close').addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox(); // click on the backdrop
    });

    // Keyboard support for clickable cards (Enter / Space)
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const target = e.target;
        if (target instanceof HTMLElement && target.matches('[role="button"][tabindex]')) {
            e.preventDefault();
            target.click();
        }
    });
})();