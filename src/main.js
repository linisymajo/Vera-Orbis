import './style.css'

const VO_LOGO = '/logo/Logo%20Vera%20Orbis%20recoloreado.png'

document.querySelector('#app').innerHTML = `

  <!-- =========================================
       HEADER & NAVEGACIÓN FLOTANTE
  ========================================== -->

  <header class="navbar" id="site-navbar">

    <a href="#inicio" class="logo" aria-label="Vera Orbis — We Speak the World">
      <img src="${VO_LOGO}" alt="Vera Orbis" class="navbar-logo-img" />
    </a>

    <!-- Enlaces de navegación de escritorio -->
    <nav class="nav-links" id="primary-nav" aria-label="Navegación principal">
      <a href="#metodo" class="nav-link">Cómo enseñamos</a>

      <!-- Selector / Menú de Idiomas -->
      <div class="nav-dropdown-wrap" id="languages-dropdown-wrap">
        <button
          type="button"
          class="nav-link nav-dropdown-btn"
          id="languages-menu-btn"
          aria-haspopup="true"
          aria-expanded="false"
          aria-label="Ver idiomas disponibles"
        >
          <span>Idiomas</span>
          <span class="dropdown-arrow" aria-hidden="true">▾</span>
        </button>
        <div class="nav-dropdown-menu" id="languages-dropdown-menu" role="menu">
          <a href="#ingles" class="nav-dropdown-item" role="menuitem">
            <span class="item-lang-name">Inglés</span>
            <span class="item-lang-sub">Global Commerce &amp; Communication</span>
          </a>
          <a href="#frances" class="nav-dropdown-item" role="menuitem">
            <span class="item-lang-name">Francés</span>
            <span class="item-lang-sub">Diplomatie, Culture &amp; Société</span>
          </a>
          <a href="#mandarin" class="nav-dropdown-item" role="menuitem">
            <span class="item-lang-name">Mandarín</span>
            <span class="item-lang-sub">Comunicación, Cultura &amp; Negocios</span>
          </a>
        </div>
      </div>

      <a href="#empresas" class="nav-link nav-link-b2b">
        <span>Para empresas</span>
        <span class="badge-b2b" aria-hidden="true">B2B</span>
      </a>
      <a href="#ecosistema" class="nav-link">Tu espacio</a>
      <a href="#newsletter" class="nav-link">Living Connections</a>
    </nav>

    <!-- Acciones de navegación -->
    <div class="nav-actions">
      <a href="/platform.html" class="platform-button" aria-label="Acceso a la plataforma de estudiantes">
        <span class="btn-text">Acceso Estudiantes</span>
        <span class="platform-btn-arrow" aria-hidden="true">→</span>
      </a>

      <a href="#contacto" class="nav-cta-button" id="nav-cta-btn">
        <span>Agendar diagnóstico</span>
      </a>

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
          <a href="#ingles" class="mobile-lang-chip">Inglés</a>
          <a href="#frances" class="mobile-lang-chip">Francés</a>
          <a href="#mandarin" class="mobile-lang-chip">Mandarín</a>
        </div>
      </div>

      <nav class="mobile-nav-links" aria-label="Navegación móvil">
        <a href="#metodo" class="mobile-nav-link">Cómo enseñamos</a>
        <a href="#programas" class="mobile-nav-link">Clases personales</a>
        <a href="#empresas" class="mobile-nav-link mobile-link-b2b">
          <span>Para empresas</span>
          <span class="badge-b2b">B2B</span>
        </a>
        <a href="#ecosistema" class="mobile-nav-link">Tu espacio &amp; Vera Voice</a>
        <a href="#newsletter" class="mobile-nav-link">Carta Living Connections</a>
        <a href="#contacto" class="mobile-nav-link">Contacto</a>
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


  <main id="main-content">

    <!-- =========================================
         HERO SECTION
    ========================================== -->

    <section id="inicio" class="hero">

      <div class="hero-ambient-glow" aria-hidden="true"></div>

      <div class="hero-content">

        <!-- Kicker -->
        <div class="hero-kicker-wrap">
          <span class="hero-kicker">
            LANGUAGE, CULTURE &amp; CONNECTION · WE SPEAK THE WORLD
          </span>
        </div>

        <!-- Titular principal -->
        <h1 class="hero-title">
          <span class="hero-line hero-line-1">Aprende un idioma para vivirlo,</span>
          <em class="hero-line hero-line-2">no solo para estudiarlo.</em>
        </h1>

        <!-- Subtítulo con mención explícita a los tres idiomas -->
        <p class="hero-description">
          Acompañamiento personalizado en inglés, francés y mandarín para personas y equipos que necesitan comunicarse con soltura, rigor y contexto cultural real.
        </p>

        <!-- =========================================
             SELECTOR DE PÚBLICO (TABS SIN EMOTICONES)
        ========================================== -->
        <div class="hero-audience-card" id="audience-selector">

          <!-- Botones de selección -->
          <div class="audience-toggle-bar" role="tablist" aria-label="Selecciona cómo te gustaría aprender">
            <button
              type="button"
              class="audience-tab is-active"
              id="tab-b2c"
              role="tab"
              aria-selected="true"
              aria-controls="panel-audience"
              data-target="b2c"
            >
              <span class="tab-label">Para personas y profesionales</span>
            </button>

            <button
              type="button"
              class="audience-tab"
              id="tab-b2b"
              role="tab"
              aria-selected="false"
              aria-controls="panel-audience"
              data-target="b2b"
            >
              <span class="tab-label">Para empresas y equipos</span>
              <span class="tab-pill">B2B</span>
            </button>
          </div>

          <!-- Contenido dinámico del panel -->
          <div class="audience-panel-content" id="panel-audience" role="tabpanel" aria-labelledby="tab-b2c">

            <!-- Estado Personas (B2C) -->
            <div class="audience-mode-wrap audience-mode-b2c" id="mode-b2c">
              <div class="mode-badge">
                <span class="badge-dot"></span>
                <span>APRENDIZAJE PERSONALIZADO 1 A 1</span>
              </div>
              <h2 class="mode-headline">
                Habla con tranquilidad y olvídate del miedo a equivocarte.
              </h2>
              <p class="mode-desc">
                Todos hemos sentido ese bloqueo al hablar en una reunión o durante un viaje. Diseñamos un camino pensado para ti, tus metas y tus tiempos en inglés, francés o mandarín, con mucha práctica y acompañamiento constante.
              </p>
              <div class="mode-actions">
                <a
                  href="https://wa.me/573123035708?text=Hola%20Vera%20Orbis.%20Quiero%20agendar%20mi%20sesi%C3%B3n%20de%20diagn%C3%B3stico%20individual."
                  class="btn-primary-action"
                  target="_blank"
                  rel="noopener noreferrer"
                  id="b2c-primary-cta"
                >
                  <span class="btn-text">Agendar mi diagnóstico sin costo</span>
                  <span class="btn-arrow" aria-hidden="true">→</span>
                  <span class="btn-shimmer" aria-hidden="true"></span>
                </a>
                <a href="#metodo" class="btn-secondary-action">
                  <span>Conocer cómo funciona</span>
                  <span class="btn-secondary-arrow" aria-hidden="true">↓</span>
                </a>
              </div>
            </div>

            <!-- Estado Empresas (B2B) -->
            <div class="audience-mode-wrap audience-mode-b2b" id="mode-b2b" hidden>
              <div class="mode-badge mode-badge-b2b">
                <span class="badge-dot badge-dot-b2b"></span>
                <span>EQUIPOS Y EMPRESAS</span>
              </div>
              <h2 class="mode-headline">
                Ayuda a tu equipo a comunicarse con soltura ante cualquier cliente.
              </h2>
              <p class="mode-desc">
                Tus colaboradores son excelentes en lo técnico, pero en llamadas con clientes del exterior, negociaciones con Asia o demos internacionales a veces se sienten inseguros. Trabajamos con situaciones reales de su trabajo para que ganen confianza en inglés, francés y mandarín comercial.
              </p>
              <div class="mode-actions">
                <a
                  href="https://wa.me/573123035708?text=Hola%20Vera%20Orbis.%20Me%20interesa%20pedir%20un%20diagn%C3%B3stico%20de%20comunicaci%C3%B3n%20para%20mi%20equipo."
                  class="btn-primary-action btn-b2b-action"
                  target="_blank"
                  rel="noopener noreferrer"
                  id="b2b-primary-cta"
                >
                  <span class="btn-text">Pedir diagnóstico para mi equipo (15 min)</span>
                  <span class="btn-arrow" aria-hidden="true">→</span>
                  <span class="btn-shimmer" aria-hidden="true"></span>
                </a>
                <a href="#empresas" class="btn-secondary-action">
                  <span>Ver programas para empresas</span>
                  <span class="btn-secondary-arrow" aria-hidden="true">↓</span>
                </a>
              </div>
            </div>

          </div>

        </div>

      </div>


      <!-- COMPOSICIÓN VISUAL EDITORIAL -->
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


      <!-- 3 PILARES (LIMPIOS, CERO EMOTICONES) -->
      <div class="hero-pillars-row" aria-label="Tres pilares de aprendizaje en Vera Orbis">

        <div class="hero-pillar-card">
          <div class="pillar-header">
            <span class="pillar-num">01</span>
            <span class="pillar-badge badge-orange">CONVERSACIÓN REAL</span>
          </div>
          <h3 class="pillar-title">Hablas desde el primer día</h3>
          <p class="pillar-text">
            La única forma de soltarse es practicando. Conversamos contigo desde el primer minuto en un espacio seguro donde equivocarse es parte del proceso.
          </p>
        </div>

        <div class="hero-pillar-card">
          <div class="pillar-header">
            <span class="pillar-num">02</span>
            <span class="pillar-badge badge-violet">PRÁCTICA CONSTANTE</span>
          </div>
          <h3 class="pillar-title">Vera Voice siempre disponible</h3>
          <p class="pillar-text">
            Tu compañera de conversación con inteligencia artificial dentro de la plataforma para practicar pronunciación y repasar a tu propio ritmo.
          </p>
        </div>

        <div class="hero-pillar-card">
          <div class="pillar-header">
            <span class="pillar-num">03</span>
            <span class="pillar-badge badge-turquoise">A TU MEDIDA</span>
          </div>
          <h3 class="pillar-title">A tu ritmo y con tus metas</h3>
          <p class="pillar-text">
            No seguimos un libro genérico. Adaptamos los temas y el vocabulario en inglés, francés o mandarín a lo que realmente necesitas para tu trabajo o tus viajes.
          </p>
        </div>

      </div>


      <!-- COORDENADAS DEL ESTUDIO -->
      <div class="coordinates-badge" role="note" aria-label="Sede: Bogotá">
        <span class="coord-city">BOGOTÁ</span>
        <span class="coord-divider" aria-hidden="true">·</span>
        <span class="coord-digits">4°42′N · 74°04′W</span>
        <span class="coord-divider" aria-hidden="true">·</span>
        <span class="coord-tagline">WE SPEAK THE WORLD</span>
        <span class="coord-beacon" aria-hidden="true"></span>
      </div>

    </section>


    <!-- =========================================
         SECCIÓN 01 — CÓMO ENSEÑAMOS
    ========================================== -->

    <section id="metodo" class="philosophy-section reveal-on-scroll">

      <div class="section-container">

        <div class="section-head text-center">
          <p class="section-label">
            <span class="label-number">01</span>
            <span class="label-dash">—</span>
            <span>CÓMO ENSEÑAMOS</span>
          </p>

          <h2 class="editorial-title">
            Aprender un idioma es aprender <span class="highlight-violet">a conectar.</span><br>
            <em class="highlight-serif">Every Person Matters.</em>
          </h2>

          <p class="section-lead max-lead-760">
            Aprender no se trata de memorizar listas que olvidas al día siguiente. Se trata de entender la cultura, de poder reírte, opinar y sentirte tú mismo cuando hablas con alguien de otro lugar.
          </p>
        </div>

        <!-- PASOS MANTRA -->
        <div class="mantra-cards-grid">
          <div class="mantra-step-card">
            <div class="mantra-tag">PASO 01</div>
            <h3 class="mantra-word">LEARN IT.</h3>
            <p class="mantra-desc">
              Comprende cómo funciona el idioma con explicaciones claras, útiles y aterrizadas a situaciones de la vida real.
            </p>
          </div>
          <div class="mantra-step-card">
            <div class="mantra-tag">PASO 02</div>
            <h3 class="mantra-word">LIVE IT.</h3>
            <p class="mantra-desc">
              Vívelo a través de temas de actualidad, anécdotas culturales, música y conversaciones sobre lo que a ti te interesa.
            </p>
          </div>
          <div class="mantra-step-card">
            <div class="mantra-tag">PASO 03</div>
            <h3 class="mantra-word">SPEAK IT.</h3>
            <p class="mantra-desc">
              Suelta la voz. Practicamos la conversación de forma constante para que hablar en otro idioma se sienta natural y espontáneo.
            </p>
          </div>
        </div>

        <!-- COMPARATIVA CON LA ACADEMIA TRADICIONAL -->
        <div class="contrast-container">

          <div class="contrast-header">
            <span class="contrast-kicker">NUESTRA DIFERENCIA</span>
            <h3 class="contrast-title">Por qué el modelo tradicional aburre y cómo lo hacemos diferente</h3>
          </div>

          <div class="contrast-grid">

            <!-- Columna Tradicional -->
            <div class="contrast-card card-traditional">
              <div class="contrast-col-top">
                <span class="contrast-badge badge-traditional">ACADEMIA TRADICIONAL</span>
                <h4>El método de siempre</h4>
              </div>

              <ul class="contrast-list">
                <li>
                  <span class="icon-fail" aria-hidden="true">&times;</span>
                  <div>
                    <strong>Reglas de memoria y ejercicios repetitivos:</strong>
                    <p>Horas rellenando fotocopias que poco te ayudan a la hora de tener una conversación real.</p>
                  </div>
                </li>
                <li>
                  <span class="icon-fail" aria-hidden="true">&times;</span>
                  <div>
                    <strong>Salones llenos donde casi nadie habla:</strong>
                    <p>Grupos grandes donde el profesor habla la mayor parte del tiempo y da pena equivocarse.</p>
                  </div>
                </li>
                <li>
                  <span class="icon-fail" aria-hidden="true">&times;</span>
                  <div>
                    <strong>Hablar después de meses de teoría:</strong>
                    <p>Se pospone la conversación hasta que "sepas suficiente", creando más inseguridad.</p>
                  </div>
                </li>
                <li>
                  <span class="icon-fail" aria-hidden="true">&times;</span>
                  <div>
                    <strong>Exámenes que te juzgan por cada error:</strong>
                    <p>Se evalúa el error gramatical en vez de celebrar que logres comunicarte con éxito.</p>
                  </div>
                </li>
              </ul>
            </div>

            <!-- Columna Vera Orbis -->
            <div class="contrast-card card-vera-orbis">
              <div class="contrast-col-top">
                <span class="contrast-badge badge-vera">EXPERIENCIA VERA ORBIS</span>
                <h4>Acompañamiento cercano y real</h4>
              </div>

              <ul class="contrast-list">
                <li>
                  <span class="icon-success" aria-hidden="true">•</span>
                  <div>
                    <strong>Temas y conversaciones que te interesan:</strong>
                    <p>Materiales actuales seleccionados para tu vida personal, tus gustos y tu carrera profesional.</p>
                  </div>
                </li>
                <li>
                  <span class="icon-success" aria-hidden="true">•</span>
                  <div>
                    <strong>Acompañamiento 1 a 1 y grupos pequeños:</strong>
                    <p>Atención directa de tu profesor. Aquí cada persona cuenta (Every Person Matters).</p>
                  </div>
                </li>
                <li>
                  <span class="icon-success" aria-hidden="true">•</span>
                  <div>
                    <strong>Hablas desde tu primera sesión:</strong>
                    <p>La conversación es el centro de todo. Pierdes el miedo a hablar desde el primer día.</p>
                  </div>
                </li>
                <li>
                  <span class="icon-success" aria-hidden="true">•</span>
                  <div>
                    <strong>Progreso claro y apoyo constante:</strong>
                    <p>Seguimiento semanal constructivo, metas alcanzables y práctica cuando quieras con Vera Voice.</p>
                  </div>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </div>

    </section>


    <!-- =========================================
         SECCIÓN 02 — EMPRESAS & EQUIPOS (B2B)
    ========================================== -->

    <section id="empresas" class="b2b-section reveal-on-scroll">

      <div class="section-container">

        <div class="b2b-badge-row">
          <span class="b2b-pill">EMPRESAS Y EQUIPOS</span>
          <span class="b2b-sublabel">COMUNICACIÓN GLOBAL</span>
        </div>

        <div class="b2b-header-grid">
          <div>
            <h2 class="editorial-title b2b-title">
              La confianza que tu equipo necesita para <span class="highlight-orange">hablar con el mundo.</span>
            </h2>
          </div>
          <div>
            <p class="section-lead b2b-lead">
              Muchas veces las barreras de un equipo en videollamadas con clientes internacionales o negociaciones con Asia no tienen que ver con su talento técnico, sino con la inseguridad de no encontrar la palabra adecuada en el momento justo.
            </p>
          </div>
        </div>

        <!-- SITUACIONES QUE RESOLVEMOS (SIN EMOTICONES) -->
        <div class="frictions-panel">
          <h3 class="frictions-heading">Situaciones del día a día que ayudamos a resolver:</h3>

          <div class="frictions-grid">

            <div class="friction-card">
              <span class="friction-num">01</span>
              <h4>Llamadas con sedes globales y socios en Asia</h4>
              <p>
                Profesionales brillantes que dominan su área pero dudan al intervenir en videollamadas en inglés, francés o coordinar acuerdos comerciales con proveedores internacionales.
              </p>
            </div>

            <div class="friction-card">
              <span class="friction-num">02</span>
              <h4>Presentaciones y demostraciones de producto</h4>
              <p>
                Equipos que necesitan explicar demos técnicas, presentar propuestas comerciales o liderar talleres con claridad, buen tono y tranquilidad.
              </p>
            </div>

            <div class="friction-card">
              <span class="friction-num">03</span>
              <h4>Tono y protocolo de negocios</h4>
              <p>
                Redacción de correos claros, etiqueta comercial y negociación cotidiana con personas de diferentes culturas sin caer en malentendidos.
              </p>
            </div>

          </div>
        </div>

        <!-- 3 FORMATOS DESTACADOS PARA EMPRESAS -->
        <div class="b2b-formats-grid">

          <!-- Formato 1: Bootcamp para equipos -->
          <article class="format-card format-bootcamp">
            <div class="format-glow" aria-hidden="true"></div>
            <div class="format-meta">
              <span class="format-tag">PARA EQUIPOS DE TRABAJO</span>
              <span class="format-duration">8 SEMANAS · 16 SESIONES</span>
            </div>

            <div class="format-body">
              <h3 class="format-title">Bootcamp de Fluidez en Equipo</h3>
              <p class="format-audience">
                <strong>Para:</strong> Equipos de tecnología, producto, ventas internacionales, operaciones y soporte al cliente.
              </p>
              <p class="format-description">
                Práctica en grupos reducidos de máximo 6 personas en inglés o francés. Simulamos reuniones reales, standups, manejo de preguntas difíciles y redacción de minutas de trabajo para que ganen seguridad juntos.
              </p>

              <div class="format-deliverables">
                <span class="deliverable-item">• Diagnóstico inicial de nivel para cada colaborador</span>
                <span class="deliverable-item">• Simulaciones con retroalimentación personalizada de pronunciación</span>
                <span class="deliverable-item">• Acceso 24/7 a Vera Voice para que practiquen en cualquier momento</span>
                <span class="deliverable-item">• Reportes claros de avance para líderes de equipo y People</span>
              </div>
            </div>

            <div class="format-footer">
              <a
                href="https://wa.me/573123035708?text=Hola%20Vera%20Orbis.%20Quiero%20conocer%20m%C3%A1s%20sobre%20el%20Bootcamp%20para%20equipos."
                class="format-cta-btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Preguntar por el Bootcamp para equipos</span>
                <span class="cta-arrow" aria-hidden="true">→</span>
              </a>
            </div>
          </article>


          <!-- Formato 2: Aceleración 1 a 1 para Líderes -->
          <article class="format-card format-executive">
            <div class="format-glow" aria-hidden="true"></div>
            <div class="format-meta">
              <span class="format-tag format-tag-gold">LÍDERES Y FOUNDERS</span>
              <span class="format-duration">INDIVIDUAL Y PRIVADO</span>
            </div>

            <div class="format-body">
              <h3 class="format-title">Aceleración 1 a 1 para Líderes</h3>
              <p class="format-audience">
                <strong>Para:</strong> Founders, directores, CEOs y líderes que representan a su empresa ante audiencias de otros países.
              </p>
              <p class="format-description">
                Acompañamiento individual, confidencial y flexible. Trabajamos directamente sobre tus presentaciones reales, preparación para rondas de inversión, conferencias y negociaciones estratégicas en inglés o francés.
              </p>

              <div class="format-deliverables">
                <span class="deliverable-item">• Práctica directa sobre tus presentaciones y discursos reales</span>
                <span class="deliverable-item">• Preparación para responder preguntas imprevistas con soltura</span>
                <span class="deliverable-item">• Pulido de pronunciación y entonación ejecutiva natural</span>
                <span class="deliverable-item">• Horarios flexibles adaptados a tu agenda</span>
              </div>
            </div>

            <div class="format-footer">
              <a
                href="https://wa.me/573123035708?text=Hola%20Vera%20Orbis.%20Quiero%20informaci%C3%B3n%20sobre%20las%20sesiones%201%20a%201%20para%20liderazgo."
                class="format-cta-btn format-cta-gold"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Consultar sobre sesiones individuales</span>
                <span class="cta-arrow" aria-hidden="true">→</span>
              </a>
            </div>
          </article>


          <!-- Formato 3: Mandarín Comercial & Protocolo de Negocios -->
          <article class="format-card format-mandarin-b2b">
            <div class="format-glow" aria-hidden="true"></div>
            <div class="format-meta">
              <span class="format-tag format-tag-orange">COMERCIO EXTERIOR &amp; ASIA</span>
              <span class="format-duration">PROGRAMA A LA MEDIDA</span>
            </div>

            <div class="format-body">
              <h3 class="format-title">Mandarín Comercial &amp; Protocolo</h3>
              <p class="format-audience">
                <strong>Para:</strong> Empresas, equipos de compras, logística, comercio exterior y profesionales con socios en Asia o cadenas de suministro globales.
              </p>
              <p class="format-description">
                Desarrolla soltura en el trato directo con proveedores y fabricantes en Asia. Combinamos vocabulario comercial y logístico con comprensión del protocolo cultural de negocios (guanxi, etiqueta en reuniones y resolución de contingencias).
              </p>

              <div class="format-deliverables">
                <span class="deliverable-item">• Vocabulario práctico de compras, negociación y comercio internacional</span>
                <span class="deliverable-item">• Protocolo cultural para reuniones de negocios y visitas a fábricas</span>
                <span class="deliverable-item">• Expresiones clave para evitar malentendidos en la cadena de suministro</span>
                <span class="deliverable-item">• Sesiones grupales o individuales adaptadas a la operación de tu empresa</span>
              </div>
            </div>

            <div class="format-footer">
              <a
                href="https://wa.me/573123035708?text=Hola%20Vera%20Orbis.%20Quiero%20informaci%C3%B3n%20sobre%20el%20programa%20de%20Mandar%C3%ADn%20Comercial%20para%20empresas."
                class="format-cta-btn format-cta-orange"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Consultar sobre Mandarín Comercial</span>
                <span class="cta-arrow" aria-hidden="true">→</span>
              </a>
            </div>
          </article>

        </div>

        <!-- BANNER DE CONTACTO EMPRESARIAL -->
        <div class="b2b-action-banner">
          <div class="banner-text">
            <h3>¿Quieres que hablemos sobre tu equipo?</h3>
            <p>
              Cuéntanos qué necesita tu empresa en inglés, francés o mandarín comercial y te mostramos cómo podemos armar un programa práctico en una llamada corta de 15 minutos.
            </p>
          </div>
          <div class="banner-action">
            <a
              href="https://wa.me/573123035708?text=Hola%20Vera%20Orbis.%20Quiero%20agendar%20una%20llamada%20de%2015%20minutos%20para%20mi%20equipo."
              class="banner-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Agendar llamada de 15 minutos</span>
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

      </div>

    </section>


    <!-- =========================================
         SECCIÓN 03 — CLASES PERSONALES (B2C)
    ========================================== -->

    <section id="programas" class="programs-section reveal-on-scroll">

      <div class="section-container">

        <div class="section-head text-center">
          <p class="section-label">
            <span class="label-number">03</span>
            <span class="label-dash">—</span>
            <span>CLASES PERSONALES</span>
          </p>

          <h2 class="editorial-title">
            Inglés, Francés y Mandarín <br>
            <span class="highlight-turquoise">hechos a tu medida.</span>
          </h2>

          <p class="section-lead max-lead-760">
            Aprender no tiene por qué ser aburrido ni rígido. Diseñamos cada clase según lo que quieras lograr: viajar con tranquilidad, conseguir un mejor empleo o desenvolverte en los negocios internacionales.
          </p>
        </div>

        <!-- REJILLA DE 3 IDIOMAS PRINCIPALES -->
        <div class="languages-three-grid">

          <!-- INGLÉS -->
          <article class="lang-showcase-card english-theme" id="ingles">
            <div class="lang-watermark" aria-hidden="true">EN</div>
            <div class="lang-card-header">
              <span class="lang-code-pill">01 / GLOBAL</span>
              <span class="lang-standard">A1 A C2</span>
            </div>

            <div class="lang-card-body">
              <h3 class="lang-card-title">English for the World</h3>
              <p class="lang-card-summary">
                Para desenvolverte en el trabajo, viajar con tranquilidad, entender contenidos sin subtítulos y hablar con personas de cualquier lugar con naturalidad.
              </p>

              <div class="lang-features-list">
                <div class="lang-feature">
                  <strong>Conversación cotidiana:</strong> Habla de forma espontánea y sin temor a quedarte en blanco.
                </div>
                <div class="lang-feature">
                  <strong>Trabajo y entrevistas:</strong> Prepárate para reuniones laborales y procesos de selección.
                </div>
                <div class="lang-feature">
                  <strong>Preparación para pruebas internacionales:</strong> Entrenamiento intensivo de habilidades y simulacros prácticos para que rindas con éxito exámenes como IELTS o TOEFL ante las entidades examinadoras oficiales.
                </div>
              </div>
            </div>

            <div class="lang-card-footer">
              <a
                href="https://wa.me/573123035708?text=Hola%20Vera%20Orbis.%20Quiero%20aprender%20ingl%C3%A9s."
                class="lang-cta-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Quiero aprender inglés</span>
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </article>


          <!-- FRANCÉS -->
          <article class="lang-showcase-card french-theme" id="frances">
            <div class="lang-watermark" aria-hidden="true">FR</div>
            <div class="lang-card-header">
              <span class="lang-code-pill">02 / FRANCOFONÍA</span>
              <span class="lang-standard">DELF Y DALF</span>
            </div>

            <div class="lang-card-body">
              <h3 class="lang-card-title">Le Parcours Français</h3>
              <p class="lang-card-summary">
                Descubre la belleza y la precisión del francés. Te ayudamos con la pronunciación, la comprensión cultural y la confianza para viajar, estudiar o mudarte a Francia o Canadá.
              </p>

              <div class="lang-features-list">
                <div class="lang-feature">
                  <strong>Pronunciación y fonética:</strong> Pierde el miedo a los sonidos nasales con ejercicios sencillos.
                </div>
                <div class="lang-feature">
                  <strong>Cultura y conversación:</strong> Aprende a expresar tus puntos de vista con soltura y elegancia.
                </div>
                <div class="lang-feature">
                  <strong>Preparación estratégica para exámenes oficiales (DELF, DALF):</strong> Te preparamos con rigor para que alcances el puntaje o nivel que necesitas al presentar tus pruebas ante las entidades oficiales.
                </div>
              </div>
            </div>

            <div class="lang-card-footer">
              <a
                href="https://wa.me/573123035708?text=Hola%20Vera%20Orbis.%20Quiero%20aprender%20franc%C3%A9s."
                class="lang-cta-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Quiero aprender francés</span>
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </article>


          <!-- MANDARÍN -->
          <article class="lang-showcase-card mandarin-theme" id="mandarin">
            <div class="lang-watermark" aria-hidden="true">中</div>
            <div class="lang-card-header">
              <span class="lang-code-pill">03 / ASIA &amp; NEGOCIOS</span>
              <span class="lang-standard">HSK 1 A 6</span>
            </div>

            <div class="lang-card-body">
              <h3 class="lang-card-title">Mandarín: Comunicación, Cultura &amp; Negocios</h3>
              <p class="lang-card-summary">
                Pensamiento directo y soltura comunicativa desde las primeras sesiones. Comprensión fonética (pinyin), estructuras reales de conversación e inmersión cultural.
              </p>

              <div class="lang-features-list">
                <div class="lang-feature">
                  <strong>Comunicación cotidiana:</strong> Pronunciación precisa (tonos y pinyin) y frases esenciales para desenvolverte con naturalidad.
                </div>
                <div class="lang-feature">
                  <strong>Cultura y relaciones comerciales:</strong> Protocolo de negocios, costumbres de cortesía y negociación efectiva con socios de Asia.
                </div>
                <div class="lang-feature">
                  <strong>Preparación estratégica para exámenes oficiales (HSK):</strong> Te preparamos con rigor para que alcances el puntaje o nivel que necesitas al presentar tus pruebas HSK ante las entidades oficiales (sin emitir certificados propios).
                </div>
              </div>
            </div>

            <div class="lang-card-footer">
              <a
                href="https://wa.me/573123035708?text=Hola%20Vera%20Orbis.%20Quiero%20aprender%20mandar%C3%ADn."
                class="lang-cta-link lang-cta-orange"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Quiero aprender mandarín</span>
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </article>

        </div>


        <!-- RUTAS SEGÚN TU META -->
        <div class="objectives-section">
          <div class="objectives-head">
            <span class="objectives-kicker">RUTAS CLARAS</span>
            <h3 class="objectives-title">Elige el enfoque que mejor se adapte a ti</h3>
          </div>

          <div class="objectives-grid">

            <div class="objective-card">
              <div class="objective-num">01</div>
              <h4>Fluidez cotidiana y social</h4>
              <p>Para hablar sin pena, viajar con tranquilidad y hacer amigos en cualquier país.</p>
            </div>

            <div class="objective-card">
              <div class="objective-num">02</div>
              <h4>Crecimiento profesional</h4>
              <p>Prepárate para entrevistas laborales, ascensos y reuniones de trabajo internacionales.</p>
            </div>

            <div class="objective-card">
              <div class="objective-num">03</div>
              <h4>Preparación para exámenes oficiales</h4>
              <p>Entrenamiento intensivo de habilidades y acompañamiento estratégico para que rindas y apruebes pruebas oficiales como DELF, DALF, HSK, IELTS o TOEFL ante las entidades correspondientes.</p>
            </div>

            <div class="objective-card">
              <div class="objective-num">04</div>
              <h4>Viajes y mudanzas</h4>
              <p>Todo lo necesario para desenvolverte en tu nuevo destino si vas a estudiar o vivir afuera.</p>
            </div>

          </div>

          <!-- NOTA DE TRANSPARENCIA PEDAGÓGICA -->
          <div class="transparency-note">
            <p>
              <strong>Transparencia pedagógica:</strong> En Vera Orbis no emitimos ni otorgamos certificaciones oficiales directas. Nuestra labor es el entrenamiento intensivo, la preparación estratégica y el acompañamiento riguroso para que alcances el puntaje y nivel que necesitas al rendir tus exámenes ante las entidades examinadoras oficiales (DELF, DALF, HSK, IELTS, TOEFL).
            </p>
          </div>
        </div>

      </div>

    </section>


    <!-- =========================================
         SECCIÓN 04 — TU ESPACIO EN VERA ORBIS
    ========================================== -->

    <section id="ecosistema" class="ecosystem-section reveal-on-scroll">

      <div class="section-container">

        <div class="section-head text-center">
          <p class="section-label">
            <span class="label-number">04</span>
            <span class="label-dash">—</span>
            <span>CÓMO APRENDES CON NOSOTROS</span>
          </p>

          <h2 class="editorial-title">
            Todo lo que necesitas para avanzar, <br>
            <span class="highlight-violet">en un solo lugar.</span>
          </h2>

          <p class="section-lead max-lead-760">
            No te dejamos solo entre una clase y otra. Cuentas con un profesor dedicado, herramientas para practicar cuando quieras y una plataforma donde ves tu progreso día a día.
          </p>
        </div>


        <!-- TRES PILARES -->
        <div class="ecosystem-pillars-grid">

          <!-- Pilar 1 -->
          <div class="ecosystem-pillar-card">
            <div class="eco-pillar-num">01 / ACOMPAÑAMIENTO</div>
            <h3>Tu profesor personal</h3>
            <p>
              Profesores cercanos, pacientes y con experiencia que preparan cada sesión pensando en ti y te corrigen de forma positiva para que nunca sientas pena de hablar.
            </p>
            <span class="eco-highlight">Atención individual que de verdad te escucha</span>
          </div>

          <!-- Pilar 2 -->
          <div class="ecosystem-pillar-card eco-card-featured">
            <div class="eco-pillar-num">02 / PRÁCTICA 24/7</div>
            <h3>Vera Voice (IA conversacional)</h3>
            <p>
              Una compañera de práctica disponible las 24 horas en tu plataforma. Puedes hablar con ella para repasar y pulir tu pronunciación sin ninguna presión.
            </p>
            <span class="eco-highlight">Practica cuando quieras y a tu ritmo</span>
          </div>

          <!-- Pilar 3 -->
          <div class="ecosystem-pillar-card">
            <div class="eco-pillar-num">03 / PLATAFORMA</div>
            <h3>Tu plataforma de estudiante</h3>
            <p>
              Revisa tus horarios de clase, consulta los comentarios de tu profesor, accede a tus lecturas y mira cómo vas avanzando con tu Language Passport.
            </p>
            <span class="eco-highlight">Control total de tu aprendizaje</span>
          </div>

        </div>


        <!-- MUESTRA DEL PASAPORTE LINGÜÍSTICO -->
        <div class="passport-showcase-wrap">

          <div class="passport-intro">
            <span class="passport-kicker">TU PROGRESO VISIBLE</span>
            <h3 class="passport-heading">Language Passport · VO Edition</h3>
            <p class="passport-lead">
              Tu credencial digital donde se registran tus avances, horas de conversación, sellos académicos y los niveles que vas alcanzando a lo largo del camino.
            </p>
          </div>

          <div class="passport-tilt-container" id="passport-tilt-wrap">

            <div class="experience-main-card passport-3d-card" id="passport-card" tabindex="0" role="region" aria-label="Language Passport Credencial interactiva">

              <div class="passport-glare" id="passport-glare" aria-hidden="true"></div>

              <div class="card-top">
                <span class="passport-authority">
                  <span class="passport-crest">VO</span>
                  VERA ORBIS
                </span>
                <span class="passport-id-badge">ESTUDIANTE Nº 001</span>
              </div>

              <!-- CHIP LINGÜÍSTICO -->
              <div class="passport-chip-row" aria-hidden="true">
                <svg class="biometric-chip" viewBox="0 0 44 32" width="44" height="32" fill="none">
                  <rect x="1" y="1" width="42" height="30" rx="4" stroke="#FFC83D" stroke-width="1.5" fill="rgba(255, 200, 61, 0.1)"/>
                  <path d="M1 11 H16 M1 21 H16 M28 11 H43 M28 21 H43 M16 6 V26 M28 6 V26" stroke="#FFC83D" stroke-width="1.2" stroke-linecap="round"/>
                  <rect x="16" y="9" width="12" height="14" rx="2" stroke="#FFC83D" stroke-width="1.2" fill="rgba(255, 200, 61, 0.25)"/>
                </svg>
                <span class="passport-doc-type">CREDENCIAL DE APRENDIZAJE</span>
              </div>

              <div class="passport-center-emblem" aria-hidden="true">
                <div class="emblem-inner">
                  <span>VO</span>
                </div>
              </div>

              <div class="passport-content">
                <p class="passport-label">
                  PASAPORTE LINGÜÍSTICO · VO EDITION
                </p>
                <h3>
                  Tu progreso.<br>
                  <span>A tu ritmo.</span>
                </h3>
                <p>
                  Un documento digital que acompaña cada avance, tus sesiones completadas y tus hitos de conversación.
                </p>

                <!-- SELLOS DE PRÁCTICA -->
                <div class="passport-stamps-preview" aria-hidden="true">
                  <div class="visa-stamp stamp-turquoise">
                    <span class="stamp-arch">VERA ORBIS</span>
                    <span class="stamp-core">APRENDE</span>
                    <span class="stamp-sub">DISCE</span>
                  </div>
                  <div class="visa-stamp stamp-purple">
                    <span class="stamp-arch">NIVEL</span>
                    <span class="stamp-core">CEFR B2</span>
                    <span class="stamp-sub">VIVE</span>
                  </div>
                  <div class="visa-stamp stamp-gold">
                    <span class="stamp-arch">FLUÍDEZ</span>
                    <span class="stamp-core">HABLA</span>
                    <span class="stamp-sub">LOQUERE</span>
                  </div>
                </div>
              </div>

              <!-- BOTÓN PARA ABRIR LA DEMO -->
              <div class="passport-action-bar">
                <button type="button" class="passport-demo-btn" id="passport-preview-trigger" aria-haspopup="dialog" aria-expanded="false">
                  <span>Ver credencial de ejemplo</span>
                  <span class="btn-micro-arrow" aria-hidden="true">→</span>
                </button>
              </div>

              <!-- FRANJA MRZ -->
              <div class="passport-mrz-strip" aria-hidden="true">
                <p>P&lt;VORBIS&lt;&lt;STUDENT&lt;001&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</p>
                <p>VO001COL8510206M2610207ENG&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;04</p>
              </div>

              <div class="card-bottom">
                <span>LEARN IT</span>
                <span class="bullet" aria-hidden="true">·</span>
                <span>LIVE IT</span>
                <span class="bullet" aria-hidden="true">·</span>
                <span>SPEAK IT</span>
              </div>

            </div>

          </div>

        </div>

      </div>

    </section>


    <!-- =========================================
         SECCIÓN 05 — LIVING CONNECTIONS
    ========================================== -->

    <section id="newsletter" class="newsletter-section reveal-on-scroll">

      <div class="section-container">

        <div class="newsletter-editorial-card">

          <div class="newsletter-decor-glow" aria-hidden="true"></div>

          <div class="newsletter-grid">

            <div class="newsletter-left">
              <div class="newsletter-meta">
                <span class="newsletter-edition">CARTA SEMANAL</span>
                <span class="newsletter-freq">CADA JUEVES</span>
              </div>

              <h2 class="newsletter-headline">
                Living Connections.
              </h2>
              <p class="newsletter-subheadline">
                Una reflexión breve y cercana sobre el idioma, la cultura y cómo expresarte mejor.
              </p>

              <p class="newsletter-text">
                Cada semana te compartimos ideas sencillas sobre comunicación, cómo cambia tu forma de pensar cuando aprendes otro idioma y consejos prácticos para hablar con más soltura.
              </p>

              <div class="newsletter-themes">
                <div class="theme-pill">• Curiosidades reales sobre cómo pensamos en otro idioma</div>
                <div class="theme-pill">• Cómo sonar natural en correos en inglés sin parecer frío</div>
                <div class="theme-pill">• Anécdotas culturales y consejos para comunicarte mejor</div>
              </div>
            </div>

            <div class="newsletter-right">

              <div class="newsletter-form-container" id="newsletter-form-box">
                <div class="form-header">
                  <span class="form-seal" aria-hidden="true">VO</span>
                  <h3>Recibe Living Connections</h3>
                  <p>Déjanos tu correo y acompáñanos cada semana.</p>
                </div>

                <form class="newsletter-form" id="newsletter-subscription-form" novalidate>
                  <div class="form-group">
                    <label for="newsletter-email" class="visually-hidden">Tu correo electrónico</label>
                    <div class="input-wrap">
                      <input
                        type="email"
                        id="newsletter-email"
                        name="email"
                        class="newsletter-input"
                        placeholder="tu.correo@ejemplo.com"
                        required
                        autocomplete="email"
                      />
                    </div>
                    <span class="input-error-msg" id="newsletter-error" hidden>Por favor ingresa un correo válido.</span>
                  </div>

                  <button type="submit" class="newsletter-submit-btn" id="newsletter-submit-btn">
                    <span class="btn-text">Quiero suscribirme</span>
                    <span class="btn-arrow" aria-hidden="true">→</span>
                  </button>

                  <p class="form-privacy-note">
                    Sin spam. Puedes cancelar tu suscripción con un solo clic cuando quieras.
                  </p>
                </form>

                <!-- Estado de confirmación humano -->
                <div class="newsletter-success-state" id="newsletter-success" hidden>
                  <h4>¡Qué bueno tenerte aquí!</h4>
                  <p>
                    Ya registramos tu correo. Cada jueves recibirás nuestra carta semanal para seguir aprendiendo juntos.
                  </p>
                  <div class="success-quote">
                    <em>«Language is culture in motion. Gracias por acompañarnos.»</em>
                  </div>
                  <button type="button" class="btn-success-reset" id="newsletter-reset-btn">
                    Suscribir otro correo
                  </button>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </section>


    <!-- =========================================
         SECCIÓN 06 — CONTACTO
    ========================================== -->

    <section id="contacto" class="contact-section reveal-on-scroll">

      <div class="contact-ambient" aria-hidden="true"></div>

      <div class="contact-inner">

        <p class="section-label">
          <span class="label-number">06</span>
          <span class="label-dash">—</span>
          <span>EMPECEMOS A CONVERSAR</span>
        </p>

        <h2 class="contact-title">
          El primer paso es tener<br>
          <span>una buena conversación.</span>
        </h2>

        <p class="contact-intro">
          Cuéntanos qué quieres lograr. Ya sea que busques clases para ti o para tu equipo de trabajo en inglés, francés o mandarín, estamos aquí para escucharte y encontrar la mejor opción juntos.
        </p>

        <div class="contact-actions-group">

          <!-- Botón Personas -->
          <a
            href="https://wa.me/573123035708?text=Hola%20Vera%20Orbis.%20Quiero%20conocer%20las%20opciones%20de%20clases%20personales."
            class="contact-primary-btn"
            target="_blank"
            rel="noopener noreferrer"
            id="start-journey-btn"
          >
            <span class="btn-badge">CLASES PERSONALES</span>
            <span class="btn-text">Hablar con un asesor</span>
            <span class="btn-arrow" aria-hidden="true">→</span>
            <span class="btn-glow" aria-hidden="true"></span>
          </a>

          <!-- Botón Empresas -->
          <a
            href="https://wa.me/573123035708?text=Hola%20Vera%20Orbis.%20Quiero%20pedir%20informaci%C3%B3n%20para%20mi%20empresa%20o%20equipo."
            class="contact-b2b-btn"
            target="_blank"
            rel="noopener noreferrer"
            id="contact-b2b-cta"
          >
            <span class="btn-badge btn-badge-orange">EMPRESAS</span>
            <span class="btn-text">Información para equipos</span>
            <span class="btn-arrow" aria-hidden="true">→</span>
          </a>

          <!-- Enlace directo WhatsApp -->
          <a
            href="https://wa.me/573123035708?text=Hola.%20Quiero%20hablar%20con%20un%20asesor%20acad%C3%A9mico%20de%20Vera%20Orbis."
            class="contact-whatsapp-btn"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Escríbenos por WhatsApp"
          >
            <svg class="whatsapp-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.04 20.16C10.56 20.16 9.11 19.76 7.85 19.02L7.55 18.84L4.44 19.66L5.27 16.63L5.07 16.31C4.26 15.02 3.81 13.49 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM8.83 7.35C8.63 7.35 8.44 7.36 8.28 7.64C8.07 7.99 7.49 8.54 7.49 9.65C7.49 10.76 8.3 11.83 8.41 11.98C8.53 12.14 9.99 14.38 12.23 15.35C12.76 15.58 13.18 15.72 13.5 15.82C14.03 15.99 14.52 15.96 14.9 15.91C15.33 15.84 16.22 15.37 16.41 14.84C16.6 14.31 16.6 13.86 16.54 13.76C16.48 13.66 16.34 13.6 16.1 13.48C15.86 13.36 14.68 12.78 14.46 12.7C14.24 12.62 14.08 12.58 13.92 12.82C13.76 13.06 13.3 13.6 13.16 13.76C13.02 13.92 12.88 13.94 12.64 13.82C12.4 13.7 11.63 13.45 10.72 12.64C10.01 12.01 9.53 11.23 9.39 10.99C9.25 10.75 9.37 10.62 9.49 10.5C9.6 10.39 9.74 10.21 9.86 10.07C9.98 9.93 10.02 9.83 10.1 9.67C10.18 9.51 10.14 9.37 10.08 9.25C10.02 9.13 9.56 8 9.37 7.53C9.18 7.07 8.99 7.13 8.83 7.35Z"/>
            </svg>
            <span>Escríbenos directamente por WhatsApp: +57 312 303 5708</span>
          </a>

        </div>

      </div>

    </section>

  </main>


  <!-- =========================================
       MODAL DEMO DEL PASAPORTE (LIGHTBOX)
  ========================================== -->

  <div id="passport-modal" class="passport-modal" role="dialog" aria-modal="true" aria-labelledby="modal-student-name" hidden>
    <div class="passport-modal-backdrop" id="passport-modal-close-backdrop"></div>
    <div class="passport-modal-card">

      <button type="button" class="passport-modal-close" id="passport-modal-close-btn" aria-label="Cerrar credencial">&times;</button>

      <div class="modal-card-header">
        <div class="modal-seal" aria-hidden="true">VO</div>
        <div>
          <span class="modal-kicker">VERA ORBIS · DOCUMENTO DE IDENTIDAD LINGÜÍSTICA</span>
          <h3 id="modal-student-name">Alex Mercer <span class="modal-id">/ Estudiante Nº 001</span></h3>
        </div>
      </div>

      <div class="modal-card-body">

        <div class="modal-data-grid">
          <div class="modal-data-item">
            <span class="modal-data-label">IDIOMA DE ESTUDIO</span>
            <strong class="modal-data-value">Inglés (Fluidez Avanzada)</strong>
          </div>
          <div class="modal-data-item">
            <span class="modal-data-label">NIVEL ALCANZADO</span>
            <strong class="modal-data-value highlight-level">B2 — Operativo / Vantage</strong>
          </div>
          <div class="modal-data-item">
            <span class="modal-data-label">EXPEDIENTE</span>
            <span class="modal-data-value monospace-val">VO-2026-BOG-001</span>
          </div>
          <div class="modal-data-item">
            <span class="modal-data-label">ESTADO ACADÉMICO</span>
            <span class="modal-data-value status-active-pill">• En trayecto activo</span>
          </div>
        </div>

        <div class="modal-stamps-row" aria-hidden="true">
          <div class="modal-stamp stamp-turquoise">
            <span>VERA ORBIS</span>
            <strong>APRENDE</strong>
            <small>BOGOTÁ</small>
          </div>
          <div class="modal-stamp stamp-purple">
            <span>NIVEL</span>
            <strong>VIVE</strong>
            <small>CEFR B2</small>
          </div>
          <div class="modal-stamp stamp-gold">
            <span>COMUNICACIÓN</span>
            <strong>HABLA</strong>
            <small>FLUIDEZ</small>
          </div>
        </div>

        <p class="modal-footnote">
          El Language Passport es una herramienta pedagógica interna de seguimiento de progreso y práctica continua de Vera Orbis. Refleja tus avances formativos hacia el marco CEFR y tu preparación para exámenes oficiales ante las entidades correspondientes.
        </p>

      </div>

      <div class="modal-card-footer">
        <a href="/platform.html" class="modal-portal-btn">
          <span>Ir a la plataforma de estudiantes</span>
          <span aria-hidden="true">→</span>
        </a>
      </div>

    </div>
  </div>


  <!-- =========================================
       FOOTER INSTITUCIONAL
  ========================================== -->

  <footer class="site-footer">

    <div class="footer-top-grid">

      <!-- Columna 1: Marca y logo -->
      <div class="footer-col footer-col-brand">
        <img src="${VO_LOGO}" alt="Vera Orbis" class="footer-logo-img" />
        <p class="footer-tagline">WE SPEAK THE WORLD.</p>
        <p class="footer-category">Language, Culture &amp; Connection Center</p>
        <p class="footer-manifesto">
          «Every Person Matters. Creemos en un mundo conectado a través del diálogo sincero, la cultura y la empatía al hablar.»
        </p>
        <div class="footer-lang-focus">
          <span class="lang-pill">Inglés</span>
          <span class="lang-pill">Francés</span>
          <span class="lang-pill">Mandarín</span>
        </div>
      </div>

      <!-- Columna 2: Cómo enseñamos -->
      <div class="footer-col">
        <h4 class="footer-col-title">Cómo enseñamos</h4>
        <ul class="footer-links">
          <li><a href="#metodo">Nuestra forma de enseñar</a></li>
          <li><a href="#ingles">Clases de Inglés</a></li>
          <li><a href="#frances">Clases de Francés</a></li>
          <li><a href="#mandarin">Clases de Mandarín</a></li>
          <li><a href="#empresas">Mandarín Comercial (B2B)</a></li>
          <li><a href="#ecosistema">Vera Voice (IA 24/7)</a></li>
        </ul>
      </div>

      <!-- Columna 3: Living Connections -->
      <div class="footer-col">
        <h4 class="footer-col-title">Living Connections</h4>
        <ul class="footer-links">
          <li><a href="#newsletter">Carta semanal</a></li>
          <li><a href="#metodo">Filosofía de enseñanza</a></li>
          <li><a href="#programas">Preparación para exámenes oficiales</a></li>
          <li><a href="#contacto">Pedir diagnóstico</a></li>
        </ul>
      </div>

      <!-- Columna 4: Accesos y contacto -->
      <div class="footer-col">
        <h4 class="footer-col-title">Accesos directos</h4>
        <ul class="footer-links">
          <li><a href="/platform.html" class="footer-link-highlight">Acceso Estudiantes →</a></li>
          <li><a href="/login.html">Iniciar sesión</a></li>
          <li><a href="/register.html">Registro de estudiantes</a></li>
          <li>
            <a href="https://wa.me/573123035708" target="_blank" rel="noopener noreferrer">
              WhatsApp: +57 312 303 5708
            </a>
          </li>
        </ul>
        <div class="footer-campus-badge">
          <span>BOGOTÁ · 4°42′N · 74°04′W</span>
        </div>
      </div>

    </div>

    <div class="footer-bottom-bar">
      <div class="footer-motto-row">
        <span>LEARN IT</span>
        <span class="bullet" aria-hidden="true">·</span>
        <span>LIVE IT</span>
        <span class="bullet" aria-hidden="true">·</span>
        <span>SPEAK IT</span>
      </div>

      <div class="footer-copy">
        © 2026 VERA ORBIS. TODOS LOS DERECHOS RESERVADOS.
      </div>
    </div>

  </footer>

`

