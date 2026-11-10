import '../style.css'
import { renderSiteNav, initSiteNav } from '../components/siteNav.js'
import { renderSiteFooter } from '../components/siteFooter.js'
import { renderConversionModals, initConversionModals } from '../components/conversionModals.js'

document.querySelector('#app').innerHTML = `
  ${renderSiteNav({ activePage: 'method' })}

  <main id="main-content" class="page-main">

    <!-- HERO EDITORIAL DE NUESTRO MÉTODO -->
    <section class="page-hero-header">
      <div class="page-hero-ambient" aria-hidden="true"></div>
      <div class="section-container text-center">
        <div class="chapter-badge-wrap">
          <span class="chapter-number-pill pill-violet">NUESTRO MÉTODO · THE METHOD</span>
        </div>
        <h1 class="page-hero-title">
          Learn It. Live It. Speak It. <br>
          <span class="highlight-violet">Aprender un idioma es aprender a conectar.</span>
        </h1>
        <p class="page-hero-lead max-lead-760">
          Sin listas interminables de verbos ni aulas silenciosas. Una metodología activa, comunicativa y humana donde el idioma cobra sentido en situaciones reales.
        </p>
      </div>
    </section>

    <!-- LAS TRES ETAPAS DEL MÉTODO (TRES EXPERIENCIAS VISUALES DISTINTIVAS) -->
    <section class="method-stages-section">
      <div class="section-container">

        <div class="method-cards-stack">

          <!-- ETAPA 1: LEARN IT -->
          <div class="method-experience-card card-stage-learn">
            <div class="stage-grid">
              <div class="stage-text-col">
                <div class="stage-pill-tag tag-violet">
                  <span>ETAPA 01</span>
                  <span class="bullet" aria-hidden="true">·</span>
                  <span>COMPRENSIÓN VIVA</span>
                </div>
                <h2 class="stage-title">Learn It · Comprende con sentido</h2>
                <p class="stage-lead">
                  Antes de memorizar reglas, te ayudamos a entender la lógica y el ritmo del idioma a través de mapas conceptuales, audios reales y situaciones cotidianas.
                </p>
                <div class="stage-features-list">
                  <div class="stage-feature">
                    <span class="feature-dot dot-violet"></span>
                    <div>
                      <strong>Estructuras claras sin sobrecarga gramatical:</strong>
                      <p>Aprendes las bases comunicativas para expresarte desde la primera sesión.</p>
                    </div>
                  </div>
                  <div class="stage-feature">
                    <span class="feature-dot dot-violet"></span>
                    <div>
                      <strong>Vocabulario contextualizado:</strong>
                      <p>Palabras y modismos que las personas nativas usan hoy en su vida real.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="stage-visual-col">
                <div class="stage-image-frame">
                  <img src="/images/method-learn.jpg" alt="Estudiante en sesión de aprendizaje con mapas visuales" class="stage-img" loading="lazy" />
                  <span class="stage-watermark">01 · LEARN</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ETAPA 2: LIVE IT -->
          <div class="method-experience-card card-stage-live">
            <div class="stage-grid stage-grid-reversed">
              <div class="stage-text-col">
                <div class="stage-pill-tag tag-orange">
                  <span>ETAPA 02</span>
                  <span class="bullet" aria-hidden="true">·</span>
                  <span>INMERSIÓN CULTURAL</span>
                </div>
                <h2 class="stage-title">Live It · Vive la cultura</h2>
                <p class="stage-lead">
                  Un idioma no vive en un libro; vive en la cultura, en los viajes, en la música y en las mesas de café. Hacemos que cada sesión sea un viaje cultural.
                </p>
                <div class="stage-features-list">
                  <div class="stage-feature">
                    <span class="feature-dot dot-orange"></span>
                    <div>
                      <strong>Escenarios de la vida real:</strong>
                      <p>Simulamos cómo pedir un café en París, negociar en Shanghái o participar en una reunión en Nueva York.</p>
                    </div>
                  </div>
                  <div class="stage-feature">
                    <span class="feature-dot dot-orange"></span>
                    <div>
                      <strong>Contexto multicultural auténtico:</strong>
                      <p>Entenderás el humor, los silencios y los matices que enriquecen cada conversación.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="stage-visual-col">
                <div class="stage-image-frame">
                  <img src="/images/method-live.jpg" alt="Grupo compartiendo y viviendo el intercambio cultural" class="stage-img" loading="lazy" />
                  <span class="stage-watermark">02 · LIVE</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ETAPA 3: SPEAK IT -->
          <div class="method-experience-card card-stage-speak">
            <div class="stage-grid">
              <div class="stage-text-col">
                <div class="stage-pill-tag tag-turquoise">
                  <span>ETAPA 03</span>
                  <span class="bullet" aria-hidden="true">·</span>
                  <span>HABLA ACTIVA</span>
                </div>
                <h2 class="stage-title">Speak It · Suelta tu voz</h2>
                <p class="stage-lead">
                  La única forma de aprender a hablar es hablando. Desde el minuto uno conversas con tu profesor en un ambiente seguro donde equivocarse es bienvenido.
                </p>
                <div class="stage-features-list">
                  <div class="stage-feature">
                    <span class="feature-dot dot-turquoise"></span>
                    <div>
                      <strong>Retroalimentación constructiva:</strong>
                      <p>Correcciones amables en tiempo real que refuerzan tu pronunciación sin cortar tu fluidez.</p>
                    </div>
                  </div>
                  <div class="stage-feature">
                    <span class="feature-dot dot-turquoise"></span>
                    <div>
                      <strong>Confianza y autonomía:</strong>
                      <p>Superas el bloqueo inicial y ganas la seguridad que necesitas para comunicarte en público.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="stage-visual-col">
                <div class="stage-image-frame">
                  <img src="/images/method-speak.jpg" alt="Dos personas conversando con naturalidad y alegría" class="stage-img" loading="lazy" />
                  <span class="stage-watermark">03 · SPEAK</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>

    <!-- ACOMPAÑAMIENTO INTEGRAL -->
    <section class="method-accompaniment-section">
      <div class="section-container">
        <div class="section-head text-center">
          <p class="section-label">
            <span class="label-dash">—</span>
            <span>ACOMPAÑAMIENTO CONTINUO</span>
            <span class="label-dash">—</span>
          </p>
          <h2 class="editorial-title">
            ¿Cómo te acompañamos <span class="highlight-yellow">paso a paso?</span>
          </h2>
        </div>

        <div class="accompaniment-grid">
          <div class="accompaniment-step-card">
            <span class="step-num-pill">01</span>
            <h4>Diagnóstico comunicativo inicial</h4>
            <p>Conocemos tu nivel real de habla, tus objetivos específicos y el tiempo que tienes disponible.</p>
          </div>

          <div class="accompaniment-step-card">
            <span class="step-num-pill">02</span>
            <h4>Ruta formativa a tu medida</h4>
            <p>Diseñamos un plan de trabajo con temas que te apasionan y vocabulario relevante para tu vida.</p>
          </div>

          <div class="accompaniment-step-card">
            <span class="step-num-pill">03</span>
            <h4>Sesiones 1 a 1 con docentes dedicados</h4>
            <p>Profesores con vocación pedagógica que te guían con paciencia, empatía y rigor comunicativo.</p>
          </div>

          <div class="accompaniment-step-card">
            <span class="step-num-pill">04</span>
            <h4>Evaluación constante de progreso</h4>
            <p>Monitoreas tu evolución paso a paso, celebrando tus logros en fluidez y comprensión.</p>
          </div>
        </div>

        <div class="method-cta-banner">
          <div class="banner-text">
            <h3>¿Listo para probar nuestro método en una sesión de 15 minutos?</h3>
            <p>Agenda una llamada de orientación sin costo y conoce cómo podemos ayudarte.</p>
          </div>
          <button type="button" class="banner-action-btn" id="method-cta-book">
            <span>Agendar orientación gratuita</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>

      </div>
    </section>

  </main>

  ${renderSiteFooter()}
  ${renderConversionModals()}
`

initSiteNav()
initConversionModals()

document.querySelector('#method-cta-book')?.addEventListener('click', () => {
  if (typeof window.__voOpenOrientationModal === 'function') {
    window.__voOpenOrientationModal()
  } else {
    window.location.href = '/contact#orientacion'
  }
})
