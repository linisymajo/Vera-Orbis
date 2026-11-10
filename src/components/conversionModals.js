/**
 * Componente modular de Modales de Conversión (B2C, B2B y Orientador Interactivo)
 * Se sincroniza con localStorage y envía prospectos al Sales Engine.
 */

export function renderConversionModals() {
  return `
  <!-- =========================================
       MODAL: ORIENTADOR INTERACTIVO (PATHFINDER)
  ========================================== -->
  <div id="pathfinder-modal" class="conv-modal-container" role="dialog" aria-modal="true" aria-labelledby="pathfinder-modal-title" hidden>
    <div class="conv-modal-backdrop" id="pathfinder-modal-backdrop"></div>
    <div class="conv-modal-dialog">

      <button type="button" class="conv-modal-close" id="pathfinder-modal-close-btn" aria-label="Cerrar cuestionario">&times;</button>

      <div class="conv-modal-header">
        <span class="conv-modal-kicker">ORIENTADOR INTERACTIVO · 3 PASOS</span>
        <h3 class="conv-modal-title" id="pathfinder-modal-title">Encuentra tu ruta de aprendizaje</h3>
        <p class="conv-modal-lead">Responde tres preguntas sencillas para identificar el programa que mejor se adapta a tus metas y disponibilidad.</p>
      </div>

      <div class="conv-modal-body">

        <!-- Barra de Progreso del Cuestionario -->
        <div class="pathfinder-progress" aria-hidden="true">
          <div class="pathfinder-progress-bar" id="pathfinder-bar" style="width: 33%;"></div>
        </div>
        <div class="pathfinder-step-indicator">
          <span id="pathfinder-step-text">Paso 1 de 3</span>
        </div>

        <!-- Paso 1: Objetivo Principal -->
        <div class="pathfinder-step-view is-active" id="pathfinder-step-1">
          <h4 class="pathfinder-question-title">¿Cuál es tu meta principal con el idioma?</h4>
          <div class="pathfinder-options-grid">
            <button type="button" class="pathfinder-option-btn" data-step="1" data-val="conversacion">
              <div class="pathfinder-option-content">
                <h4>Fluidez conversacional cotidiana</h4>
                <p>Hablar sin miedo, viajar con confianza y conectar con personas de otras culturas.</p>
              </div>
              <span class="pathfinder-option-arrow" aria-hidden="true">→</span>
            </button>

            <button type="button" class="pathfinder-option-btn" data-step="1" data-val="trabajo">
              <div class="pathfinder-option-content">
                <h4>Crecimiento profesional &amp; negocios</h4>
                <p>Presentaciones, entrevistas laborales internacionales y comunicación de trabajo.</p>
              </div>
              <span class="pathfinder-option-arrow" aria-hidden="true">→</span>
            </button>

            <button type="button" class="pathfinder-option-btn" data-step="1" data-val="examen">
              <div class="pathfinder-option-content">
                <h4>Certificación oficial (IELTS, DELF, HSK)</h4>
                <p>Preparación enfocada para rendir exámenes oficiales internacionales.</p>
              </div>
              <span class="pathfinder-option-arrow" aria-hidden="true">→</span>
            </button>

            <button type="button" class="pathfinder-option-btn" data-step="1" data-val="negocios_asia">
              <div class="pathfinder-option-content">
                <h4>Comercio exterior &amp; relaciones con Asia</h4>
                <p>Negociación, etiqueta comercial y comunicación estratégica en mandarín.</p>
              </div>
              <span class="pathfinder-option-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        <!-- Paso 2: Idioma -->
        <div class="pathfinder-step-view" id="pathfinder-step-2" hidden>
          <h4 class="pathfinder-question-title">¿Qué idioma deseas aprender o perfeccionar?</h4>
          <div class="pathfinder-options-grid">
            <button type="button" class="pathfinder-option-btn" data-step="2" data-val="ingles">
              <div class="pathfinder-option-content">
                <h4>Inglés</h4>
                <p>Global Commerce &amp; Communication (A1 a C2).</p>
              </div>
              <span class="pathfinder-option-arrow" aria-hidden="true">→</span>
            </button>

            <button type="button" class="pathfinder-option-btn" data-step="2" data-val="frances">
              <div class="pathfinder-option-content">
                <h4>Francés</h4>
                <p>Diplomatie, Culture &amp; Société (DELF y DALF).</p>
              </div>
              <span class="pathfinder-option-arrow" aria-hidden="true">→</span>
            </button>

            <button type="button" class="pathfinder-option-btn" data-step="2" data-val="mandarin">
              <div class="pathfinder-option-content">
                <h4>Mandarín</h4>
                <p>Comunicación, Cultura &amp; Negocios (HSK 1 a 6).</p>
              </div>
              <span class="pathfinder-option-arrow" aria-hidden="true">→</span>
            </button>

            <button type="button" class="pathfinder-option-btn" data-step="2" data-val="multiple">
              <div class="pathfinder-option-content">
                <h4>Aún no lo decido / Múltiples idiomas</h4>
                <p>Quiero recibir orientación personalizada según mi perfil y proyectos.</p>
              </div>
              <span class="pathfinder-option-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        <!-- Paso 3: Modalidad / Formato -->
        <div class="pathfinder-step-view" id="pathfinder-step-3" hidden>
          <h4 class="pathfinder-question-title">¿En qué modalidad te gustaría aprender?</h4>
          <div class="pathfinder-options-grid">
            <button type="button" class="pathfinder-option-btn" data-step="3" data-val="individual">
              <div class="pathfinder-option-content">
                <h4>Clases individuales 1 a 1</h4>
                <p>100% personalizadas a mi ritmo, mis temas de interés y mis horarios.</p>
              </div>
              <span class="pathfinder-option-arrow" aria-hidden="true">→</span>
            </button>

            <button type="button" class="pathfinder-option-btn" data-step="3" data-val="equipo">
              <div class="pathfinder-option-content">
                <h4>Para mi equipo de empresa (B2B)</h4>
                <p>Programa corporativo grupal para colaboradores o áreas de trabajo específicas.</p>
              </div>
              <span class="pathfinder-option-arrow" aria-hidden="true">→</span>
            </button>

            <button type="button" class="pathfinder-option-btn" data-step="3" data-val="lider">
              <div class="pathfinder-option-content">
                <h4>Aceleración privada para líderes</h4>
                <p>Acompañamiento ejecutivo confidencial para directores, founders y portavoces.</p>
              </div>
              <span class="pathfinder-option-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        <!-- Pantalla de Resultado Recomendado -->
        <div class="pathfinder-step-view" id="pathfinder-step-result" hidden>
          <div class="pathfinder-result-box">
            <span class="pathfinder-result-badge" id="pathfinder-rec-badge">RUTA RECOMENDADA</span>
            <h3 id="pathfinder-rec-title">Acompañamiento Personalizado 1 a 1</h3>
            <p id="pathfinder-rec-desc">
              Diseñamos una ruta formativa a tu medida con sesiones de conversación activa y retroalimentación constructiva de tu profesor.
            </p>
            <div class="pathfinder-features-list">
              <div class="pathfinder-feature-item">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10l4 4L16 6" stroke="#20C7B5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span>Sesiones dinámicas enfocadas en habla y comprensión cultural.</span>
              </div>
              <div class="pathfinder-feature-item">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10l4 4L16 6" stroke="#20C7B5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span>Profesores dedicados y seguimiento continuo de tu evolución.</span>
              </div>
              <div class="pathfinder-feature-item">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10l4 4L16 6" stroke="#20C7B5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span>Horarios flexibles adaptados a tus semanas laborales.</span>
              </div>
            </div>
          </div>

          <div class="conv-success-actions">
            <button type="button" class="conv-submit-btn" id="pathfinder-action-book">
              <span>Agendar llamada con esta ruta</span>
              <span aria-hidden="true">→</span>
            </button>
            <button type="button" class="btn-success-reset" id="pathfinder-reset-btn">
              Volver a responder el cuestionario
            </button>
          </div>
        </div>

      </div>

    </div>
  </div>


  <!-- =========================================
       MODAL: LLAMADA DE ORIENTACIÓN (B2C)
  ========================================== -->
  <div id="orientation-modal" class="conv-modal-container" role="dialog" aria-modal="true" aria-labelledby="orientation-modal-title" hidden>
    <div class="conv-modal-backdrop" id="orientation-modal-backdrop"></div>
    <div class="conv-modal-dialog">

      <button type="button" class="conv-modal-close" id="orientation-modal-close-btn" aria-label="Cerrar formulario">&times;</button>

      <div class="conv-modal-header">
        <span class="conv-modal-kicker">APRENDIZAJE PERSONALIZADO 1 A 1</span>
        <h3 class="conv-modal-title" id="orientation-modal-title">Agendar sesión de orientación</h3>
        <p class="conv-modal-lead">Una conversación de 15 minutos sin costo para conocer tus metas, resolver tus preguntas y definir tu ruta de estudio.</p>
      </div>

      <div class="conv-modal-body">

        <!-- Formulario B2C -->
        <form class="conv-form" id="orientation-form" novalidate>

          <div class="conv-form-group">
            <label for="orient-name" class="conv-label">Nombre y apellido *</label>
            <input type="text" id="orient-name" class="conv-input" placeholder="Ej. Camila Morales" required autocomplete="name" />
          </div>

          <div class="conv-form-row">
            <div class="conv-form-group">
              <label for="orient-email" class="conv-label">Correo electrónico *</label>
              <input type="email" id="orient-email" class="conv-input" placeholder="camila@ejemplo.com" required autocomplete="email" />
            </div>
            <div class="conv-form-group">
              <label for="orient-phone" class="conv-label">WhatsApp o teléfono *</label>
              <input type="tel" id="orient-phone" class="conv-input" placeholder="+57 300 123 4567" required autocomplete="tel" />
            </div>
          </div>

          <div class="conv-form-row">
            <div class="conv-form-group">
              <label for="orient-lang" class="conv-label">Idioma de interés *</label>
              <select id="orient-lang" class="conv-select" required>
                <option value="">Selecciona un idioma</option>
                <option value="ingles">Inglés (Global Commerce)</option>
                <option value="frances">Francés (Diplomatie &amp; Culture)</option>
                <option value="mandarin">Mandarín (Cultura &amp; Negocios)</option>
                <option value="multiple">Más de un idioma / Por definir</option>
              </select>
            </div>
            <div class="conv-form-group">
              <label for="orient-goal" class="conv-label">¿Qué quieres lograr? *</label>
              <select id="orient-goal" class="conv-select" required>
                <option value="">Selecciona tu meta principal</option>
                <option value="fluidez">Soltura y conversación general</option>
                <option value="trabajo">Uso profesional y reuniones</option>
                <option value="viaje">Viajes y estancia en el extranjero</option>
                <option value="examen">Preparación para examen oficial</option>
                <option value="inicio">Aprender desde cero absoluto</option>
              </select>
            </div>
          </div>

          <div class="conv-form-group">
            <label for="orient-time" class="conv-label">Horario preferido para la llamada de 15 min</label>
            <select id="orient-time" class="conv-select">
              <option value="manana">Mañanas (8:00 AM - 12:00 PM)</option>
              <option value="tarde">Tardes (1:00 PM - 5:00 PM)</option>
              <option value="noche">Noches (5:00 PM - 8:00 PM)</option>
            </select>
          </div>

          <div class="conv-form-group">
            <label for="orient-notes" class="conv-label">¿Algo que te gustaría contarnos antes de hablar?</label>
            <textarea id="orient-notes" class="conv-textarea" rows="2" placeholder="Ej. He estudiado antes pero me cuesta hablar, o viajo en 6 meses..."></textarea>
          </div>

          <div class="conv-error-msg" id="orient-error-msg" hidden>
            Por favor completa los campos obligatorios marcados con asterisco (*).
          </div>

          <button type="submit" class="conv-submit-btn" id="orient-submit">
            <span class="btn-text">Confirmar y solicitar sesión</span>
            <span class="btn-arrow" aria-hidden="true">→</span>
          </button>

          <p class="conv-privacy-hint">
            Respetamos tu privacidad. Tus datos se usan únicamente para coordinar tu orientación académica.
          </p>

        </form>

        <!-- Estado de Confirmación Exitoso -->
        <div class="conv-success-state" id="orientation-success" hidden>
          <div class="conv-success-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h4>¡Solicitud recibida con éxito!</h4>
          <p>
            Te contactaremos vía WhatsApp o correo en un plazo máximo de 24 horas hábiles para confirmar el día y hora exactos de tu llamada.
          </p>
          <div class="conv-success-actions">
            <a href="https://wa.me/573123035708?text=Hola%20Vera%20Orbis.%20Acabo%20de%20agendar%20mi%20sesi%C3%B3n%20de%20orientaci%C3%B3n." class="conv-btn-whatsapp" target="_blank" rel="noopener noreferrer">
              <span>Escribir ahora por WhatsApp</span>
              <span aria-hidden="true">→</span>
            </a>
            <button type="button" class="btn-success-reset" id="orient-close-after-success">
              Cerrar ventana
            </button>
          </div>
        </div>

      </div>

    </div>
  </div>


  <!-- =========================================
       MODAL: PROPUESTA CORPORATIVA B2B
  ========================================== -->
  <div id="corporate-modal" class="conv-modal-container" role="dialog" aria-modal="true" aria-labelledby="corporate-modal-title" hidden>
    <div class="conv-modal-backdrop" id="corporate-modal-backdrop"></div>
    <div class="conv-modal-dialog">

      <button type="button" class="conv-modal-close" id="corporate-modal-close-btn" aria-label="Cerrar formulario">&times;</button>

      <div class="conv-modal-header">
        <span class="conv-modal-kicker">SOLUCIONES PARA EQUIPOS &amp; EMPRESAS</span>
        <h3 class="conv-modal-title" id="corporate-modal-title">Solicitar propuesta para tu equipo</h3>
        <p class="conv-modal-lead">Desarrollamos diagnósticos lingüísticos de entrada y programas comunicativos adaptados a los retos de tu organización.</p>
      </div>

      <div class="conv-modal-body">

        <!-- Formulario B2B -->
        <form class="conv-form" id="corporate-form" novalidate>

          <div class="conv-form-row">
            <div class="conv-form-group">
              <label for="corp-company" class="conv-label">Empresa u Organización *</label>
              <input type="text" id="corp-company" class="conv-input" placeholder="Ej. Globant, Terpel, Startup..." required />
            </div>
            <div class="conv-form-group">
              <label for="corp-name" class="conv-label">Tu nombre y cargo *</label>
              <input type="text" id="corp-name" class="conv-input" placeholder="Ej. Mateo Gómez · People Lead" required />
            </div>
          </div>

          <div class="conv-form-row">
            <div class="conv-form-group">
              <label for="corp-email" class="conv-label">Correo corporativo *</label>
              <input type="email" id="corp-email" class="conv-input" placeholder="mateo@empresa.com" required autocomplete="email" />
            </div>
            <div class="conv-form-group">
              <label for="corp-phone" class="conv-label">Teléfono o WhatsApp corporativo *</label>
              <input type="tel" id="corp-phone" class="conv-input" placeholder="+57 310 987 6543" required autocomplete="tel" />
            </div>
          </div>

          <div class="conv-form-row">
            <div class="conv-form-group">
              <label for="corp-team-size" class="conv-label">Número aproximado de colaboradores</label>
              <select id="corp-team-size" class="conv-select">
                <option value="1_a_5">1 a 5 personas (Aceleración Ejecutiva / Líderes)</option>
                <option value="6_a_15">6 a 15 colaboradores (Área o Equipo)</option>
                <option value="16_a_50">16 a 50 colaboradores</option>
                <option value="mas_de_50">Más de 50 colaboradores (Plan Empresa)</option>
              </select>
            </div>
            <div class="conv-form-group">
              <label for="corp-lang" class="conv-label">Idioma(s) de interés corporativo</label>
              <select id="corp-lang" class="conv-select">
                <option value="ingles_b2b">Inglés de Negocios &amp; Comercio Global</option>
                <option value="mandarin_b2b">Mandarín Comercial &amp; Protocolo con Asia</option>
                <option value="frances_b2b">Francés Corporativo &amp; Diplomático</option>
                <option value="mixto">Múltiples idiomas para diferentes áreas</option>
              </select>
            </div>
          </div>

          <div class="conv-form-group">
            <label for="corp-needs" class="conv-label">Cuéntanos sobre las necesidades comunicativas de tu equipo</label>
            <textarea id="corp-needs" class="conv-textarea" rows="2" placeholder="Ej. Necesitamos que los líderes negocien directamente en inglés o mandarín sin traductores..."></textarea>
          </div>

          <div class="conv-error-msg" id="corp-error-msg" hidden>
            Por favor completa los campos obligatorios marcados con asterisco (*).
          </div>

          <button type="submit" class="conv-submit-btn" id="corp-submit">
            <span class="btn-text">Pedir propuesta personalizada</span>
            <span class="btn-arrow" aria-hidden="true">→</span>
          </button>

          <p class="conv-privacy-hint">
            Confidencialidad garantizada. Responderemos con una propuesta formal en menos de 24 horas laborables.
          </p>

        </form>

        <!-- Estado de Confirmación Exitoso B2B -->
        <div class="conv-success-state" id="corporate-success" hidden>
          <div class="conv-success-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h4>¡Propuesta corporativa solicitada!</h4>
          <p>
            Nuestro equipo de consultoría empresarial revisará los datos y se comunicará contigo para presentarte un diagnóstico y presupuesto adaptado.
          </p>
          <div class="conv-success-actions">
            <a href="https://wa.me/573123035708?text=Hola%20Vera%20Orbis.%20Acabo%20de%20solicitar%20una%20propuesta%20corporativa%20B2B." class="conv-btn-whatsapp" target="_blank" rel="noopener noreferrer">
              <span>Hablar con consultor por WhatsApp</span>
              <span aria-hidden="true">→</span>
            </a>
            <button type="button" class="btn-success-reset" id="corp-close-after-success">
              Cerrar ventana
            </button>
          </div>
        </div>

      </div>

    </div>
  </div>
  `
}

