import './style.css'
import './home-redesign.css'
import { renderSiteFooter } from './components/siteFooter.js'
import { renderConversionModals, initConversionModals } from './components/conversionModals.js'

const VO_LOGO = '/logo/Logo%20Vera%20Orbis%20recoloreado.png'

document.querySelector('#app').innerHTML = `

  <!-- =========================================
       HEADER & NAVEGACIÓN GLOBAL
  ========================================== -->

  <header class="navbar" id="site-navbar">

    <a href="#inicio" class="logo" aria-label="Vera Orbis — We Speak the World">
      <img src="${VO_LOGO}" alt="Vera Orbis" class="navbar-logo-img" />
    </a>

    <nav class="nav-links" id="primary-nav" aria-label="Navegación principal">
      <a href="/" class="nav-link is-active" aria-current="page">Inicio</a>
      <a href="/who-we-are" class="nav-link">Quiénes somos</a>

      <div class="nav-dropdown-wrap" id="languages-dropdown-wrap">
        <a
          href="/languages"
          class="nav-link nav-dropdown-btn"
          id="languages-menu-btn"
          aria-haspopup="true"
          aria-expanded="false"
          aria-label="Ver idiomas disponibles"
        >
          <span>Idiomas</span>
          <span class="dropdown-arrow" aria-hidden="true">▾</span>
        </a>
        <div class="nav-dropdown-menu" id="languages-dropdown-menu" role="menu">
          <a href="#ingles" data-page="/languages#ingles" class="nav-dropdown-item" role="menuitem">
            <span class="item-lang-name">Inglés</span>
            <span class="item-lang-sub">EN — English</span>
          </a>
          <a href="#frances" data-page="/languages#frances" class="nav-dropdown-item" role="menuitem">
            <span class="item-lang-name">Francés</span>
            <span class="item-lang-sub">FR — Français</span>
          </a>
          <a href="#mandarin" data-page="/languages#mandarin" class="nav-dropdown-item" role="menuitem">
            <span class="item-lang-name">Mandarín</span>
            <span class="item-lang-sub">中文 — Zhōngwén</span>
          </a>
        </div>
      </div>

      <a href="/method" class="nav-link">Cómo enseñamos</a>
      <a href="/experiences" class="nav-link">Experiencias</a>
      <a href="/contact" class="nav-link nav-link-b2b">
        <span>Let's Connect</span>
        <span class="badge-b2b" aria-hidden="true">B2B</span>
      </a>
    </nav>

    <div class="nav-actions">
      <a href="/platform.html" class="platform-button" aria-label="Acceso a la plataforma de estudiantes">
        <span class="btn-text">Acceso Estudiantes</span>
        <span class="platform-btn-arrow" aria-hidden="true">→</span>
      </a>

      <button type="button" class="nav-cta-button" id="nav-cta-btn" aria-haspopup="dialog">
        <span>Agendar diagnóstico</span>
      </button>

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

      <div class="mobile-languages-box">
        <span class="mobile-languages-heading">Idiomas disponibles</span>
        <div class="mobile-languages-list">
          <a href="#ingles" class="mobile-lang-chip">Inglés</a>
          <a href="#frances" class="mobile-lang-chip">Francés</a>
          <a href="#mandarin" class="mobile-lang-chip">Mandarín</a>
        </div>
      </div>

      <nav class="mobile-nav-links" aria-label="Navegación móvil">
        <a href="/" class="mobile-nav-link is-active">Inicio</a>
        <a href="/who-we-are" class="mobile-nav-link">Quiénes somos</a>
        <a href="/languages" class="mobile-nav-link">Nuestros idiomas</a>
        <a href="/method" class="mobile-nav-link">Cómo enseñamos</a>
        <a href="/experiences" class="mobile-nav-link">Experiencias &amp; Ecosistema</a>
        <a href="/contact" class="mobile-nav-link mobile-link-b2b">
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


  <main id="main-content" class="vo-world-home">

    <!-- =================================================================
         01. HERO + LANGUAGE PASSPORT INTERACTIVO (MARFIL SÓLIDO #FFF9F0)
         Conserva EXACTAMENTE la composición derecha aprobada (.hero-art-canvas)
    ================================================================== -->

    <section id="inicio" class="hero">

      <div class="hero-ambient-glow" aria-hidden="true"></div>

      <div class="hero-main-layout">

        <div class="hero-content">

          <div class="vo-hero-coord-pill">
            <span class="vo-coord-live-dot" aria-hidden="true"></span>
            <span>BOGOTÁ · 4°42′N · 74°04′W · WE SPEAK THE WORLD</span>
          </div>

          <h1 class="hero-title">
            <span class="hero-line hero-line-1">El mundo es más grande</span>
            <em class="hero-line hero-line-2">cuando puedes hablar con él.</em>
          </h1>

          <p class="hero-description">
            Acompañamiento personalizado en inglés, francés y mandarín para personas y equipos que necesitan comunicarse con soltura, rigor y contexto cultural real.
          </p>

          <div class="vo-hero-cta-cluster">
            <button type="button" class="vo-btn-solid vo-btn-orange" id="b2c-primary-cta" aria-haspopup="dialog">
              <span>Empezar mi viaje</span>
              <span aria-hidden="true">→</span>
            </button>

            <button type="button" class="vo-btn-solid vo-btn-violet" id="b2c-pathfinder-trigger" aria-haspopup="dialog">
              <span>Mi ruta en 3 pasos</span>
            </button>

            <button type="button" class="vo-hero-b2b-pill" id="b2b-primary-cta" aria-haspopup="dialog">
              <span>Equipos B2B</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>

        </div>


        <!-- COMPOSICIÓN VISUAL EDITORIAL APROBADA — CONSERVADA EXACTAMENTE -->
        <div class="hero-art-canvas" aria-hidden="true">
          <div class="hero-orbit orbit-one"></div>
          <div class="hero-orbit orbit-two"></div>
          <div class="hero-orbit orbit-three"></div>

          <div class="hero-dot dot-violet"></div>
          <div class="hero-dot dot-orange"></div>
          <div class="hero-dot dot-yellow"></div>
          <div class="hero-dot dot-turquoise"></div>

          <div class="photo photo-one">
            <div class="photo-inner">
              <span class="photo-tag">01 · INMERSIÓN</span>
              <span class="photo-title">CULTURA</span>
            </div>
            <span class="photo-stamp">VO</span>
          </div>

          <div class="photo photo-two">
            <div class="photo-inner">
              <span class="photo-tag">02 · DIÁLOGO</span>
              <span class="photo-title">PERSONAS</span>
            </div>
            <span class="photo-stamp">VO</span>
          </div>

          <div class="photo photo-three">
            <div class="photo-inner">
              <span class="photo-tag">03 · HORIZONTES</span>
              <span class="photo-title">LUGARES</span>
            </div>
            <span class="photo-stamp">VO</span>
          </div>

          <svg class="route-line" viewBox="0 0 600 400" fill="none">
            <path d="M40 330 C150 80, 280 350, 390 130 S520 90, 580 40" stroke="url(#routeGradientHero)" stroke-width="2.5" stroke-dasharray="8 8" />
            <defs>
              <linearGradient id="routeGradientHero" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#FF6B35" />
                <stop offset="50%" stop-color="#FFC83D" />
                <stop offset="100%" stop-color="#6C3BFF" />
              </linearGradient>
            </defs>
          </svg>
        </div>

      </div>


      <!-- OBJETO ESPECIAL EN HERO: EL LANGUAGE PASSPORT INTERACTIVO -->
      <div class="vo-passport-dock" id="vo-passport-dock">

        <div class="vo-passport-stage">

          <!-- PASAPORTE CERRADO (LIBRETA FÍSICA 3D) -->
          <div
            class="vo-passport-closed"
            id="vo-passport-cover"
            role="button"
            tabindex="0"
            aria-expanded="false"
            aria-controls="vo-passport-open"
            aria-label="Abrir Language Passport interactivo de Vera Orbis"
          >
            <div class="vo-passport-spine" aria-hidden="true"></div>
            <div class="vo-passport-foil-frame">
              <div>
                <span class="vo-passport-top-label">VERA ORBIS</span>
                <span class="vo-passport-sub-label">LANGUAGE PASSPORT</span>
              </div>

              <div class="vo-passport-crest" aria-hidden="true">
                <svg viewBox="0 0 120 120" width="92" height="92" fill="none">
                  <circle cx="60" cy="60" r="50" stroke="#FFC83D" stroke-width="2" stroke-dasharray="4 3" />
                  <circle cx="60" cy="60" r="38" stroke="#FFC83D" stroke-width="1.6" />
                  <ellipse cx="60" cy="60" rx="38" ry="16" stroke="#FFC83D" stroke-width="1.3" transform="rotate(-24 60 60)" />
                  <ellipse cx="60" cy="60" rx="38" ry="16" stroke="#FFC83D" stroke-width="1.3" transform="rotate(24 60 60)" />
                  <path d="M60 32 L66 54 L88 60 L66 66 L60 88 L54 66 L32 60 L54 54 Z" fill="#FFC83D" />
                  <circle cx="60" cy="60" r="4" fill="#183B66" />
                </svg>
              </div>

              <div class="vo-passport-chip-gold" aria-hidden="true"></div>
              <span class="vo-passport-motto">LEARN · LIVE · SPEAK</span>
            </div>
            <span class="vo-passport-ribbon-tab">ABRIR →</span>
          </div>

          <!-- PASAPORTE ABIERTO (DOBLE PÁGINA CON SELLOS EN VIVO) -->
          <div class="vo-passport-open-book" id="vo-passport-open" hidden>
            <div class="vo-passport-pages-grid">

              <div class="vo-passport-leaf vo-leaf-left">
                <div>
                  <span class="vo-leaf-kicker">PASAPORTE OFICIAL · VERA ORBIS</span>
                  <div class="vo-passport-id-row">
                    <div class="vo-passport-avatar-seal" aria-hidden="true">VO</div>
                    <div class="vo-passport-holder-meta">
                      <strong>EXPLORADOR/A GLOBAL</strong>
                      <span id="vo-passport-counter">1 / 3 SELLOS ACTIVOS</span>
                    </div>
                  </div>
                  <div class="vo-passport-data-pair">
                    <div class="vo-passport-data-cell">
                      <small>ORIGEN</small>
                      <strong>BOG · 4°42′N</strong>
                    </div>
                    <div class="vo-passport-data-cell">
                      <small>FILOSOFÍA</small>
                      <strong>SPEAK IT</strong>
                    </div>
                  </div>
                </div>
                <div class="vo-passport-mrz" aria-hidden="true">
                  P&lt;VORBIS&lt;&lt;WE&lt;SPEAK&lt;THE&lt;WORLD&lt;&lt;&lt;&lt;&lt;&lt;<br>
                  VO2026BOG442N7404W&lt;&lt;EN&lt;FR&lt;ZH&lt;&lt;01
                </div>
              </div>

              <div class="vo-passport-leaf vo-leaf-right">
                <div>
                  <div class="vo-leaf-right-top">
                    <span class="vo-leaf-kicker">VISAS &amp; SELLOS VIVOS</span>
                    <button type="button" class="vo-passport-close-btn" id="vo-passport-close">Cerrar &times;</button>
                  </div>

                  <div class="vo-stamp-picker-row" role="group" aria-label="Estampar idioma en el pasaporte">
                    <button type="button" class="vo-stamp-ink-btn" data-stamp="en">+ Sello EN</button>
                    <button type="button" class="vo-stamp-ink-btn" data-stamp="fr">+ Sello FR</button>
                    <button type="button" class="vo-stamp-ink-btn" data-stamp="zh">+ Sello 中文</button>
                  </div>

                  <div class="vo-stamps-canvas" id="vo-stamps-canvas">
                    <div class="vo-visa-seal seal-en">
                      <strong>EN · LONDON / NYC</strong>
                      <small>VISA ACTIVA · VO</small>
                    </div>
                  </div>
                </div>

                <div class="vo-stamp-phrase-bar">
                  <span id="vo-stamp-greeting">«Let's speak the world together.»</span>
                  <a href="#ingles" class="vo-stamp-jump-link" id="vo-stamp-jump">Ir a EN ↓</a>
                </div>
              </div>

            </div>
          </div>

        </div>

        <div class="vo-passport-companion">
          <span class="vo-dock-kicker">TU OBJETO DE VIAJE · LANGUAGE PASSPORT</span>
          <h2 class="vo-dock-title">Abre tu Language Passport.</h2>
          <p class="vo-dock-micro">
            Cada conversación real y cada cultura que exploras suma sellos vivos a tu recorrido. Tócalo para abrirlo y estampar tu primer destino.
          </p>
          <div class="vo-dock-quick-stamps">
            <button type="button" class="vo-quick-stamp-pill" data-open-stamp="en">Estampar EN · English</button>
            <button type="button" class="vo-quick-stamp-pill" data-open-stamp="fr">Estampar FR · Français</button>
            <button type="button" class="vo-quick-stamp-pill" data-open-stamp="zh">Estampar 中文 · Zhōngwén</button>
          </div>
        </div>

      </div>

    </section>


    <!-- =================================================================
         02. EL VIDEO REAL (VIOLETA ORBIS SÓLIDO #6C3BFF)
         Reproducción real en página, sin póster falso ni imagen de Vera
    ================================================================== -->

    <section class="vo-video-world" id="vision">
      <div class="vo-video-grid">

        <div class="vo-video-copy">
          <span class="vo-solid-tag tag-yellow">VIDEO REAL · 0:45 MIN</span>
          <h2 class="vo-display-h2">
            Vera Orbis es el mundo. <br>
            <span class="vo-accent-yellow">Las personas le dan vida.</span>
          </h2>
          <p class="vo-micro-lead">
            Lina Celedón, Founder &amp; Director, te cuenta en 45 segundos por qué aquí los idiomas se viven hablando.
          </p>
          <div class="vo-video-cta-row">
            <button type="button" class="vo-btn-solid vo-btn-yellow" id="vo-unmute-restart-btn">
              <span>Escuchar con voz</span>
              <span aria-hidden="true">→</span>
            </button>
            <a href="/who-we-are" class="vo-btn-solid vo-btn-ivory">
              <span>Quiénes somos</span>
            </a>
          </div>
        </div>

        <div class="vo-real-video-card">
          <div class="vo-video-viewport">
            <video
              id="home-founder-video"
              class="vo-live-video"
              autoplay
              muted
              loop
              playsinline
              preload="auto"
              aria-label="Video real de bienvenida a Vera Orbis por Lina Celedón"
            >
              <source src="/videos/vera-orbis-intro-web.mp4" type="video/mp4" />
              <source src="/videos/vera-orbis-intro.mov" type="video/quicktime" />
            </video>
            <span class="vo-video-live-pill" id="vo-video-status-pill">TOCA PARA AUDIO</span>
          </div>

          <div class="vo-video-controls-bar">
            <button type="button" class="vo-vid-ctrl-btn" id="vo-vid-playpause" aria-label="Pausar o reproducir video">
              Pausar
            </button>
            <div class="vo-vid-scrubber" id="vo-vid-scrubber" role="slider" tabindex="0" aria-label="Progreso del video" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
              <div class="vo-vid-scrubber-fill" id="vo-vid-scrubber-fill"></div>
            </div>
            <span class="vo-vid-time" id="vo-vid-time">0:00 / 0:45</span>
            <button type="button" class="vo-vid-ctrl-btn" id="vo-vid-sound" aria-label="Activar o silenciar sonido">
              Activar audio
            </button>
          </div>
        </div>

      </div>
    </section>


    <!-- =================================================================
         03. IDIOMAS: COMPOSICIONES TIPOGRÁFICAS PURAS (AZUL ÍNDIGO #183B66)
         CERO FOTOGRAFÍAS · EN / FR / 中文 · TARJETAS 3D VIVAS QUE GIRAN
    ================================================================== -->

    <section class="vo-typo-languages-world" id="idiomas">

      <div class="vo-section-header-compact">
        <span class="vo-solid-tag tag-turquoise">TOCA CADA TARJETA PARA GIRARLA</span>
        <h2 class="vo-display-h2">
          Tres idiomas. <span class="vo-accent-yellow">Tres personalidades.</span>
        </h2>
        <p class="vo-micro-lead">
          Toca, inclina y gira cada tarjeta para descubrir su mundo.
        </p>
      </div>

      <div class="languages-three-grid">

        <!-- 01. EN — ENGLISH (NARANJA VIVO #FF6B35) -->
        <article class="lang-showcase-card english-theme vo-kinetic-card float-a" id="ingles" tabindex="0" role="button" aria-expanded="false" aria-label="EN — English. Pulsa para girar tarjeta">
          <div class="lang-card-inner">

            <div class="vo-typo-lang-face vo-typo-front">
              <span class="vo-typo-watermark" aria-hidden="true">EN</span>
              <div class="vo-typo-top-row">
                <span class="vo-typo-level-pill">A1 — C2</span>
                <span class="vo-typo-flip-hint">Gira ↺</span>
              </div>

              <div class="vo-typo-centerpiece">
                <span class="vo-monumental-code">EN</span>
                <h3 class="vo-typo-lang-name">EN — English</h3>
                <p class="vo-typo-subline">Soltura global para trabajar, viajar y crear sin barreras.</p>
              </div>

              <div class="vo-typo-bottom-bar">
                <span>Descubrir por dentro</span>
                <span aria-hidden="true">→</span>
              </div>
            </div>

            <div class="vo-typo-lang-face vo-typo-back">
              <div class="vo-back-header-row">
                <span class="vo-back-lang-pill pill-bg-orange">EN — ENGLISH</span>
                <button type="button" class="vo-back-return-btn" data-flip-close>← Volver</button>
              </div>

              <div class="vo-back-idiom-box">
                <blockquote>«Cut to the chase»</blockquote>
                <p>Ir directo a lo esencial: claridad real al conversar y negociar.</p>
              </div>

              <ul class="vo-back-points">
                <li>Conversación 1 a 1 activa desde el primer día</li>
                <li>Trabajo global, viajes y presentaciones reales</li>
                <li>Preparación IELTS, TOEFL &amp; Duolingo</li>
              </ul>

              <div class="vo-back-cta-pair">
                <button type="button" class="vo-back-diag-btn" data-open-orient="ingles">Agendar diagnóstico</button>
                <a href="/languages#ingles" class="vo-back-more-link">Ver más →</a>
              </div>
            </div>

          </div>
        </article>


        <!-- 02. FR — FRANÇAIS (VIOLETA ORBIS #6C3BFF) -->
        <article class="lang-showcase-card french-theme vo-kinetic-card float-b" id="frances" tabindex="0" role="button" aria-expanded="false" aria-label="FR — Français. Pulsa para girar tarjeta">
          <div class="lang-card-inner">

            <div class="vo-typo-lang-face vo-typo-front">
              <span class="vo-typo-watermark" aria-hidden="true">FR</span>
              <div class="vo-typo-top-row">
                <span class="vo-typo-level-pill">A1 — C1</span>
                <span class="vo-typo-flip-hint">Gira ↺</span>
              </div>

              <div class="vo-typo-centerpiece">
                <span class="vo-monumental-code">FR</span>
                <h3 class="vo-typo-lang-name">FR — Français</h3>
                <p class="vo-typo-subline">Matiz, cultura viva, diplomacia y placer por la conversación.</p>
              </div>

              <div class="vo-typo-bottom-bar">
                <span>Descubrir por dentro</span>
                <span aria-hidden="true">→</span>
              </div>
            </div>

            <div class="vo-typo-lang-face vo-typo-back">
              <div class="vo-back-header-row">
                <span class="vo-back-lang-pill pill-bg-violet">FR — FRANÇAIS</span>
                <button type="button" class="vo-back-return-btn" data-flip-close>← Volver</button>
              </div>

              <div class="vo-back-idiom-box">
                <blockquote>«L'esprit de l'escalier»</blockquote>
                <p>El arte francés del ingenio, el debate y la expresión precisa.</p>
              </div>

              <ul class="vo-back-points">
                <li>Fonética natural y oído real desde cero</li>
                <li>Cultura francófona, cine y actualidad</li>
                <li>Preparación oficial DELF &amp; DALF</li>
              </ul>

              <div class="vo-back-cta-pair">
                <button type="button" class="vo-back-diag-btn" data-open-orient="frances">Agendar diagnóstico</button>
                <a href="/languages#frances" class="vo-back-more-link">Ver más →</a>
              </div>
            </div>

          </div>
        </article>


        <!-- 03. 中文 — 中文 (zhōngwén) (TURQUESA SÓLIDO #20C7B5) -->
        <article class="lang-showcase-card mandarin-theme vo-kinetic-card float-c" id="mandarin" tabindex="0" role="button" aria-expanded="false" aria-label="中文 (zhōngwén). Pulsa para girar tarjeta">
          <div class="lang-card-inner">

            <div class="vo-typo-lang-face vo-typo-front">
              <span class="vo-typo-watermark" aria-hidden="true">中文</span>
              <div class="vo-typo-top-row">
                <span class="vo-typo-level-pill">HSK 1 A 6</span>
                <span class="vo-typo-flip-hint">Gira ↺</span>
              </div>

              <div class="vo-typo-centerpiece">
                <span class="vo-monumental-code">中文</span>
                <span class="vo-typo-mandarin-tag">Mandarín: Comunicación, Cultura &amp; Negocios</span>
                <h3 class="vo-typo-lang-name">中文 — 中文 (zhōngwén)</h3>
                <p class="vo-typo-subline">Pensamiento directo y soltura comunicativa desde las primeras sesiones</p>
              </div>

              <div class="vo-typo-bottom-bar">
                <span>Descubrir por dentro</span>
                <span aria-hidden="true">→</span>
              </div>
            </div>

            <div class="vo-typo-lang-face vo-typo-back">
              <div class="vo-back-header-row">
                <span class="vo-back-lang-pill pill-bg-turquoise">中文 — ZHŌNGWÉN</span>
                <button type="button" class="vo-back-return-btn" data-flip-close>← Volver</button>
              </div>

              <div class="vo-back-idiom-box">
                <blockquote>«Jiā yóu! · 加油»</blockquote>
                <p>Energía compartida, confianza mutua (Guanxi) y visión de futuro.</p>
              </div>

              <ul class="vo-back-points">
                <li>Comprensión fonética (pinyin) y tonos vivos</li>
                <li>Protocolo cultural y negocios con Asia</li>
                <li>Preparación estratégica para exámenes oficiales (HSK 1 a 6)</li>
              </ul>

              <div class="vo-back-cta-pair">
                <button type="button" class="vo-back-diag-btn" data-open-orient="mandarin">Agendar diagnóstico</button>
                <a href="/languages#mandarin" class="vo-back-more-link">Ver más →</a>
              </div>
            </div>

          </div>
        </article>

      </div>

      <!-- Franja compacta B2B + Sello de Transparencia -->
      <div class="vo-b2b-compact-strip">
        <div class="format-card format-mandarin-b2b" id="empresas">
          <div>
            <span class="vo-b2b-strip-kicker">COMERCIO EXTERIOR &amp; ASIA · B2B</span>
            <h3 class="vo-b2b-strip-title">Mandarín Comercial &amp; Protocolo + Equipos Globales</h3>
            <p class="vo-b2b-strip-micro">Entrenamiento a medida en inglés, francés y mandarín para líderes y empresas.</p>
          </div>
          <button type="button" class="vo-btn-solid vo-btn-orange" id="home-b2b-card-btn">
            <span>Propuesta B2B</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <div class="vo-honesty-pill-card">
          <strong>Transparencia pedagógica</strong>
          <p>Práctica humana real y preparación rigurosa para exámenes internacionales, sin promesas mágicas.</p>
        </div>
      </div>

    </section>


    <!-- =================================================================
         04. LEARN IT · LIVE IT · SPEAK IT (AMARILLO SOL SÓLIDO #FFC83D)
         Tres tarjetas cinéticas 3D que giran al tocarlas
    ================================================================== -->

    <section class="vo-method-sun-world" id="metodologia">

      <div class="vo-section-header-compact">
        <span class="vo-solid-tag tag-indigo">FILOSOFÍA EN MOVIMIENTO · TOCA PARA GIRAR</span>
        <h2 class="vo-display-h2">
          Learn It. Live It. <span class="vo-accent-violet">Speak It.</span>
        </h2>
        <p class="vo-micro-lead">
          No vienes a llenar huecos en un libro. Vienes a usar tu voz.
        </p>
      </div>

      <div class="vo-method-deck">

        <article class="vo-kinetic-card vo-method-card step-learn float-a" tabindex="0" role="button" aria-expanded="false" aria-label="01 Learn It. Pulsa para girar">
          <div class="vo-kinetic-inner">
            <div class="vo-kinetic-face vo-kinetic-front">
              <span class="vo-method-num-watermark" aria-hidden="true">01</span>
              <span class="vo-method-step-pill">PASO 01</span>
              <div>
                <h3 class="vo-method-front-title">Learn It</h3>
                <p class="vo-method-front-hook">Comprende con sentido real.</p>
              </div>
              <span class="vo-method-flip-cue">Girar tarjeta ↺</span>
            </div>
            <div class="vo-kinetic-face vo-kinetic-back">
              <span class="vo-method-step-pill">01 · LEARN IT</span>
              <p class="vo-method-back-quote">
                «Descubres cómo suena y funciona el idioma dentro de conversaciones reales, nunca aislado.»
              </p>
              <button type="button" class="vo-back-return-btn" data-flip-close>← Volver</button>
            </div>
          </div>
        </article>

        <article class="vo-kinetic-card vo-method-card step-live float-b" tabindex="0" role="button" aria-expanded="false" aria-label="02 Live It. Pulsa para girar">
          <div class="vo-kinetic-inner">
            <div class="vo-kinetic-face vo-kinetic-front">
              <span class="vo-method-num-watermark" aria-hidden="true">02</span>
              <span class="vo-method-step-pill">PASO 02</span>
              <div>
                <h3 class="vo-method-front-title">Live It</h3>
                <p class="vo-method-front-hook">Habita la cultura viva.</p>
              </div>
              <span class="vo-method-flip-cue">Girar tarjeta ↺</span>
            </div>
            <div class="vo-kinetic-face vo-kinetic-back">
              <span class="vo-method-step-pill">02 · LIVE IT</span>
              <p class="vo-method-back-quote">
                «Humor, cine, café, acuerdos y códigos cotidianos que ningún traductor te explica.»
              </p>
              <button type="button" class="vo-back-return-btn" data-flip-close>← Volver</button>
            </div>
          </div>
        </article>

        <article class="vo-kinetic-card vo-method-card step-speak float-c" tabindex="0" role="button" aria-expanded="false" aria-label="03 Speak It. Pulsa para girar">
          <div class="vo-kinetic-inner">
            <div class="vo-kinetic-face vo-kinetic-front">
              <span class="vo-method-num-watermark" aria-hidden="true">03</span>
              <span class="vo-method-step-pill">PASO 03</span>
              <div>
                <h3 class="vo-method-front-title">Speak It</h3>
                <p class="vo-method-front-hook">Habla desde el día uno.</p>
              </div>
              <span class="vo-method-flip-cue">Girar tarjeta ↺</span>
            </div>
            <div class="vo-kinetic-face vo-kinetic-back">
              <span class="vo-method-step-pill">03 · SPEAK IT</span>
              <p class="vo-method-back-quote">
                «Un espacio cálido y humano donde equivocarse sin miedo desbloquea tu fluidez.»
              </p>
              <button type="button" class="vo-back-return-btn" data-flip-close>← Volver</button>
            </div>
          </div>
        </article>

      </div>

      <div class="vo-method-cta-center">
        <a href="/method" class="vo-btn-solid vo-btn-indigo">
          <span>Explorar cómo enseñamos</span>
          <span aria-hidden="true">→</span>
        </a>
      </div>

    </section>


    <!-- =================================================================
         05. LOS CINCO UNIVERSOS (TURQUESA SÓLIDO #20C7B5)
    ================================================================== -->

    <section class="vo-universes-turquoise-world" id="universos">

      <div class="vo-section-header-compact">
        <span class="vo-solid-tag tag-ivory">CINCO DIMENSIONES INTERACTIVAS</span>
        <h2 class="vo-display-h2">
          Un mundo vivo por <span class="vo-accent-ivory">explorar.</span>
        </h2>
      </div>

      <div class="universes-five-grid">

        <div class="vo-kinetic-card vo-universe-kinetic u-1 float-a" tabindex="0" role="button" aria-expanded="false">
          <div class="vo-kinetic-inner">
            <div class="vo-kinetic-face vo-kinetic-front">
              <span class="vo-u-roman">I</span>
              <div>
                <h3>Language</h3>
                <p class="vo-u-front-micro">EN · FR · 中文 con voz propia.</p>
              </div>
              <span class="vo-u-tap">Girar ↺</span>
            </div>
            <div class="vo-kinetic-face vo-kinetic-back">
              <p class="vo-u-back-text">Tres idiomas diseñados alrededor de tus metas reales.</p>
              <a href="/languages" class="vo-u-portal-link">Ir a Idiomas →</a>
            </div>
          </div>
        </div>

        <div class="vo-kinetic-card vo-universe-kinetic u-2 float-b" tabindex="0" role="button" aria-expanded="false">
          <div class="vo-kinetic-inner">
            <div class="vo-kinetic-face vo-kinetic-front">
              <span class="vo-u-roman">II</span>
              <div>
                <h3>Culture</h3>
                <p class="vo-u-front-micro">Cómo siente cada sociedad.</p>
              </div>
              <span class="vo-u-tap">Girar ↺</span>
            </div>
            <div class="vo-kinetic-face vo-kinetic-back">
              <p class="vo-u-back-text">Expresiones reales, miradas y matices culturales vivos.</p>
              <a href="/method" class="vo-u-portal-link">Ver método →</a>
            </div>
          </div>
        </div>

        <div class="vo-kinetic-card vo-universe-kinetic u-3 float-c" tabindex="0" role="button" aria-expanded="false">
          <div class="vo-kinetic-inner">
            <div class="vo-kinetic-face vo-kinetic-front">
              <span class="vo-u-roman">III</span>
              <div>
                <h3>People</h3>
                <p class="vo-u-front-micro">Cada persona importa.</p>
              </div>
              <span class="vo-u-tap">Girar ↺</span>
            </div>
            <div class="vo-kinetic-face vo-kinetic-back">
              <p class="vo-u-back-text">Acompañamiento cercano, cálido y 100% humano.</p>
              <a href="/who-we-are" class="vo-u-portal-link">Quiénes somos →</a>
            </div>
          </div>
        </div>

        <div class="vo-kinetic-card vo-universe-kinetic u-4 float-a" tabindex="0" role="button" aria-expanded="false">
          <div class="vo-kinetic-inner">
            <div class="vo-kinetic-face vo-kinetic-front">
              <span class="vo-u-roman">IV</span>
              <div>
                <h3>Places</h3>
                <p class="vo-u-front-micro">Bogotá 4°42′N hacia el mundo.</p>
              </div>
              <span class="vo-u-tap">Girar ↺</span>
            </div>
            <div class="vo-kinetic-face vo-kinetic-back">
              <p class="vo-u-back-text">De nuestro estudio en Bogotá a cualquier ciudad global.</p>
              <a href="/contact" class="vo-u-portal-link">Conectar →</a>
            </div>
          </div>
        </div>

        <div class="vo-kinetic-card vo-universe-kinetic u-5 float-b" tabindex="0" role="button" aria-expanded="false">
          <div class="vo-kinetic-inner">
            <div class="vo-kinetic-face vo-kinetic-front">
              <span class="vo-u-roman">V</span>
              <div>
                <h3>Experiences</h3>
                <p class="vo-u-front-micro">Living Connections activas.</p>
              </div>
              <span class="vo-u-tap">Girar ↺</span>
            </div>
            <div class="vo-kinetic-face vo-kinetic-back">
              <p class="vo-u-back-text">Sesiones 1 a 1, programas B2B y experiencias culturales.</p>
              <a href="/experiences" class="vo-u-portal-link">Experiencias →</a>
            </div>
          </div>
        </div>

      </div>

    </section>


    <!-- =================================================================
         PUERTAS DEL UNIVERSO VERA ORBIS (MARFIL SÓLIDO #FFF9F0)
    ================================================================== -->

    <section class="vo-portals-doors-world" id="portales">
      <div class="vo-section-header-compact">
        <span class="vo-solid-tag tag-orange">ELIGE TU PUERTA</span>
        <h2 class="vo-display-h2">
          Sigue explorando <span class="vo-accent-violet">Vera Orbis.</span>
        </h2>
      </div>

      <div class="home-portals-grid">
        <a href="/who-we-are" class="vo-door-card door-1" id="quienes-somos">
          <span class="vo-door-num">PUERTA 01</span>
          <div>
            <h3 class="vo-door-title">Quiénes somos</h3>
            <p class="vo-door-sub">Historia, esencia y liderazgo.</p>
          </div>
          <span class="vo-door-enter">Entrar →</span>
        </a>

        <a href="/languages" class="vo-door-card door-2">
          <span class="vo-door-num">PUERTA 02</span>
          <div>
            <h3 class="vo-door-title">Idiomas</h3>
            <p class="vo-door-sub">EN · FR · 中文 en detalle.</p>
          </div>
          <span class="vo-door-enter">Entrar →</span>
        </a>

        <a href="/method" class="vo-door-card door-3" id="metodo">
          <span class="vo-door-num">PUERTA 03</span>
          <div>
            <h3 class="vo-door-title">Cómo enseñamos</h3>
            <p class="vo-door-sub">Learn · Live · Speak.</p>
          </div>
          <span class="vo-door-enter">Entrar →</span>
        </a>

        <a href="/experiences" class="vo-door-card door-4" id="ecosistema">
          <span class="vo-door-num">PUERTA 04</span>
          <div>
            <h3 class="vo-door-title">Experiencias</h3>
            <p class="vo-door-sub">1 a 1, equipos y ecosistema.</p>
          </div>
          <span class="vo-door-enter">Entrar →</span>
        </a>

        <a href="/contact" class="vo-door-card door-5">
          <span class="vo-door-num">PUERTA 05</span>
          <div>
            <h3 class="vo-door-title">Let's Connect</h3>
            <p class="vo-door-sub">Conversa hoy con nosotros.</p>
          </div>
          <span class="vo-door-enter">Entrar →</span>
        </a>
      </div>
    </section>


    <!-- =================================================================
         06. GRAN CIERRE — ABRE LA PUERTA (NARANJA VIVO SÓLIDO #FF6B35)
    ================================================================== -->

    <section class="vo-finale-orange-world" id="contacto">
      <div class="vo-finale-inner">
        <span class="vo-solid-tag tag-yellow">WE SPEAK THE WORLD</span>
        <h2 class="vo-finale-title">
          ¿Qué idioma quieres habitar hoy?
        </h2>
        <p class="vo-finale-micro">
          15 minutos de diagnóstico gratuito y cálido para trazar tu ruta personal o de equipo.
        </p>

        <div class="vo-finale-actions">
          <button type="button" class="vo-btn-solid vo-btn-indigo" id="home-diag-cta" aria-haspopup="dialog">
            <span>Agendar diagnóstico sin costo</span>
            <span aria-hidden="true">→</span>
          </button>

          <button type="button" class="vo-btn-solid vo-btn-ivory" id="home-pathfinder-cta" aria-haspopup="dialog">
            <span>Ruta en 3 preguntas</span>
            <span aria-hidden="true">→</span>
          </button>

          <a
            href="https://wa.me/573123035708?text=Hola%20Vera%20Orbis.%20Quiero%20conocer%20m%C3%A1s%20sobre%20sus%20programas."
            class="vo-btn-solid vo-btn-yellow"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Hablar por WhatsApp con Vera Orbis"
          >
            <span>WhatsApp directo</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>

  </main>

  ${renderSiteFooter()}
  ${renderConversionModals()}
`

