import '../style.css'
import { renderSiteNav, initSiteNav } from '../components/siteNav.js'
import { renderSiteFooter } from '../components/siteFooter.js'
import { renderConversionModals, initConversionModals } from '../components/conversionModals.js'

document.querySelector('#app').innerHTML = `
  ${renderSiteNav({ activePage: 'languages' })}

  <main id="main-content" class="page-main">

    <!-- HERO EDITORIAL DE IDIOMAS -->
    <section class="page-hero-header">
      <div class="page-hero-ambient" aria-hidden="true"></div>
      <div class="section-container text-center">
        <div class="chapter-badge-wrap">
          <span class="chapter-number-pill pill-turquoise">IDIOMAS · OUR LANGUAGES</span>
        </div>
        <h1 class="page-hero-title">
          Inglés, Francés y Mandarín <br>
          <span class="highlight-turquoise">hechos a tu medida.</span>
        </h1>
        <p class="page-hero-lead max-lead-760">
          Un camino personalizado según tus metas y tu punto de partida. Toca cualquier tarjeta para descubrir expresiones reales y el enfoque cultural de cada idioma.
        </p>
      </div>
    </section>

    <!-- CUADRÍCULA DE TARJETAS 3D FLIP PARA LOS TRES IDIOMAS -->
    <section class="programs-section" style="padding-top: 40px;">
      <div class="section-container">

        <div class="languages-three-grid">

          <!-- TARJETA 1: INGLÉS -->
          <article class="lang-showcase-card english-theme" id="ingles" tabindex="0" role="region" aria-label="Tarjeta interactiva de Inglés">
            <div class="lang-card-inner">

              <!-- FRENTE: RESUMEN ESCANEABLE -->
              <div class="lang-card-face lang-card-front">
                <div class="card-ambient-glow" aria-hidden="true"></div>
                <div class="card-image-wrap">
                  <img src="/images/lang-english.jpg" alt="Estudiantes conversando en inglés" class="card-cover-photo" loading="lazy" />
                  <div class="card-badge-row">
                    <span class="card-kicker-tag">GLOBAL COMMERCE &amp; DIALOGUE</span>
                    <span class="card-level-pill">A1 a C2</span>
                  </div>
                </div>

                <div class="card-body-content">
                  <h3 class="card-lang-title">Inglés</h3>
                  <p class="card-lang-subtitle">Para trabajar, viajar y negociar con soltura</p>

                  <ul class="card-highlights-list" aria-label="Aspectos destacados de Inglés">
                    <li class="highlight-item">
                      <span class="highlight-bullet bullet-orange" aria-hidden="true">·</span>
                      <div class="highlight-text">
                        <strong>Conversación desde el primer día:</strong>
                        <span>Pierde el miedo y habla con naturalidad en reuniones y viajes.</span>
                      </div>
                    </li>
                    <li class="highlight-item">
                      <span class="highlight-bullet bullet-orange" aria-hidden="true">·</span>
                      <div class="highlight-text">
                        <strong>Preparación oficial estratégica:</strong>
                        <span>Entrenamiento enfocado para Duolingo English Test, IELTS y TOEFL.</span>
                      </div>
                    </li>
                    <li class="highlight-item">
                      <span class="highlight-bullet bullet-orange" aria-hidden="true">·</span>
                      <div class="highlight-text">
                        <strong>Acompañamiento 1 a 1:</strong>
                        <span>Temas y vocabulario adaptados a tus metas y tu tiempo real.</span>
                      </div>
                    </li>
                  </ul>

                  <div class="card-footer-action">
                    <button type="button" class="btn-card-flip-action" data-flip-target="ingles" aria-label="Girar tarjeta de Inglés para ver detalles culturales">
                      <span class="flip-icon" aria-hidden="true">↺</span>
                      <span class="flip-label">Ver detalle cultural</span>
                      <span class="flip-arrow" aria-hidden="true">→</span>
                    </button>
                    <button type="button" class="btn-direct-orient" data-lang="ingles">
                      Agendar orientación
                    </button>
                  </div>
                </div>
              </div>

              <!-- REVERSO: DESCUBRIMIENTO CULTURAL -->
              <div class="lang-card-face lang-card-back">
                <div class="card-back-ambient" aria-hidden="true"></div>
                <div class="card-back-header">
                  <div class="card-badge-row">
                    <span class="card-kicker-tag tag-violet">INMERSIÓN &amp; CULTURA</span>
                    <span class="card-level-pill">CEFR · CAMBRIDGE</span>
                  </div>
                  <h4 class="back-title">La voz del inglés global</h4>
                </div>

                <div class="card-back-body">
                  <div class="back-insight-block">
                    <span class="back-block-label">EXPRESIÓN CLAVE</span>
                    <blockquote class="back-quote">
                      «Cut to the chase»
                    </blockquote>
                    <p class="back-quote-meaning">
                      Ir directo al grano. Fundamental en la cultura de negocios anglosajona, donde la brevedad y la claridad son señal de respeto.
                    </p>
                  </div>

                  <div class="back-detail-list">
                    <div class="back-detail-row">
                      <strong>Niveles disponibles:</strong>
                      <span>Desde principiante absoluto (A1) hasta maestría profesional (C2).</span>
                    </div>
                    <div class="back-detail-row">
                      <strong>Enfoque pedagógico:</strong>
                      <span>Comunicación activa, audios auténticos y simulación de escenarios cotidianos.</span>
                    </div>
                    <div class="back-detail-row">
                      <strong>Práctica autónoma:</strong>
                      <span>Herramientas interactivas para ejercitar pronunciación a tu propio ritmo.</span>
                    </div>
                  </div>
                </div>

                <div class="card-back-footer">
                  <button type="button" class="btn-card-flip-return" data-flip-target="ingles" aria-label="Volver al frente de la tarjeta">
                    <span class="return-arrow" aria-hidden="true">←</span>
                    <span>Volver al resumen</span>
                  </button>
                  <button type="button" class="btn-card-primary-cta" data-lang="ingles">
                    <span>Agendar diagnóstico</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>

            </div>
          </article>


          <!-- TARJETA 2: FRANCÉS -->
          <article class="lang-showcase-card french-theme" id="frances" tabindex="0" role="region" aria-label="Tarjeta interactiva de Francés">
            <div class="lang-card-inner">

              <!-- FRENTE -->
              <div class="lang-card-face lang-card-front">
                <div class="card-ambient-glow" aria-hidden="true"></div>
                <div class="card-image-wrap">
                  <img src="/images/lang-french.jpg" alt="Conversación en un café parisino" class="card-cover-photo" loading="lazy" />
                  <div class="card-badge-row">
                    <span class="card-kicker-tag">DIPLOMATIE &amp; CULTURE</span>
                    <span class="card-level-pill">A1 a C2</span>
                  </div>
                </div>

                <div class="card-body-content">
                  <h3 class="card-lang-title">Francés</h3>
                  <p class="card-lang-subtitle">Para conectar con la francofonía y el pensamiento europeo</p>

                  <ul class="card-highlights-list" aria-label="Aspectos destacados de Francés">
                    <li class="highlight-item">
                      <span class="highlight-bullet bullet-turquoise" aria-hidden="true">·</span>
                      <div class="highlight-text">
                        <strong>Fonética clara desde el inicio:</strong>
                        <span>Aprende a pronunciar con confianza sin frustrarte con las vocales nasales.</span>
                      </div>
                    </li>
                    <li class="highlight-item">
                      <span class="highlight-bullet bullet-turquoise" aria-hidden="true">·</span>
                      <div class="highlight-text">
                        <strong>Preparación para DELF y DALF:</strong>
                        <span>Estrategia de comprensión oral y producción escrita para exámenes oficiales.</span>
                      </div>
                    </li>
                    <li class="highlight-item">
                      <span class="highlight-bullet bullet-turquoise" aria-hidden="true">·</span>
                      <div class="highlight-text">
                        <strong>Cultura viva y literatura:</strong>
                        <span>Contexto social contemporáneo de Francia, Canadá y países francófonos.</span>
                      </div>
                    </li>
                  </ul>

                  <div class="card-footer-action">
                    <button type="button" class="btn-card-flip-action" data-flip-target="frances" aria-label="Girar tarjeta de Francés para ver detalles culturales">
                      <span class="flip-icon" aria-hidden="true">↺</span>
                      <span class="flip-label">Ver detalle cultural</span>
                      <span class="flip-arrow" aria-hidden="true">→</span>
                    </button>
                    <button type="button" class="btn-direct-orient" data-lang="frances">
                      Agendar orientación
                    </button>
                  </div>
                </div>
              </div>

              <!-- REVERSO -->
              <div class="lang-card-face lang-card-back">
                <div class="card-back-ambient" aria-hidden="true"></div>
                <div class="card-back-header">
                  <div class="card-badge-row">
                    <span class="card-kicker-tag tag-turquoise">INMERSIÓN &amp; ESTILO</span>
                    <span class="card-level-pill">DELF · DALF</span>
                  </div>
                  <h4 class="back-title">L'art de la conversation</h4>
                </div>

                <div class="card-back-body">
                  <div class="back-insight-block">
                    <span class="back-block-label">EXPRESIÓN CLAVE</span>
                    <blockquote class="back-quote">
                      «Avoir le coup de foudre»
                    </blockquote>
                    <p class="back-quote-meaning">
                      Sentir un flechazo inmediato. El francés es una lengua que une precisión intelectual y calidez expresiva en cada diálogo.
                    </p>
                  </div>

                  <div class="back-detail-list">
                    <div class="back-detail-row">
                      <strong>Niveles disponibles:</strong>
                      <span>A1 Débutant hasta C2 Maîtrise.</span>
                    </div>
                    <div class="back-detail-row">
                      <strong>Enfoque pedagógico:</strong>
                      <span>Simulaciones de vida cotidiana, gastronomía, debates de actualidad y cine.</span>
                    </div>
                    <div class="back-detail-row">
                      <strong>Acompañamiento:</strong>
                      <span>Docentes con pasión por la francofonía y corrección guiada sin presión.</span>
                    </div>
                  </div>
                </div>

                <div class="card-back-footer">
                  <button type="button" class="btn-card-flip-return" data-flip-target="frances" aria-label="Volver al frente de la tarjeta">
                    <span class="return-arrow" aria-hidden="true">←</span>
                    <span>Volver al resumen</span>
                  </button>
                  <button type="button" class="btn-card-primary-cta" data-lang="frances">
                    <span>Agendar diagnóstico</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>

            </div>
          </article>


          <!-- TARJETA 3: MANDARÍN -->
          <article class="lang-showcase-card mandarin-theme" id="mandarin" tabindex="0" role="region" aria-label="Tarjeta interactiva de Mandarín">
            <div class="lang-card-inner">

              <!-- FRENTE -->
              <div class="lang-card-face lang-card-front">
                <div class="card-ambient-glow" aria-hidden="true"></div>
                <div class="card-image-wrap">
                  <img src="/images/lang-mandarin.jpg" alt="Profesor enseñando caligrafía y mandarín" class="card-cover-photo" loading="lazy" />
                  <div class="card-badge-row">
                    <span class="card-kicker-tag tag-yellow">COMERCIO &amp; NEGOCIOS</span>
                    <span class="card-level-pill">HSK 1 a 6</span>
                  </div>
                </div>

                <div class="card-body-content">
                  <h3 class="card-lang-title">Mandarín: Comunicación, Cultura &amp; Negocios</h3>
                  <p class="card-lang-subtitle">Para conectar directamente con la economía más dinámica de Asia</p>

                  <ul class="card-highlights-list" aria-label="Aspectos destacados de Mandarín">
                    <li class="highlight-item">
                      <span class="highlight-bullet bullet-yellow" aria-hidden="true">·</span>
                      <div class="highlight-text">
                        <strong>Pensamiento directo y soltura comunicativa desde las primeras sesiones:</strong>
                        <span>Pierde el mito de la dificultad aprendiendo a comunicarte desde el primer mes.</span>
                      </div>
                    </li>
                    <li class="highlight-item">
                      <span class="highlight-bullet bullet-yellow" aria-hidden="true">·</span>
                      <div class="highlight-text">
                        <strong>Comprensión fonética (pinyin) y caracteres esenciales:</strong>
                        <span>Método auditivo guiado para dominar los tonos y la estructura del idioma.</span>
                      </div>
                    </li>
                    <li class="highlight-item">
                      <span class="highlight-bullet bullet-yellow" aria-hidden="true">·</span>
                      <div class="highlight-text">
                        <strong>HSK 1 A 6 y protocolo comercial:</strong>
                        <span>Preparación estratégica para exámenes oficiales y negociación con contrapartes en Asia.</span>
                      </div>
                    </li>
                  </ul>

                  <div class="card-footer-action">
                    <button type="button" class="btn-card-flip-action" data-flip-target="mandarin" aria-label="Girar tarjeta de Mandarín para ver detalles culturales">
                      <span class="flip-icon" aria-hidden="true">↺</span>
                      <span class="flip-label">Ver detalle cultural</span>
                      <span class="flip-arrow" aria-hidden="true">→</span>
                    </button>
                    <button type="button" class="btn-direct-orient" data-lang="mandarin">
                      Agendar orientación
                    </button>
                  </div>
                </div>
              </div>

              <!-- REVERSO -->
              <div class="lang-card-face lang-card-back">
                <div class="card-back-ambient" aria-hidden="true"></div>
                <div class="card-back-header">
                  <div class="card-badge-row">
                    <span class="card-kicker-tag tag-yellow">PROTOCOLO &amp; VISIÓN</span>
                    <span class="card-level-pill">HSK · HANBAN</span>
                  </div>
                  <h4 class="back-title">El poder del Guanxi (关系)</h4>
                </div>

                <div class="card-back-body">
                  <div class="back-insight-block">
                    <span class="back-block-label">CONCEPTO FUNDAMENTAL</span>
                    <blockquote class="back-quote">
                      «Guanxi · 关系»
                     red de relaciones de confianza mutua. En China, los negocios se cierran después de construir una relación humana sincera.
                    </blockquote>
                    <p class="back-quote-meaning">
                      Aprender mandarín te permite sentarte en una mesa de negociación mostrando respeto y comprensión de su cosmovisión.
                    </p>
                  </div>

                  <div class="back-detail-list">
                    <div class="back-detail-row">
                      <strong>Niveles oficiales:</strong>
                      <span>HSK 1 a 6 con preparación estratégica para exámenes oficiales.</span>
                    </div>
                    <div class="back-detail-row">
                      <strong>Transparencia pedagógica:</strong>
                      <span>Te preparamos rigurosamente para tus pruebas oficiales; el examen se rinde ante las entidades certificadoras internacionales.</span>
                    </div>
                    <div class="back-detail-row">
                      <strong>Modalidad:</strong>
                      <span>Individual 1 a 1 o programas corporativos para equipos de comercio exterior.</span>
                    </div>
                  </div>
                </div>

                <div class="card-back-footer">
                  <button type="button" class="btn-card-flip-return" data-flip-target="mandarin" aria-label="Volver al frente de la tarjeta">
                    <span class="return-arrow" aria-hidden="true">←</span>
                    <span>Volver al resumen</span>
                  </button>
                  <button type="button" class="btn-card-primary-cta" data-lang="mandarin">
                    <span>Agendar diagnóstico</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>

            </div>
          </article>

        </div>

        <!-- TRANSPARENCIA PEDAGÓGICA Y NIVELES -->
        <div class="pedagogical-transparency-card">
          <div class="transparency-kicker">
            <span class="transparency-dot" aria-hidden="true"></span>
            <span>TRANSPARENCIA PEDAGÓGICA VERA ORBIS</span>
          </div>
          <h3>Orientación honesta hacia marcos internacionales</h3>
          <p>
            En Vera Orbis te preparamos de manera rigurosa y personalizada para que alcances tu mejor nivel en exámenes oficiales (IELTS, TOEFL, Duolingo English Test, DELF, DALF y HSK). Te acompañamos con honestidad pedagógica en cada sesión formativa.
          </p>
          <div class="transparency-cta-row">
            <a href="/contact" class="btn-pedagogy-cta">
              <span>Agendar llamada de nivelación gratuita</span>
              <span aria-hidden="true">→</span>
            </a>
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

// Lógica interactiva de giro de tarjetas (Flip 3D)
const cards = document.querySelectorAll('.lang-showcase-card')
cards.forEach(card => {
  const flipTriggers = card.querySelectorAll('.btn-card-flip-action')
  const returnTriggers = card.querySelectorAll('.btn-card-flip-return')
  const orientBtns = card.querySelectorAll('.btn-direct-orient, .btn-card-primary-cta')

  flipTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      card.classList.add('is-flipped')
      card.setAttribute('aria-expanded', 'true')
    })
  })

  returnTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      card.classList.remove('is-flipped')
      card.setAttribute('aria-expanded', 'false')
    })
  })

  orientBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const lang = btn.getAttribute('data-lang')
      if (typeof window.__voOpenOrientationModal === 'function') {
        window.__voOpenOrientationModal({ lang })
      } else {
        window.location.href = '/contact?lang=' + lang
      }
    })
  })
})
