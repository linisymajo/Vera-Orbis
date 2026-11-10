const VO_LOGO = '/logo/Logo%20Vera%20Orbis%20recoloreado.png'

/**
 * Renderiza el Header y la Navegación Global de Vera Orbis.
 * @param {Object} options
 * @param {string} options.activePage - 'home' | 'who-we-are' | 'languages' | 'method' | 'experiences' | 'contact'
 */
export function renderSiteNav({ activePage = 'home' } = {}) {
  const isHome = activePage === 'home'
  const isWho = activePage === 'who-we-are'
  const isLang = activePage === 'languages'
  const isMethod = activePage === 'method'
  const isExp = activePage === 'experiences'
  const isContact = activePage === 'contact'

  return `
  <header class="navbar" id="site-navbar">

    <a href="/" class="logo" aria-label="Vera Orbis — We Speak the World">
      <img src="${VO_LOGO}" alt="Vera Orbis" class="navbar-logo-img" />
    </a>

    <!-- Enlaces de navegación de escritorio -->
    <nav class="nav-links" id="primary-nav" aria-label="Navegación principal">
      <a href="/" class="nav-link ${isHome ? 'is-active' : ''}" ${isHome ? 'aria-current="page"' : ''}>Inicio</a>
      <a href="/who-we-are" class="nav-link ${isWho ? 'is-active' : ''}" ${isWho ? 'aria-current="page"' : ''}>Quiénes somos</a>

      <!-- Selector / Menú de Idiomas -->
      <div class="nav-dropdown-wrap" id="languages-dropdown-wrap">
        <a
          href="/languages"
          class="nav-link nav-dropdown-btn ${isLang ? 'is-active' : ''}"
          id="languages-menu-btn"
          aria-haspopup="true"
          aria-expanded="false"
          aria-label="Ver programas de idiomas"
          ${isLang ? 'aria-current="page"' : ''}
        >
          <span>Idiomas</span>
          <span class="dropdown-arrow" aria-hidden="true">▾</span>
        </a>
        <div class="nav-dropdown-menu" id="languages-dropdown-menu" role="menu">
          <a href="#ingles" data-page="/languages#ingles" class="nav-dropdown-item" role="menuitem">
            <span class="item-lang-name">Inglés</span>
            <span class="item-lang-sub">Global Commerce &amp; Communication</span>
          </a>
          <a href="#frances" data-page="/languages#frances" class="nav-dropdown-item" role="menuitem">
            <span class="item-lang-name">Francés</span>
            <span class="item-lang-sub">Diplomatie, Culture &amp; Société</span>
          </a>
          <a href="#mandarin" data-page="/languages#mandarin" class="nav-dropdown-item" role="menuitem">
            <span class="item-lang-name">Mandarín</span>
            <span class="item-lang-sub">Comunicación, Cultura &amp; Negocios</span>
          </a>
        </div>
      </div>

      <a href="/method" class="nav-link ${isMethod ? 'is-active' : ''}" ${isMethod ? 'aria-current="page"' : ''}>Cómo enseñamos</a>
      <a href="/experiences" class="nav-link ${isExp ? 'is-active' : ''}" ${isExp ? 'aria-current="page"' : ''}>Experiencias</a>
      <a href="/contact" class="nav-link nav-link-b2b ${isContact ? 'is-active' : ''}" ${isContact ? 'aria-current="page"' : ''}>
        <span>Let's Connect</span>
        <span class="badge-b2b" aria-hidden="true">B2B</span>
      </a>
    </nav>

    <!-- Acciones de navegación -->
    <div class="nav-actions">
      <a href="/platform.html" class="platform-button" aria-label="Acceso a la plataforma de estudiantes">
        <span class="btn-text">Acceso Estudiantes</span>
        <span class="platform-btn-arrow" aria-hidden="true">→</span>
      </a>

      <button type="button" class="nav-cta-button" id="nav-cta-btn" aria-haspopup="dialog">
        <span>Agendar diagnóstico</span>
      </button>

      <!-- Botón menú móvil -->
      <button type="button" class="mobile-menu-toggle" id="mobile-menu-toggle" aria-label="Abrir menú de navegación" aria-expanded="false" aria-controls="mobile-nav-drawer">
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
      </button>
    </div>

  </header>

  <!-- Panel de navegación móvil -->
  <div class="mobile-nav-drawer" id="mobile-nav-drawer" hidden>
    <div class="mobile-nav-backdrop" id="mobile-nav-backdrop"></div>
    <div class="mobile-nav-panel">
      <div class="mobile-nav-header">
        <img src="${VO_LOGO}" alt="Vera Orbis" class="mobile-logo-img" />
        <button type="button" class="mobile-nav-close" id="mobile-nav-close" aria-label="Cerrar menú">&times;</button>
      </div>

      <!-- Selector de idiomas en móvil -->
      <div class="mobile-languages-box">
        <span class="mobile-languages-heading">Idiomas disponibles</span>
        <div class="mobile-languages-list">
          <a href="#ingles" data-page="/languages#ingles" class="mobile-lang-chip">Inglés</a>
          <a href="#frances" data-page="/languages#frances" class="mobile-lang-chip">Francés</a>
          <a href="#mandarin" data-page="/languages#mandarin" class="mobile-lang-chip">Mandarín</a>
        </div>
      </div>

      <nav class="mobile-nav-links" aria-label="Navegación móvil">
        <a href="/" class="mobile-nav-link ${isHome ? 'is-active' : ''}">Inicio</a>
        <a href="/who-we-are" class="mobile-nav-link ${isWho ? 'is-active' : ''}">Quiénes somos</a>
        <a href="/languages" class="mobile-nav-link ${isLang ? 'is-active' : ''}">Nuestros idiomas</a>
        <a href="/method" class="mobile-nav-link ${isMethod ? 'is-active' : ''}">Cómo enseñamos</a>
        <a href="/experiences" class="mobile-nav-link ${isExp ? 'is-active' : ''}">Experiencias &amp; Ecosistema</a>
        <a href="/contact" class="mobile-nav-link mobile-link-b2b ${isContact ? 'is-active' : ''}">
          <span>Let's Connect</span>
          <span class="badge-b2b">B2B</span>
        </a>
      </nav>

      <div class="mobile-nav-footer">
        <a href="/platform.html" class="mobile-portal-btn">
          <span>Acceso a Plataforma</span>
          <span aria-hidden="true">→</span>
        </a>
        <p class="mobile-motto">Learn It · Live It · Speak It.</p>
      </div>
    </div>
  </div>
  `
}