// =========================================================================
// INICIALIZACIÓN INTERACTIVA VIVA (ESCRITORIO + TÁCTIL MÓVIL)
// =========================================================================

initConversionModals()

// 1. Elevación de Navbar al hacer scroll
const navbar = document.querySelector('#site-navbar')
if (navbar) {
  let ticking = false
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        navbar.classList.toggle('navbar-scrolled', window.scrollY > 25)
        ticking = false
      })
      ticking = true
    }
  }, { passive: true })
}

// 2. Menú de navegación móvil (con transición .is-open)
const mobileToggle = document.querySelector('#mobile-menu-toggle')
const mobileDrawer = document.querySelector('#mobile-nav-drawer')
const mobileClose = document.querySelector('#mobile-nav-close')
const mobileBackdrop = document.querySelector('#mobile-nav-backdrop')

const openDrawer = () => {
  if (!mobileDrawer) return
  mobileDrawer.hidden = false
  window.requestAnimationFrame(() => {
    mobileDrawer.classList.add('is-open')
  })
  mobileToggle?.setAttribute('aria-expanded', 'true')
  document.body.classList.add('menu-open')
}

const closeDrawer = () => {
  if (!mobileDrawer) return
  mobileDrawer.classList.remove('is-open')
  mobileToggle?.setAttribute('aria-expanded', 'false')
  document.body.classList.remove('menu-open')
  window.setTimeout(() => {
    if (!mobileDrawer.classList.contains('is-open')) {
      mobileDrawer.hidden = true
    }
  }, 320)
}