/**
 * Guarda el prospecto en localStorage y se conecta al Sales Engine.
 */
function saveInquiry(inquiryData) {
  try {
    const inquiries = JSON.parse(localStorage.getItem('vo_inquiries') || '[]')
    const item = {
      id: 'inq_' + Date.now(),
      created_at: new Date().toISOString(),
      ...inquiryData
    }
    inquiries.unshift(item)
    localStorage.setItem('vo_inquiries', JSON.stringify(inquiries.slice(0, 100)))

    // Sincronizar con el Vera Revenue Engine (CRM, scoring y agendamiento)
    if (typeof fetch !== 'undefined') {
      const isB2B = Boolean(item.type && item.type.includes('b2b'))
      const prospectName = item.name || item.contact_name || item.company || 'Interesado Web'
      const payload = {
        name: prospectName,
        email: item.email || null,
        phone: item.phone || null,
        organization: item.company || (isB2B ? prospectName : ''),
        language: item.language || item.data?.lang || 'english',
        goal: item.goal || item.data?.goal || item.recommended_route || '',
        preferred_time: item.preferred_time || '',
        notes: item.notes || item.needs || item.recommended_route || '',
        team_size: item.team_size || '',
        type: item.type || 'b2c_orientation',
        source: 'Website Inbound Form',
        source_url: typeof window !== 'undefined' ? window.location.href : 'https://veraorbis.studio/contact/',
        data_origin: 'live',
        is_demo: false
      }

      // Endpoint dedicado de conversión directa en el Revenue Engine
      fetch('/api/sales-engine/inbound-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {
        // Fallback a /prospects
        fetch('/api/sales-engine/prospects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            notes: typeof payload.notes === 'string' ? payload.notes : JSON.stringify(item),
            evidence: `Inquiry submitted via veraorbis.com modal (${item.type || 'web'}).`
          })
        }).catch(() => {})
      })
    }
  } catch (_) {}
}

