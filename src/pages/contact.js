import '../style.css'
import { renderSiteNav, initSiteNav } from '../components/siteNav.js'
import { renderSiteFooter } from '../components/siteFooter.js'
import { renderConversionModals, initConversionModals } from '../components/conversionModals.js'

document.querySelector('#app').innerHTML = `
  ${renderSiteNav({ activePage: 'contact' })}

  <main id="main-content" class="page-main">

    <!-- HERO EDITORIAL DE CONTACTO -->
    <section class="page-hero-header">
      <div class="page-hero-ambient" aria-hidden="true"></div>
      <div class="section-container text-center">
        <div class="chapter-badge-wrap">
          <span class="chapter-number-pill pill-orange">LET'S CONNECT · CONTACTO</span>
        </div>
        <h1 class="page-hero-title">
          El primer paso es tener <br>
          <span class="highlight-orange">una buena conversación.</span>
        </h1>
        <p class="page-hero-lead max-lead-760">
          ¿Quieres evaluar tu nivel, diseñar un programa para tu equipo o resolver dudas sobre nuestros idiomas? Elige la vía que te resulte más cómoda.
        </p>
      </div>
    </section>

    <!-- LAS 4 RUTAS DE CONVERSIÓN Y CONTACTO -->
    <section class="contact-pathways-section" id="contacto">
      <div class="section-container">

        <div class="conversion-pathways-grid">

          <!-- Ruta 1: Orientador Interactivo (Pathfinder) -->
          <div class="conversion-path-card">
            <div>
              <span class="conversion-path-badge badge-path-quiz">3 PREGUNTAS</span>
              <h3 class="conversion-path-title">Orientador interactivo</h3>
              <p class="conversion-path-desc">
                Cuestionario breve y dinámico para descubrir tu formato ideal según tus objetivos y tiempos disponibles.
              </p>
            </div>
            <button type="button" class="conversion-path-cta cta-purple" id="start-pathfinder-btn" aria-haspopup="dialog">
              <span>Iniciar cuestionario</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <!-- Ruta 2: Orientación 1 a 1 B2C -->
          <div class="conversion-path-card" id="orientacion">
            <div>
              <span class="conversion-path-badge badge-path-b2c">1 A 1 PERSONAS</span>
              <h3 class="conversion-path-title">Llamada de orientación</h3>
              <p class="conversion-path-desc">
                Sesión de 15 minutos sin costo para evaluar tu nivel, resolver tus dudas y planificar tus sesiones formativas.
              </p>
            </div>
            <button type="button" class="conversion-path-cta cta-turquoise" id="start-journey-btn" aria-haspopup="dialog">
              <span>Agendar orientación</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <!-- Ruta 3: Propuesta Corporativa B2B -->
          <div class="conversion-path-card card-featured-b2b" id="empresas">
            <div>
              <span class="conversion-path-badge badge-path-b2b">EMPRESAS &amp; EQUIPOS</span>
              <h3 class="conversion-path-title">Propuesta corporativa</h3>
              <p class="conversion-path-desc">
                Diseñamos una propuesta y diagnóstico para tus colaboradores en inglés, francés o mandarín de negocios.
              </p>
            </div>
            <button type="button" class="conversion-path-cta cta-orange" id="contact-b2b-cta" aria-haspopup="dialog">
              <span>Solicitar propuesta</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <!-- Ruta 4: WhatsApp Directo -->
          <div class="conversion-path-card">
            <div>
              <span class="conversion-path-badge badge-path-chat">ATENCIÓN DIRECTA</span>
              <h3 class="conversion-path-title">WhatsApp asesor</h3>
              <p class="conversion-path-desc">
                Escríbenos directamente para responder cualquier duda inmediata o iniciar tu proceso de inscripción hoy mismo.
              </p>
            </div>
            <a
              href="https://wa.me/573123035708?text=Hola%20Vera%20Orbis.%20Quiero%20hablar%20con%20un%20asesor%20acad%C3%A9mico."
              class="conversion-path-cta cta-whatsapp"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Escríbenos directamente por WhatsApp"
            >
              <span>Conversar por WhatsApp</span>
              <span aria-hidden="true">→</span>
            </a>
          </div>

        </div>

        <!-- COORDENADAS DEL ESTUDIO -->
        <div class="contact-details-bar">
          <div class="contact-detail-item">
            <span class="detail-label">ESTUDIO CENTRAL</span>
            <strong>Bogotá, Colombia</strong>
            <small>4°42′N · 74°04′W</small>
          </div>
          <div class="contact-detail-divider" aria-hidden="true"></div>
          <div class="contact-detail-item">
            <span class="detail-label">LÍNEA DE ATENCIÓN DIRECTA</span>
            <strong>+57 312 303 5708</strong>
            <small>Lunes a sábado · 8:00 AM - 7:00 PM</small>
          </div>
          <div class="contact-detail-divider" aria-hidden="true"></div>
          <div class="contact-detail-item">
            <span class="detail-label">COMUNIDAD GLOBAL</span>
            <strong>Estudiantes en América, Europa y Asia</strong>
            <small>Plataforma digital activa 24/7</small>
          </div>
        </div>

      </div>
    </section>

    <!-- CARTA LIVING CONNECTIONS (NEWSLETTER) -->
    <section id="newsletter" class="newsletter-section">
      <div class="section-container">
        <div class="newsletter-editorial-card">
          <div class="newsletter-decor-glow" aria-hidden="true"></div>
          <div class="newsletter-grid">
            <div class="newsletter-left">
              <div class="newsletter-meta">
                <span class="meta-tag">PUBLICACIÓN SEMANAL</span>
                <span class="meta-edition">CADA JUEVES</span>
              </div>
              <h3 class="newsletter-title">Carta Living Connections</h3>
              <p class="newsletter-desc">
                Una reflexión breve, tres expresiones auténticas en inglés, francés y mandarín, y una recomendación cultural directa a tu bandeja de entrada.
              </p>
            </div>

            <div class="newsletter-right">
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
    </section>

  </main>

  ${renderSiteFooter()}
  ${renderConversionModals()}
`