mobileToggle?.addEventListener('click', openDrawer)
mobileClose?.addEventListener('click', closeDrawer)
mobileBackdrop?.addEventListener('click', closeDrawer)

document.querySelectorAll('.mobile-nav-link, .mobile-lang-chip').forEach(link => {
  link.addEventListener('click', closeDrawer)
})

// 3. Dropdown de idiomas en escritorio
const langBtn = document.querySelector('#languages-menu-btn')
const langWrap = document.querySelector('#languages-dropdown-wrap')

if (langBtn && langWrap) {
  langBtn.addEventListener('click', (e) => {
    if (window.innerWidth > 900) {
      e.preventDefault()
      const isOpen = langWrap.classList.toggle('is-open')
      langBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false')
    }
  })

  document.addEventListener('click', (e) => {
    if (!langWrap.contains(e.target)) {
      langWrap.classList.remove('is-open')
      langBtn.setAttribute('aria-expanded', 'false')
    }
  })
}

// 4. Parallax vivo en la composición derecha aprobada del Hero (.hero-art-canvas)
if (typeof window !== 'undefined') {
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (isFinePointer && !prefersReducedMotion) {
    const hero = document.querySelector('#inicio')
    const card1 = document.querySelector('.photo-one')
    const card2 = document.querySelector('.photo-two')
    const card3 = document.querySelector('.photo-three')

    if (hero && card1) {
      let ticking = false
      hero.addEventListener('mousemove', (e) => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const rect = hero.getBoundingClientRect()
            const x = (e.clientX - rect.left - rect.width / 2) / rect.width
            const y = (e.clientY - rect.top - rect.height / 2) / rect.height

            if (card1) card1.style.transform = `rotate(-5deg) translate3d(${(x * -18).toFixed(1)}px, ${(y * -14).toFixed(1)}px, 0)`
            if (card2) card2.style.transform = `rotate(4deg) translate3d(${(x * 18).toFixed(1)}px, ${(y * -16).toFixed(1)}px, 0)`
            if (card3) card3.style.transform = `rotate(-3deg) translate3d(${(x * -14).toFixed(1)}px, ${(y * 14).toFixed(1)}px, 0)`
            ticking = false
          })
          ticking = true
        }
      })

      hero.addEventListener('mouseleave', () => {
        if (card1) card1.style.transform = 'rotate(-5deg)'
        if (card2) card2.style.transform = 'rotate(4deg)'
        if (card3) card3.style.transform = 'rotate(-3deg)'
      })
    }
  }
}