/**
 * Inicializa todos los modales de conversión.
 */
export function initConversionModals() {
  // 1. Orientador Interactivo (Pathfinder)
  initPathfinderModalLogic()

  // 2. Modal Orientación B2C
  initOrientationModalLogic()

  // 3. Modal Corporativo B2B
  initCorporateModalLogic()
}

function initPathfinderModalLogic() {
  const modal = document.querySelector('#pathfinder-modal')
  const closeBtn = document.querySelector('#pathfinder-modal-close-btn')
  const backdrop = document.querySelector('#pathfinder-modal-backdrop')
  const stepText = document.querySelector('#pathfinder-step-text')
  const progressBar = document.querySelector('#pathfinder-bar')
  const step1 = document.querySelector('#pathfinder-step-1')
  const step2 = document.querySelector('#pathfinder-step-2')
  const step3 = document.querySelector('#pathfinder-step-3')
  const stepResult = document.querySelector('#pathfinder-step-result')
  const resetBtn = document.querySelector('#pathfinder-reset-btn')
  const actionBookBtn = document.querySelector('#pathfinder-action-book')

  if (!modal || !step1) return

  const userChoices = { goal: null, lang: null, mode: null }
  const recTitle = document.querySelector('#pathfinder-rec-title')
  const recBadge = document.querySelector('#pathfinder-rec-badge')
  const recDesc = document.querySelector('#pathfinder-rec-desc')

  const openModal = () => {
    modal.removeAttribute('hidden')
    modal.classList.add('is-active')
    document.body.classList.add('modal-open')
  }

  const closeModal = () => {
    modal.classList.remove('is-active')
    document.body.classList.remove('modal-open')
    setTimeout(() => {
      modal.setAttribute('hidden', '')
    }, 280)
  }

  closeBtn?.addEventListener('click', closeModal)
  backdrop?.addEventListener('click', closeModal)

  const resetQuiz = () => {
    userChoices.goal = null
    userChoices.lang = null
    userChoices.mode = null

    if (progressBar) progressBar.style.width = '33%'
    if (stepText) stepText.textContent = 'Paso 1 de 3'

    step1.hidden = false
    step2.hidden = true
    step3.hidden = true
    stepResult.hidden = true
  }

  resetBtn?.addEventListener('click', resetQuiz)

  document.querySelectorAll('.pathfinder-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const step = btn.getAttribute('data-step')
      const val = btn.getAttribute('data-val')

      if (step === '1') {
        userChoices.goal = val
        step1.hidden = true
        step2.hidden = false
        if (stepText) stepText.textContent = 'Paso 2 de 3'
        if (progressBar) progressBar.style.width = '66%'
      } else if (step === '2') {
        userChoices.lang = val
        step2.hidden = true
        step3.hidden = false
        if (stepText) stepText.textContent = 'Paso 3 de 3'
        if (progressBar) progressBar.style.width = '100%'
      } else if (step === '3') {
        userChoices.mode = val
        step3.hidden = true
        stepResult.hidden = false
        if (stepText) stepText.textContent = 'Ruta sugerida'

        let title = 'Acompañamiento Personalizado 1 a 1'
        let badge = 'RUTA PERSONALIZADA 1 A 1'
        let desc = 'Un camino flexible adaptado a tus metas, diseñado para soltar el habla y ganar confianza real con acompañamiento continuo de tu profesor.'

        if (userChoices.mode === 'equipo' || userChoices.goal === 'negocios_asia') {
          title = 'Programa de Comunicación Corporativa B2B'
          badge = 'FORMATO EQUIPOS Y EMPRESAS'
          desc = 'Entrenamiento grupal e intensivo en situaciones laborales auténticas: videollamadas con sedes internacionales, negociaciones con proveedores en Asia y presentaciones de producto.'
        } else if (userChoices.goal === 'examen') {
          title = 'Preparación Estratégica para Examen Oficial'
          badge = 'ENTRENAMIENTO EXÁMENES OFICIALES'
          desc = 'Entrenamiento riguroso de habilidades comunicativas para que alcances el puntaje o banda que necesitas al presentar tus pruebas ante las entidades oficiales (DELF, DALF, HSK, IELTS, TOEFL).'
        } else if (userChoices.mode === 'lider') {
          title = 'Aceleración Ejecutiva 1 a 1 para Líderes'
          badge = 'LIDERAZGO Y NEGOCIOS'
          desc = 'Sesiones directas, privadas y confidenciales sobre tus discursos y presentaciones reales ante clientes extranjeros o inversionistas.'
        }

        if (recTitle) recTitle.textContent = title
        if (recBadge) recBadge.textContent = badge
        if (recDesc) recDesc.textContent = desc

        saveInquiry({
          type: 'pathfinder_completed',
          data: userChoices,
          recommended_route: title
        })
      }
    })
  })

  actionBookBtn?.addEventListener('click', () => {
    closeModal()
    setTimeout(() => {
      if (userChoices.mode === 'equipo') {
        window.__voOpenCorporateModal?.({
          lang: userChoices.lang === 'mandarin' ? 'mandarin_b2b' : 'ingles_b2b',
          notes: 'Ruta orientador: ' + (recTitle?.textContent || '')
        })
      } else {
        window.__voOpenOrientationModal?.({
          lang: userChoices.lang,
          notes: 'Ruta orientador: ' + (recTitle?.textContent || '')
        })
      }
    }, 320)
  })

  window.__voOpenPathfinderModal = openModal
}

