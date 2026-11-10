import '../style.css'
import { renderSiteNav, initSiteNav } from '../components/siteNav.js'
import { renderSiteFooter } from '../components/siteFooter.js'
import { renderConversionModals, initConversionModals } from '../components/conversionModals.js'

document.querySelector('#app').innerHTML = `
  ${renderSiteNav({ activePage: 'who-we-are' })}

  <main id="main-content" class="page-main">

    <!-- HERO EDITORIAL DE QUIÉNES SOMOS -->
    <section class="page-hero-header">
      <div class="page-hero-ambient" aria-hidden="true"></div>
      <div class="section-container text-center">
        <div class="chapter-badge-wrap">
          <span class="chapter-number-pill pill-orange">QUIÉNES SOMOS · WHO WE ARE</span>
        </div>
        <h1 class="page-hero-title">
          Vera Orbis es el mundo. <br>
          <span class="highlight-orange">Las personas son quienes le dan vida.</span>
        </h1>
        <p class="page-hero-lead max-lead-760">
          Un Centro de Idiomas, Cultura y Conexión concebido para que aprender una nueva lengua sea una experiencia humana, cercana y transformadora.
        </p>
      </div>
    </section>

    <!-- NARRATIVA Y PROPÓSITO -->
    <section class="about-narrative-section">
      <div class="section-container">
        <div class="editorial-story-grid">
          <div class="story-col-highlight">
            <span class="story-kicker">NUESTRA ESENCIA</span>
            <h2 class="story-title">A World of Living Connections</h2>
            <p class="story-p-large">
              El mundo está lleno de historias que aún no escuchamos, personas que aún no conocemos y culturas que transforman nuestra perspectiva.
            </p>
            <p>
              En Vera Orbis creemos que un idioma es mucho más que reglas gramaticales y listas de palabras: es un puente vivo entre seres humanos. Creamos espacios donde equivocarse con una sonrisa es parte natural del aprendizaje y donde la curiosidad siempre tiene la bienvenida.
            </p>
          </div>

          <div class="story-col-triad">
            <div class="triad-card-item">
              <span class="triad-step-pill">01</span>
              <div>
                <h4>Abrimos puertas</h4>
                <p>Derribamos el miedo al error para que el idioma se convierta en tu aliado cotidiano.</p>
              </div>
            </div>

            <div class="triad-card-item">
              <span class="triad-step-pill">02</span>
              <div>
                <h4>Guiamos descubrimientos</h4>
                <p>Cultura viva, expresiones cotidianas y contextos reales que van más allá de cualquier libro de texto.</p>
              </div>
            </div>

            <div class="triad-card-item">
              <span class="triad-step-pill">03</span>
              <div>
                <h4>Unimos personas</h4>
                <p>Conversaciones reales con profesores humanos y una comunidad internacional cálida y estimulante.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- VIDEO INSTITUCIONAL DE PRESENTACIÓN -->
    <section class="about-video-section">
      <div class="section-container">
        <div class="section-head text-center">
          <p class="section-label">
            <span class="label-dash">—</span>
            <span>VIDEO INSTITUCIONAL</span>
            <span class="label-dash">—</span>
          </p>
          <h2 class="editorial-title">
            Conoce la experiencia <span class="highlight-violet">Vera Orbis</span>
          </h2>
          <p class="section-lead max-lead-760">
            Una mirada en video a cómo entendemos la comunicación, la cultura y el aprendizaje.
          </p>
        </div>

        <div class="about-video-stage">
          <div class="video-orbital-ring ring-outer" aria-hidden="true"></div>
          <div class="video-frame-container" id="intro-video-frame">
            <video
              id="intro-video"
              class="intro-video-player"
              playsinline
              preload="auto"
              aria-label="Video de presentación: Experiencia Vera Orbis"
            >
              <source src="/videos/vera-orbis-intro-web.mp4" type="video/mp4" />
              <source src="/videos/vera-orbis-intro.mov" type="video/quicktime" />
              Tu navegador no soporta la reproducción directa del video. Puedes <a href="/videos/vera-orbis-intro.mov" download>descargar el archivo aquí</a>.
            </video>

            <!-- Portada interactiva / Overlay de reproducción -->
            <div
              class="video-poster-overlay"
              id="intro-video-overlay"
              role="button"
              tabindex="0"
              aria-label="Reproducir video de presentación de Vera Orbis (45 segundos)"
            >
              <div class="poster-top-bar">
                <span class="poster-badge-pill">
                  <span class="poster-dot" aria-hidden="true"></span>
                  <span>CENTRO DE CONEXIONES VIVAS</span>
                </span>
                <span class="poster-duration-tag">0:45 min · HD</span>
              </div>

              <div class="poster-center-cta">
                <div class="video-play-orb" aria-hidden="true">
                  <span class="play-pulse-ring"></span>
                  <svg class="play-icon-svg" viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                <div class="poster-cta-text">
                  <span class="play-cta-title">Ver video de presentación</span>
                  <span class="play-cta-sub">45 segundos · Archivo audiovisual institucional</span>
                </div>
              </div>

              <div class="poster-bottom-bar">
                <p class="poster-quote">
                  «Vera Orbis is the world. People are what bring it to life.»
                </p>
                <span class="poster-brand-stamp">WE SPEAK THE WORLD</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- DIRECCIÓN Y LIDERAZGO: LINA CELEDÓN & DIFERENCIACIÓN CON VERA (IA) -->
    <section class="about-leadership-section">
      <div class="section-container">

        <div class="founder-card-container">
          <div class="founder-card-ambient" aria-hidden="true"></div>

          <!-- Espacio reservado para la fotografía real de Lina Celedón -->
          <div class="founder-portrait-column">
            <div class="founder-real-photo-placeholder" aria-label="Fotografía oficial de Lina Celedón">
              <div class="photo-placeholder-inner">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="portrait-camera-icon" aria-hidden="true">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span class="placeholder-caption">Fotografía Oficial</span>
                <span class="placeholder-name">Lina Celedón</span>
              </div>
              <div class="founder-seal-badge" aria-hidden="true">
                <span class="seal-text">VERA ORBIS</span>
              </div>
            </div>

            <div class="founder-role-card">
              <strong class="founder-name-label">Lina Celedón</strong>
              <span class="founder-role-title">Founder &amp; Director</span>
              <span class="founder-role-location">Vera Orbis · Bogotá, Colombia</span>
            </div>
          </div>

          <div class="founder-narrative-column">
            <div class="founder-narrative-kicker">
              <span class="kicker-bullet" aria-hidden="true">·</span>
              <span>LIDERAZGO Y VISIÓN · FOUNDER &amp; DIRECTOR</span>
            </div>

            <h3 class="founder-headline">
              Lina Celedón · Founder &amp; Director
            </h3>

            <div class="founder-letter-body">
              <p>
                Como Founder &amp; Director de Vera Orbis, Lina Celedón concibió este proyecto con un propósito claro: hacer del aprendizaje de idiomas un proceso humano, estimulante y profundamente conectado con la realidad de cada estudiante.
              </p>
              <p>
                Frente a los modelos rígidos e impersonales, su visión prioriza la confianza comunicativa, la inmersión cultural genuina y el respeto por el ritmo individual de cada persona.
              </p>
            </div>

            <!-- CUADRO DE DIFERENCIACIÓN CLARA: LINA (HUMANA) vs VERA (ASISTENTE IA) -->
            <div class="clarity-box-distinction">
              <div class="distinction-header">
                <span class="distinction-badge">CLARIDAD DE NUESTRO ECOSISTEMA</span>
                <h4>Diferenciación en Vera Orbis</h4>
              </div>
              <div class="distinction-grid">
                <div class="distinction-col">
                  <strong>Lina Celedón</strong>
                  <span class="distinction-role">Founder &amp; Director</span>
                  <p>Líder humana y pedagógica del centro. Diseña la visión, supervisa los programas y acompaña a los docentes.</p>
                </div>
                <div class="distinction-divider" aria-hidden="true"></div>
                <div class="distinction-col">
                  <strong>Vera</strong>
                  <span class="distinction-role">Asistente Virtual &amp; IA</span>
                  <p>Compañera digital de práctica conversacional dentro de la plataforma para estudiantes, disponible 24/7 para repasar.</p>
                </div>
              </div>
            </div>

            <div class="founder-actions-row">
              <a href="/languages" class="founder-btn-explore">
                <span>Ver programas de idiomas</span>
                <span class="btn-arrow" aria-hidden="true">→</span>
              </a>
              <a href="/contact" class="founder-btn-talk">
                <span>Contactar a Vera Orbis</span>
                <span class="btn-arrow" aria-hidden="true">→</span>
              </a>
            </div>

          </div>
        </div>

      </div>
    </section>

    <!-- 4 PILARES FUNDAMENTALES -->
    <section class="about-pillars-section">
      <div class="section-container">
        <div class="section-head text-center">
          <p class="section-label">
            <span class="label-dash">—</span>
            <span>NUESTRO ADN</span>
            <span class="label-dash">—</span>
          </p>
          <h2 class="editorial-title">
            Cuatro pilares que <span class="highlight-orange">definen nuestro centro</span>
          </h2>
        </div>

        <div class="about-pillars-grid">
          <div class="about-pillar-card pillar-card-violet">
            <div class="pillar-card-kicker">
              <span class="pillar-tag">QUÉ SOMOS</span>
              <span class="pillar-roman">I</span>
            </div>
            <h3 class="about-card-title">Language, Culture &amp; Connection Center</h3>
            <p class="about-card-text">
              Más que una academia convencional, somos un espacio de inmersión y conexión humana diseñado para vivir cada idioma en su contexto real.
            </p>
            <div class="pillar-accent-line line-violet"></div>
          </div>

          <div class="about-pillar-card pillar-card-orange">
            <div class="pillar-card-kicker">
              <span class="pillar-tag">NUESTRA ESENCIA</span>
              <span class="pillar-roman">II</span>
            </div>
            <h3 class="about-card-title">A World of Living Connections</h3>
            <p class="about-card-text">
              Aprender un idioma es tender puentes con personas reales, comprender distintas formas de ver el mundo y desenvolverte con soltura en el trabajo o tus viajes.
            </p>
            <div class="pillar-accent-line line-orange"></div>
          </div>

          <div class="about-pillar-card pillar-card-yellow">
            <div class="pillar-card-kicker">
              <span class="pillar-tag">NUESTRO PROPÓSITO</span>
              <span class="pillar-roman">III</span>
            </div>
            <h3 class="about-card-title">Hacer el mundo más accesible</h3>
            <p class="about-card-text">
              A través de la comunicación y el intercambio cultural, acercamos continentes e impulsamos a cada persona a expresarse con autenticidad y confianza.
            </p>
            <div class="pillar-accent-line line-yellow"></div>
          </div>

          <div class="about-pillar-card pillar-card-turquoise">
            <div class="pillar-card-kicker">
              <span class="pillar-tag">NUESTRO PRINCIPIO</span>
              <span class="pillar-roman">IV</span>
            </div>
            <h3 class="about-card-title">Every Person Matters</h3>
            <p class="about-card-text">
              Tu historia, tus tiempos y tus metas personales guían cada sesión. Aquí cada estudiante es conocido por su nombre y acompañado paso a paso.
            </p>
            <div class="pillar-accent-line line-turquoise"></div>
          </div>
        </div>
      </div>
    </section>

  </main>

  ${renderSiteFooter()}
  ${renderConversionModals()}
`

// Inicializar navegación y modales
initSiteNav()
initConversionModals()

// Lógica de reproducción del video institucional
const frame = document.querySelector('#intro-video-frame')
const video = document.querySelector('#intro-video')
const overlay = document.querySelector('#intro-video-overlay')

if (frame && video && overlay) {
  const startPlayback = () => {
    frame.classList.add('is-playing')
    video.controls = true
    const playPromise = video.play()
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('Playback notice:', err)
      })
    }
  }

  overlay.addEventListener('click', startPlayback)
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      startPlayback()
    }
  })

  video.addEventListener('ended', () => {
    frame.classList.remove('is-playing')
    video.controls = false
  })
}