/* =========================================================
   VANILLA JS: LÓGICA MODULAR & MICRO-INTERACCIONES
   ========================================================= */

function initApp() {
  initNavbarElevation()
  initMobileMenu()
  initLanguagesDropdown()
  initHeroAudienceToggle()
  initScrollReveal()
  initPassport3DTilt()
  initPassportModal()
  initNewsletterForm()
  initButtonMicroInteractions()
  initSmoothScroll()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}

/**
 * 1. ELEVACIÓN DE NAVBAR AL HACER SCROLL
 */
function initNavbarElevation() {
  const navbar = document.querySelector('#site-navbar')
  if (!navbar) return

  let ticking = false
  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > 30) {
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

/**
 * 2. SELECTOR / MENÚ DE IDIOMAS EN NAVBAR
 */
function initLanguagesDropdown() {
  const wrap = document.querySelector('#languages-dropdown-wrap')
  const btn = document.querySelector('#languages-menu-btn')
  const menu = document.querySelector('#languages-dropdown-menu')
  if (!wrap || !btn || !menu) return

  const toggle = () => {
    const isOpen = wrap.classList.toggle('is-open')
    btn.setAttribute('aria-expanded', String(isOpen))
  }

  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggle()
  })

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) {
      wrap.classList.remove('is-open')
      btn.setAttribute('aria-expanded', 'false')
    }
  })

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      wrap.classList.remove('is-open')
      btn.setAttribute('aria-expanded', 'false')
    })
  })
}