initSiteNav()
initConversionModals()

// Lógica de suscripción a newsletter
const newsletterForm = document.querySelector('#newsletter-subscription-form')
const newsletterInput = document.querySelector('#newsletter-email')
const newsletterError = document.querySelector('#newsletter-error')
const newsletterSuccess = document.querySelector('#newsletter-success')
const newsletterResetBtn = document.querySelector('#newsletter-reset-btn')

if (newsletterForm && newsletterInput) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault()
    const val = newsletterInput.value.trim()
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

    if (!isValid) {
      if (newsletterError) newsletterError.hidden = false
      newsletterInput.focus()
      return
    }

    if (newsletterError) newsletterError.hidden = true
    try {
      const subs = JSON.parse(localStorage.getItem('vo_newsletter_subscribers') || '[]')
      if (!subs.includes(val)) {
        subs.push(val)
        localStorage.setItem('vo_newsletter_subscribers', JSON.stringify(subs))
      }
    } catch (_) {}

    newsletterForm.hidden = true
    if (newsletterSuccess) newsletterSuccess.hidden = false
  })

  newsletterResetBtn?.addEventListener('click', () => {
    newsletterInput.value = ''
    newsletterForm.hidden = false
    if (newsletterSuccess) newsletterSuccess.hidden = true
  })
}

// Botones de las 4 rutas hacia los modales
document.querySelector('#start-pathfinder-btn')?.addEventListener('click', () => {
  window.__voOpenPathfinderModal?.()
})

document.querySelector('#start-journey-btn')?.addEventListener('click', () => {
  window.__voOpenOrientationModal?.()
})

document.querySelector('#contact-b2b-cta')?.addEventListener('click', () => {
  window.__voOpenCorporateModal?.()
})