function initOrientationModalLogic() {
  const modal = document.querySelector('#orientation-modal')
  const closeBtn = document.querySelector('#orientation-modal-close-btn')
  const backdrop = document.querySelector('#orientation-modal-backdrop')
  const form = document.querySelector('#orientation-form')
  const successBox = document.querySelector('#orientation-success')
  const closeSuccessBtn = document.querySelector('#orient-close-after-success')
  const langSelect = document.querySelector('#orient-lang')
  const notesField = document.querySelector('#orient-notes')

  if (!modal || !form) return

  const openModal = (options = {}) => {
    if (options.lang && langSelect) {
      langSelect.value = options.lang
    }
    if (options.notes && notesField && !notesField.value) {
      notesField.value = options.notes
    }

    form.hidden = false
    if (successBox) successBox.hidden = true

    modal.removeAttribute('hidden')
    modal.classList.add('is-active')
    document.body.classList.add('modal-open')
    document.querySelector('#orient-name')?.focus()
  }

  const closeModal = () => {
    modal.classList.remove('is-active')
    document.body.classList.remove('modal-open')
    setTimeout(() => {
      modal.setAttribute('hidden', '')
    }, 280)
  }

  closeBtn?.addEventListener('click', closeModal)
  backdrop?.addEventListener('click', closeModal)
  closeSuccessBtn?.addEventListener('click', closeModal)

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const name = document.querySelector('#orient-name')?.value.trim()
    const email = document.querySelector('#orient-email')?.value.trim()
    const phone = document.querySelector('#orient-phone')?.value.trim()
    const lang = document.querySelector('#orient-lang')?.value
    const goal = document.querySelector('#orient-goal')?.value
    const time = document.querySelector('#orient-time')?.value
    const notes = notesField?.value.trim()
    const errorMsg = document.querySelector('#orient-error-msg')

    if (!name || !email || !phone || !lang || !goal) {
      if (errorMsg) errorMsg.hidden = false
      return
    }

    if (errorMsg) errorMsg.hidden = true

    const submitBtn = document.querySelector('#orient-submit')
    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.classList.add('is-submitting')
    }

    saveInquiry({
      type: 'b2c_orientation',
      name,
      email,
      phone,
      language: lang,
      goal,
      preferred_time: time,
      notes
    })

    setTimeout(() => {
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.classList.remove('is-submitting')
      }
      form.hidden = true
      if (successBox) successBox.hidden = false
    }, 600)
  })

  window.__voOpenOrientationModal = openModal
}

