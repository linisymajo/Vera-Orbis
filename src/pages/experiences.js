import '../style.css'
import { renderSiteNav, initSiteNav } from '../components/siteNav.js'
import { renderSiteFooter } from '../components/siteFooter.js'
import { renderConversionModals, initConversionModals } from '../components/conversionModals.js'

document.querySelector('#app').innerHTML = `
  ${renderSiteNav({ activePage: 'experiences' })}

  <main id="main-content" class="page-main">

    <!-- HERO EDITORIAL DE EXPERIENCIAS -->
    <section class="page-hero-header">
      <div class="page-hero-ambient" aria-hidden="true"></div>
      <div class="section-container text-center">
        <div class="chapter-badge-wrap">
          <span class="chapter-number-pill pill-gold">EXPERIENCIAS &amp; ECOSISTEMA</span>
        </div>
        <h1 class="page-hero-title">
          Cinco universos, <br>
          <span class="highlight-gold">un mismo mundo de conexiones.</span>
        </h1>
        <p class="page-hero-lead max-lead-760">
          En Vera Orbis conectamos Language, Culture, People, Places y Experiences. Conoce nuestras propuestas formativas activas y las experiencias que estamos construyendo.
        </p>
      </div>
    </section>

    <!-- LOS CINCO UNIVERSOS EN DETALLE -->
    <section class="universes-detail-section">
      <div class="section-container">
        <div class="universes-five-grid">

          <div class="universe-card universe-lang">
            <span class="universe-roman">I</span>
            <h3>Language</h3>
            <p>Inglés, Francés y Mandarín enseñados con rigor comunicativo y contexto práctico para la vida y los negocios.</p>
            <a href="/languages" class="universe-link">Ver idiomas →</a>
          </div>

          <div class="universe-card universe-cult">
            <span class="universe-roman">II</span>
            <h3>Culture</h3>
            <p>Comprender cómo piensa otra sociedad, sus códigos sociales, su literatura, su gastronomía y su visión del mundo.</p>
            <span class="universe-tag">Inmersión Viva</span>
          </div>

          <div class="universe-card universe-peop">
            <span class="universe-roman">III</span>
            <h3>People</h3>
            <p>El núcleo de nuestro centro. Profesores con vocación humana, estudiantes curiosos y una red internacional cálida.</p>
            <a href="/who-we-are" class="universe-link">Quiénes somos →</a>
          </div>

          <div class="universe-card universe-plac">
            <span class="universe-roman">IV</span>
            <h3>Places</h3>
            <p>Desde nuestro estudio en Bogotá (4°42′N · 74°04′W) hasta las ciudades del mundo donde nuestros estudiantes viajan y trabajan.</p>
            <span class="universe-tag">Bogotá &amp; Mundo</span>
          </div>

          <div class="universe-card universe-expe">
            <span class="universe-roman">V</span>
            <h3>Experiences</h3>
            <p>Living Connections, simulaciones de negocios, debates culturales y talleres prácticos de conversación activa.</p>
            <a href="/contact" class="universe-link">Conéctate →</a>
          </div>

        </div>
      </div>
    </section>

    <!-- PROPUESTAS DISPONIBLES HOY -->
    <section class="active-experiences-section">
      <div class="section-container">
        <div class="section-head text-center">
          <p class="section-label">
            <span class="label-dash">—</span>
            <span>PROPUESTAS ACTIVAS</span>
            <span class="label-dash">—</span>
          </p>
          <h2 class="editorial-title">
            Servicios y experiencias <span class="highlight-violet">disponibles actualmente</span>
          </h2>
        </div>

        <div class="active-proposals-grid">

          <!-- Propuesta 1: Clases 1 a 1 -->
          <div class="proposal-card">
            <div class="proposal-badge-status status-available">DISPONIBLE AHORA</div>
            <h3>Acompañamiento 1 a 1 para Personas</h3>
            <p>
              Sesiones individuales con profesores reales en inglés, francés o mandarín. Horarios flexibles, temarios adaptados a tu carrera y retroalimentación personalizada en cada encuentro.
            </p>
            <ul class="proposal-perks">
              <li>Diagnóstico inicial de nivel sin costo.</li>
              <li>Flexibilidad semanal de agenda.</li>
              <li>Seguimiento pedagógico continuo.</li>
            </ul>
            <a href="/contact#orientacion" class="proposal-btn">Agendar llamada de orientación →</a>
          </div>

          <!-- Propuesta 2: Programas Corporativos B2B -->
          <div class="proposal-card card-b2b-highlight format-card format-mandarin-b2b">
            <div class="proposal-badge-status status-available">DISPONIBLE AHORA</div>
            <h3>Programas Corporativos B2B</h3>
            <p>
              Capacitación de equipos en Mandarín Comercial &amp; Protocolo, COMERCIO EXTERIOR &amp; ASIA, e inglés de negocios. Diagnóstico de competencias para colaboradores y líderes.
            </p>
            <ul class="proposal-perks">
              <li>Planes grupales y aceleración privada para líderes.</li>
              <li>Simulaciones de negociación y videollamadas internacionales.</li>
              <li>Informes periódicos de asistencia y desempeño.</li>
            </ul>
            <a href="/contact#empresas" class="proposal-btn">Solicitar propuesta para mi equipo →</a>
          </div>

          <!-- Propuesta 3: Carta Living Connections -->
          <div class="proposal-card">
            <div class="proposal-badge-status status-available">DISPONIBLE AHORA</div>
            <h3>Carta Living Connections</h3>
            <p>
              Publicación editorial semanal con recomendaciones culturales, libros, expresiones auténticas y reflexiones sobre el aprendizaje de idiomas.
            </p>
            <ul class="proposal-perks">
              <li>Curaduría académica semanal.</li>
              <li>Análisis de modismos y contexto cultural.</li>
              <li>100% gratuita y sin spam.</li>
            </ul>
            <a href="/contact#newsletter" class="proposal-btn">Suscribirme a la carta →</a>
          </div>

        </div>
      </div>
    </section>

    <!-- ESPACIOS DE INNOVACIÓN / PRÓXIMAS EXPERIENCIAS (EN FASE DE DESARROLLO) -->
    <section class="upcoming-experiences-section">
      <div class="section-container">
        <div class="section-head text-center">
          <p class="section-label">
            <span class="label-dash">—</span>
            <span>PRÓXIMAMENTE · EN DESARROLLO</span>
            <span class="label-dash">—</span>
          </p>
          <h2 class="editorial-title">
            Espacios de innovación en preparación
          </h2>
          <p class="section-lead max-lead-760">
            Estamos diseñando nuevas herramientas interactivas que enriquecerán la plataforma para nuestros estudiantes activos.
          </p>
        </div>

        <div class="upcoming-grid">

          <div class="upcoming-card">
            <div class="upcoming-badge">EN FASE DE INTEGRACIÓN</div>
            <div class="upcoming-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x2="16" x1="8" y2="22"/></svg>
            </div>
            <h3>Vera Voice (IA conversacional)</h3>
            <p>
              Asistente digital de práctica conversacional con inteligencia artificial dentro de la plataforma estudiantil. Diseñada para que los alumnos practiquen pronunciación y repasos autónomos entre sus clases con profesores humanos.
            </p>
            <span class="upcoming-note">Próximamente disponible para estudiantes matriculados.</span>
          </div>

          <div class="upcoming-card" id="passport-card">
            <div class="upcoming-badge">EN DESARROLLO</div>
            <div class="upcoming-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <h3>Language Passport Interactivo</h3>
            <p>
              Herramienta visual de seguimiento pedagógico para registrar sellos culturales, hitos formativos y horas de diálogo acumuladas a lo largo de tu trayecto de aprendizaje.
            </p>
            <span class="upcoming-note">Próxima experiencia interactiva en la plataforma.</span>
          </div>

        </div>
      </div>
    </section>

  </main>

  ${renderSiteFooter()}
  ${renderConversionModals()}
`

initSiteNav()
initConversionModals()