// 5. LANGUAGE PASSPORT INTERACTIVO EN HERO (Apertura 3D + Estampado de Visas + Tilt)
const passportDock = document.querySelector('#vo-passport-dock')
const passportCover = document.querySelector('#vo-passport-cover')
const passportOpenBook = document.querySelector('#vo-passport-open')
const passportCloseBtn = document.querySelector('#vo-passport-close')
const stampsCanvas = document.querySelector('#vo-stamps-canvas')
const passportCounter = document.querySelector('#vo-passport-counter')
const stampGreeting = document.querySelector('#vo-stamp-greeting')
const stampJump = document.querySelector('#vo-stamp-jump')

const STAMP_DATA = {
  en: {
    cls: 'seal-en',
    title: 'EN · LONDON / NYC',
    sub: 'VISA ACTIVA · VO',
    greeting: '«Let\'s speak the world together.»',
    href: '#ingles',
    jumpText: 'Ir a EN ↓'
  },
  fr: {
    cls: 'seal-fr',
    title: 'FR · PARIS / MONTRÉAL',
    sub: 'VISA ACTIF · VO',
    greeting: '«Le monde s\'ouvre quand on le parle.»',
    href: '#frances',
    jumpText: 'Ir a FR ↓'
  },
  zh: {
    cls: 'seal-zh',
    title: '中文 · SHANGHAI / BEIJING',
    sub: '签证激活 · VO',
    greeting: '«世界因交流而更广阔 · Nǐ hǎo!»',
    href: '#mandarin',
    jumpText: 'Ir a 中文 ↓'
  }
}