/**
 * 3. MENÚ MÓVIL
 */
function initMobileMenu() {
  const toggleBtn = document.querySelector('#mobile-menu-toggle')
  const drawer = document.querySelector('#mobile-nav-drawer')
  const closeBtn = document.querySelector('#mobile-nav-close')
  const backdrop = document.querySelector('#mobile-nav-backdrop')
  const navLinks = document.querySelectorAll('.mobile-nav-link, .mobile-lang-chip')

  if (!toggleBtn || !drawer) return

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
    }, 350)
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
    link.addEventListener('click', closeDrawer)
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.hidden) {
      closeDrawer()
    }
  })
}

/**
 * 4. SELECTOR INTERACTIVO EN EL HERO (PERSONAS / EMPRESAS)
 */
function initHeroAudienceToggle() {
  const tabB2C = document.querySelector('#tab-b2c')
  const tabB2B = document.querySelector('#tab-b2b')
  const modeB2C = document.querySelector('#mode-b2c')
  const modeB2B = document.querySelector('#mode-b2b')

  if (!tabB2C || !tabB2B || !modeB2C || !modeB2B) return

  const switchMode = (mode) => {
    if (mode === 'b2b') {
      tabB2C.classList.remove('is-active')
      tabB2C.setAttribute('aria-selected', 'false')

      tabB2B.classList.add('is-active')
      tabB2B.setAttribute('aria-selected', 'true')

      modeB2C.hidden = true
      modeB2C.classList.remove('fade-in')

      modeB2B.hidden = false
      modeB2B.classList.add('fade-in')
    } else {
      tabB2B.classList.remove('is-active')
      tabB2B.setAttribute('aria-selected', 'false')

      tabB2C.classList.add('is-active')
      tabB2C.setAttribute('aria-selected', 'true')

      modeB2B.hidden = true
      modeB2B.classList.remove('fade-in')

      modeB2C.hidden = false
      modeB2C.classList.add('fade-in')
    }
  }

  tabB2C.addEventListener('click', () => switchMode('b2c'))
  tabB2B.addEventListener('click', () => switchMode('b2b'))
}