/**
 * Inicializa la lógica interactiva del menú de navegación global.
 */
export function initSiteNav() {
  // Elevación con scroll
  const navbar = document.querySelector('#site-navbar')
  if (navbar) {
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (window.scrollY > 25) {
            navbar.classList.add('navbar-scrolled')
          } else {
            navbar.classList.remove('navbar-scrolled')
          }
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  }

  // Menú móvil
  const toggleBtn = document.querySelector('#mobile-menu-toggle')
  const drawer = document.querySelector('#mobile-nav-drawer')
  const closeBtn = document.querySelector('#mobile-nav-close')
  const backdrop = document.querySelector('#mobile-nav-backdrop')
  const navLinks = document.querySelectorAll('.mobile-nav-link, .mobile-lang-chip')

  if (toggleBtn && drawer) {
    const openDrawer = () => {
      drawer.hidden = false
      toggleBtn.setAttribute('aria-expanded', 'true')
      document.body.classList.add('modal-open')
      setTimeout(() => {
        drawer.classList.add('is-open')
        closeBtn?.focus()
      }, 10)
    }

    const closeDrawer = () => {
      drawer.classList.remove('is-open')
      toggleBtn.setAttribute('aria-expanded', 'false')
      document.body.classList.remove('modal-open')
      setTimeout(() => {
        drawer.hidden = true
      }, 320)
      toggleBtn.focus()
    }

    toggleBtn.addEventListener('click', () => {
      if (drawer.hidden) {
        openDrawer()
      } else {
        closeDrawer()
      }
    })

    closeBtn?.addEventListener('click', closeDrawer)
    backdrop?.addEventListener('click', closeDrawer)

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        closeDrawer()
      })
    })

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !drawer.hidden) {
        closeDrawer()
      }
    })
  }

  // Dropdown idiomas escritorio
  const wrap = document.querySelector('#languages-dropdown-wrap')
  const menuBtn = document.querySelector('#languages-menu-btn')
  const menu = document.querySelector('#languages-dropdown-menu')

  if (wrap && menuBtn && menu) {
    menuBtn.addEventListener('mouseenter', () => {
      wrap.classList.add('is-open')
      menuBtn.setAttribute('aria-expanded', 'true')
    })

    wrap.addEventListener('mouseleave', () => {
      wrap.classList.remove('is-open')
      menuBtn.setAttribute('aria-expanded', 'false')
    })
  }

  // Redirección para enlaces con data-page
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
      const target = el.getAttribute('data-page')
      if (target && !window.location.pathname.startsWith('/languages')) {
        e.preventDefault()
        window.location.href = target
      }
    })
  })

  // Botón CTA de diagnóstico -> abre modal de orientación
  const ctaBtn = document.querySelector('#nav-cta-btn')
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      if (typeof window.__voOpenOrientationModal === 'function') {
        window.__voOpenOrientationModal()
      } else {
        window.location.href = '/contact#orientacion'
      }
    })
  }
}