const activeStamps = new Set(['en'])

function renderPassportStamps(latestKey = 'en') {
  if (!stampsCanvas) return
  stampsCanvas.innerHTML = Array.from(activeStamps).map((key) => {
    const info = STAMP_DATA[key]
    return `
      <div class="vo-visa-seal ${info.cls}">
        <strong>${info.title}</strong>
        <small>${info.sub}</small>
      </div>
    `
  }).join('')

  if (passportCounter) {
    passportCounter.textContent = `${activeStamps.size} / 3 SELLOS ACTIVOS`
  }

  const current = STAMP_DATA[latestKey] || STAMP_DATA.en
  if (stampGreeting) stampGreeting.textContent = current.greeting
  if (stampJump) {
    stampJump.setAttribute('href', current.href)
    stampJump.textContent = current.jumpText
  }
}

function openPassport(stampKey) {
  if (!passportCover || !passportOpenBook) return
  passportCover.hidden = true
  passportCover.setAttribute('aria-expanded', 'true')
  passportOpenBook.hidden = false
  passportDock?.classList.add('is-expanded')
  if (stampKey && STAMP_DATA[stampKey]) {
    activeStamps.add(stampKey)
    renderPassportStamps(stampKey)
  }
}

function closePassport() {
  if (!passportCover || !passportOpenBook) return
  passportOpenBook.hidden = true
  passportCover.hidden = false
  passportCover.setAttribute('aria-expanded', 'false')
  passportDock?.classList.remove('is-expanded')
}