function initCorporateModalLogic() {
  const modal = document.querySelector('#corporate-modal')
  const closeBtn = document.querySelector('#corporate-modal-close-btn')
  const backdrop = document.querySelector('#corporate-modal-backdrop')
  const form = document.querySelector('#corporate-form')
  const successBox = document.querySelector('#corporate-success')
  const closeSuccessBtn = document.querySelector('#corp-close-after-success')
  const langSelect = document.querySelector('#corp-lang')
  const notesField = document.querySelector('#corp-needs')

  if (!modal || !form) return

  const openModal = (options = {}) => {
    if (options.lang && langSelect) {
      langSelect.value = options.lang
    }
    if (options.notes && notesField && !notesField.value) {
      notesField.value = options.notes
    }

    form.hidden = false
    if (successBox) successBox.hidden = true

    modal.removeAttribute('hidden')
    modal.classList.add('is-active')
    document.body.classList.add('modal-open')
    document.querySelector('#corp-company')?.focus()
  }

  const closeModal = () => {
    modal.classList.remove('is-active')
    document.body.classList.remove('modal-open')
    setTimeout(() => {
      modal.setAttribute('hidden', '')
    }, 280)
  }

  closeBtn?.addEventListener('click', closeModal)
  backdrop?.addEventListener('click', closeModal)
  closeSuccessBtn?.addEventListener('click', closeModal)

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const company = document.querySelector('#corp-company')?.value.trim()
    const name = document.querySelector('#corp-name')?.value.trim()
    const email = document.querySelector('#corp-email')?.value.trim()
    const phone = document.querySelector('#corp-phone')?.value.trim()
    const teamSize = document.querySelector('#corp-team-size')?.value
    const lang = document.querySelector('#corp-lang')?.value
    const needs = notesField?.value.trim()
    const errorMsg = document.querySelector('#corp-error-msg')

    if (!company || !name || !email || !phone) {
      if (errorMsg) errorMsg.hidden = false
      return
    }

    if (errorMsg) errorMsg.hidden = true

    const submitBtn = document.querySelector('#corp-submit')
    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.classList.add('is-submitting')
    }

    saveInquiry({
      type: 'b2b_proposal',
      company,
      contact_name: name,
      email,
      phone,
      team_size: teamSize,
      language: lang,
      needs
    })

    setTimeout(() => {
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.classList.remove('is-submitting')
      }
      form.hidden = true
      if (successBox) successBox.hidden = false
    }, 600)
  })

  window.__voOpenCorporateModal = openModal
}