/**
 * 5. ANIMACIÓN AL HACER SCROLL
 */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll')
  if (!revealElements.length || typeof IntersectionObserver === 'undefined') {
    revealElements.forEach(el => el.classList.add('is-revealed'))
    return
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed')
        obs.unobserve(entry.target)
      }
    })
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  })

  revealElements.forEach(el => observer.observe(el))
}

/**
 * 6. EFECTO 3D EN LA TARJETA DEL PASAPORTE
 */
function initPassport3DTilt() {
  const tiltWrap = document.querySelector('#passport-tilt-wrap')
  const card = document.querySelector('#passport-card')
  const glare = document.querySelector('#passport-glare')

  if (!tiltWrap || !card) return

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches

  if (prefersReduced || isTouchDevice) return

  let rafId = null
  let mouseX = 0
  let mouseY = 0
  let isHovered = false

  const handlePointerMove = (e) => {
    const rect = tiltWrap.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    mouseX = (x / rect.width) * 2 - 1
    mouseY = (y / rect.height) * 2 - 1

    if (!isHovered) {
      isHovered = true
      card.classList.add('is-tilting')
    }

    if (glare) {
      const glareX = (x / rect.width) * 100
      const glareY = (y / rect.height) * 100
      glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 249, 240, 0.22) 0%, rgba(255, 249, 240, 0) 65%)`
      glare.style.opacity = '1'
    }

    if (!rafId) {
      rafId = window.requestAnimationFrame(updateTilt)
    }
  }

  const updateTilt = () => {
    const maxRotX = 7
    const maxRotY = 9
    const rotX = -mouseY * maxRotX
    const rotY = mouseX * maxRotY

    card.style.transform = `perspective(1200px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-8px)`
    rafId = null
  }

  const handlePointerLeave = () => {
    isHovered = false
    card.classList.remove('is-tilting')
    card.style.transform = ''
    if (glare) glare.style.opacity = '0'
    if (rafId) {
      window.cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  tiltWrap.addEventListener('pointermove', handlePointerMove, { passive: true })
  tiltWrap.addEventListener('pointerleave', handlePointerLeave)
}

/**
 * 7. MODAL DEMO DEL PASAPORTE (CON CIERRE DEFENSIVO GARANTIZADO)
 */
function initPassportModal() {
  const modal = document.querySelector('#passport-modal')
  const trigger = document.querySelector('#passport-preview-trigger')
  const closeBtn = document.querySelector('#passport-modal-close-btn')
  const closeBackdrop = document.querySelector('#passport-modal-close-backdrop')

  if (!modal) return

  const openModal = () => {
    modal.removeAttribute('hidden')
    modal.classList.add('is-active')
    modal.style.display = 'flex'
    trigger?.setAttribute('aria-expanded', 'true')
    document.body.classList.add('modal-open')
    setTimeout(() => {
      closeBtn?.focus()
    }, 50)
  }

  const closeModal = () => {
    modal.setAttribute('hidden', '')
    modal.classList.remove('is-active')
    modal.style.display = 'none'
    trigger?.setAttribute('aria-expanded', 'false')
    document.body.classList.remove('modal-open')
    trigger?.focus()
  }

  trigger?.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    openModal()
  })

  closeBtn?.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    closeModal()
  })

  closeBackdrop?.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    closeModal()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const isOpen = modal.classList.contains('is-active') || !modal.hasAttribute('hidden') || modal.style.display === 'flex'
      if (isOpen) {
        closeModal()
      }
    }
  })
}

/**
 * 8. FORMULARIO LIVING CONNECTIONS
 */
function initNewsletterForm() {
  const form = document.querySelector('#newsletter-subscription-form')
  const emailInput = document.querySelector('#newsletter-email')
  const errorMsg = document.querySelector('#newsletter-error')
  const submitBtn = document.querySelector('#newsletter-submit-btn')
  const successState = document.querySelector('#newsletter-success')
  const resetBtn = document.querySelector('#newsletter-reset-btn')

  if (!form || !emailInput || !submitBtn || !successState) return

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const email = emailInput.value.trim()

    if (!validateEmail(email)) {
      if (errorMsg) errorMsg.hidden = false
      emailInput.setAttribute('aria-invalid', 'true')
      emailInput.focus()
      return
    }

    if (errorMsg) errorMsg.hidden = true
    emailInput.removeAttribute('aria-invalid')

    submitBtn.classList.add('is-submitting')
    submitBtn.disabled = true

    try {
      const stored = JSON.parse(localStorage.getItem('vo_newsletter_subscribers') || '[]')
      if (!stored.includes(email)) {
        stored.push(email)
        localStorage.setItem('vo_newsletter_subscribers', JSON.stringify(stored))
      }
    } catch (_) {}

    setTimeout(() => {
      submitBtn.classList.remove('is-submitting')
      submitBtn.disabled = false
      form.hidden = true
      successState.hidden = false
      successState.classList.add('fade-in')
    }, 450)
  })

  resetBtn?.addEventListener('click', () => {
    emailInput.value = ''
    form.hidden = false
    successState.hidden = true
    successState.classList.remove('fade-in')
    emailInput.focus()
  })

  emailInput.addEventListener('input', () => {
    if (errorMsg && !errorMsg.hidden && validateEmail(emailInput.value.trim())) {
      errorMsg.hidden = true
      emailInput.removeAttribute('aria-invalid')
    }
  })
}

/**
 * 9. MICRO-INTERACCIONES EN BOTONES
 */
function initButtonMicroInteractions() {
  const primaryButtons = document.querySelectorAll('.btn-primary-action, .contact-primary-btn')
  primaryButtons.forEach(btn => {
    btn.addEventListener('pointerenter', () => {
      const shimmer = btn.querySelector('.btn-shimmer')
      if (shimmer) {
        shimmer.style.animation = 'none'
        void shimmer.offsetWidth
        shimmer.style.animation = 'shimmerSweep 0.85s cubic-bezier(0.16, 1, 0.3, 1)'
      }
    })
  })
}

/**
 * 10. DESPLAZAMIENTO SUAVE
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href')
      if (targetId === '#' || targetId === '#!') return

      const targetEl = document.querySelector(targetId)
      if (targetEl) {
        e.preventDefault()
        targetEl.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }
    })
  })
}