passportCover?.addEventListener('click', () => openPassport())
passportCover?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    openPassport()
  }
})
passportCloseBtn?.addEventListener('click', closePassport)

document.querySelectorAll('[data-stamp]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-stamp')
    if (key && STAMP_DATA[key]) {
      activeStamps.add(key)
      renderPassportStamps(key)
    }
  })
})

document.querySelectorAll('[data-open-stamp]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-open-stamp')
    openPassport(key)
  })
})

// Tilt 3D para la portada física del Pasaporte
if (typeof window !== 'undefined' && passportCover) {
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (isFinePointer && !prefersReducedMotion) {
    passportCover.addEventListener('mousemove', (e) => {
      const rect = passportCover.getBoundingClientRect()
      const rx = (((e.clientY - rect.top) / rect.height) - 0.5) * -18
      const ry = (((e.clientX - rect.left) / rect.width) - 0.5) * 20
      passportCover.style.transform = `translateY(-10px) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) scale(1.03)`
    })
    passportCover.addEventListener('mouseleave', () => {
      passportCover.style.transform = ''
    })
  }
}

// 6. REPRODUCTOR DE VIDEO REAL (Sin póster sustituto, con control de audio y barra)
const founderVideo = document.querySelector('#home-founder-video')
const playPauseBtn = document.querySelector('#vo-vid-playpause')
const soundBtn = document.querySelector('#vo-vid-sound')
const unmuteRestartBtn = document.querySelector('#vo-unmute-restart-btn')
const scrubber = document.querySelector('#vo-vid-scrubber')
const scrubberFill = document.querySelector('#vo-vid-scrubber-fill')
const vidTime = document.querySelector('#vo-vid-time')
const statusPill = document.querySelector('#vo-video-status-pill')

function formatSec(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function syncVideoUi() {
  if (!founderVideo) return
  if (playPauseBtn) {
    playPauseBtn.textContent = founderVideo.paused ? 'Reproducir' : 'Pausar'
  }
  if (soundBtn) {
    soundBtn.textContent = founderVideo.muted ? 'Activar audio' : 'Silenciar'
    soundBtn.classList.toggle('is-sound-on', !founderVideo.muted)
  }
  if (statusPill) {
    statusPill.textContent = founderVideo.muted
      ? 'TOCA PARA AUDIO'
      : 'AUDIO ACTIVO'
  }
}

if (founderVideo) {
  founderVideo.addEventListener('timeupdate', () => {
    const dur = founderVideo.duration || 45.8
    const pct = Math.min(100, Math.max(0, (founderVideo.currentTime / dur) * 100))
    if (scrubberFill) scrubberFill.style.width = `${pct.toFixed(1)}%`
    if (scrubber) scrubber.setAttribute('aria-valuenow', String(Math.round(pct)))
    if (vidTime) vidTime.textContent = `${formatSec(founderVideo.currentTime)} / ${formatSec(dur)}`
  })

  founderVideo.addEventListener('loadedmetadata', syncVideoUi)
  founderVideo.addEventListener('play', syncVideoUi)
  founderVideo.addEventListener('pause', syncVideoUi)
  founderVideo.addEventListener('volumechange', syncVideoUi)

  // Clic directo en el video: si está silenciado, activa audio; si ya tiene audio, pausa/reproduce
  founderVideo.addEventListener('click', () => {
    if (founderVideo.muted) {
      founderVideo.muted = false
      founderVideo.play().catch(() => {})
    } else if (founderVideo.paused) {
      founderVideo.play().catch(() => {})
    } else {
      founderVideo.pause()
    }
    syncVideoUi()
  })

  playPauseBtn?.addEventListener('click', () => {
    if (founderVideo.paused) {
      founderVideo.play().catch(() => {})
    } else {
      founderVideo.pause()
    }
    syncVideoUi()
  })

  soundBtn?.addEventListener('click', () => {
    founderVideo.muted = !founderVideo.muted
    if (!founderVideo.muted && founderVideo.paused) {
      founderVideo.play().catch(() => {})
    }
    syncVideoUi()
  })

  unmuteRestartBtn?.addEventListener('click', () => {
    founderVideo.currentTime = 0
    founderVideo.muted = false
    founderVideo.play().catch(() => {})
    syncVideoUi()
  })

  scrubber?.addEventListener('click', (e) => {
    const rect = scrubber.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    if (Number.isFinite(founderVideo.duration)) {
      founderVideo.currentTime = ratio * founderVideo.duration
    }
  })
}

// 7. MOTOR DE TARJETAS CINÉTICAS 3D (Elevación, Inclinación con Cursor y Giro 180° Táctil/Clic)
const kineticCards = document.querySelectorAll('.vo-kinetic-card')
const canHoverFine = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

kineticCards.forEach((card) => {
  const inner = card.querySelector('.lang-card-inner, .vo-kinetic-inner')

  const toggleFlip = (forceState) => {
    const next = typeof forceState === 'boolean' ? forceState : !card.classList.contains('is-flipped')
    card.classList.toggle('is-flipped', next)
    card.setAttribute('aria-expanded', next ? 'true' : 'false')
    if (inner) {
      inner.style.transform = next ? 'rotateY(180deg)' : ''
    }
  }

  // Clic o tap en cualquier parte de la tarjeta (excepto enlaces o botones de modal) gira la tarjeta
  card.addEventListener('click', (e) => {
    if (e.target.closest('a, [data-open-orient]')) return
    if (e.target.closest('[data-flip-close]')) {
      e.stopPropagation()
      toggleFlip(false)
      return
    }
    toggleFlip()
  })

  // Accesibilidad por teclado
  card.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target === card) {
      e.preventDefault()
      toggleFlip()
    }
  })

  // Inclinación y elevación 3D en tiempo real al mover el cursor
  if (canHoverFine && !reducedMotion && inner) {
    card.addEventListener('mousemove', (e) => {
      if (card.classList.contains('is-flipped')) return
      const rect = card.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) - 0.5
      const ny = ((e.clientY - rect.top) / rect.height) - 0.5
      const rotateX = (ny * -16).toFixed(2)
      const rotateY = (nx * 18).toFixed(2)
      inner.style.transform = `translateY(-12px) scale(1.025) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
    })

    card.addEventListener('mouseleave', () => {
      if (!card.classList.contains('is-flipped')) {
        inner.style.transform = ''
      }
    })
  }
})

// Botones de diagnóstico directo dentro del reverso de cada idioma
document.querySelectorAll('[data-open-orient]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    const lang = btn.getAttribute('data-open-orient')
    window.__voOpenOrientationModal?.({ lang })
  })
})

// 8. Conexión de todos los CTAs con los modales de conversión y Sales Engine
document.querySelector('#nav-cta-btn')?.addEventListener('click', () => {
  window.__voOpenOrientationModal?.()
})

document.querySelector('#b2c-primary-cta')?.addEventListener('click', () => {
  window.__voOpenOrientationModal?.()
})

document.querySelector('#b2c-pathfinder-trigger')?.addEventListener('click', () => {
  window.__voOpenPathfinderModal?.()
})

document.querySelector('#b2b-primary-cta')?.addEventListener('click', () => {
  window.__voOpenCorporateModal?.()
})

document.querySelector('#home-b2b-card-btn')?.addEventListener('click', () => {
  window.__voOpenCorporateModal?.()
})

document.querySelector('#home-diag-cta')?.addEventListener('click', () => {
  window.__voOpenOrientationModal?.()
})

document.querySelector('#home-pathfinder-cta')?.addEventListener('click', () => {
  window.__voOpenPathfinderModal?.()
})
