import { getAcademicAIConsent, setAcademicAIConsent } from '../lib/academicAI.js'
import { escapeHtml } from '../lib/auth.js'
import {
  SUPPORTED_INTERFACE_LANGUAGES,
  normalizeInterfaceLanguage,
  t
} from '../lib/i18n.js'

/**
 * Renders the Student Settings & Preferences view.
 */
export function renderSettings(student = {}) {
  const uiLang = normalizeInterfaceLanguage(
    typeof student === 'string'
      ? student
      : (student?.interfaceLanguage || student?.interface_language || 'es')
  )

  return `
    <section class="settings-section" id="settings">

      <div class="platform-section-heading">

        <p class="platform-label">
          ${t('settingsKicker', uiLang) || '12 — SETTINGS & PREFERENCES'}
        </p>

        <h2>
          ${t('settingsHeading', uiLang) || 'Your platform settings.'}
          <span>${t('settingsHeadingSpan', uiLang) || 'Tailor your experience.'}</span>
        </h2>

        <p>
          ${t('settingsDesc', uiLang) || 'Manage your interface language, view your profile settings, and configure your learning preferences.'}
        </p>

      </div>

      <div class="settings-cards-grid">
        <article class="settings-card" data-ai-consent-card>
          <h3>Academic AI privacy</h3>
          <p>When enabled and approved by your teacher, the configured external AI provider may process your learning goals, progress, exercise answers and teacher feedback to suggest activities. Consent is optional and can be withdrawn. Your teacher reviews all suggestions. For minors, guardian authorization must be arranged with Vera Orbis before enabling this setting.</p>
          <label><input type="checkbox" data-ai-consent disabled> Allow this use of my academic information</label>
          <button type="button" data-save-ai-consent disabled>Save privacy choice</button>
          <p data-ai-consent-status role="status">Loading saved privacy choice...</p>
        </article>

        <!-- INTERFACE LANGUAGE SELECTOR CARD -->
        <article class="settings-card">
          <div class="settings-card-header">
            <span class="settings-card-icon">🌐</span>
            <div>
              <h3>${t('interfaceLangSelect', uiLang) || 'Interface Language'}</h3>
              <p>${t('interfaceLangNotice', uiLang) || 'Choose the language used for platform navigation, instructions, and messages. This does not alter your target learning language or level.'}</p>
            </div>
          </div>

          <div class="settings-lang-options">
            ${SUPPORTED_INTERFACE_LANGUAGES.map((item) => `
              <button
                type="button"
                class="settings-lang-btn ${item.code === uiLang ? 'is-current' : ''}"
                data-set-interface-lang="${item.code}"
              >
                <span class="lang-flag-big">${item.flag}</span>
                <div class="lang-text-group">
                  <strong>${item.label}</strong>
                  <small>${item.code.toUpperCase()}</small>
                </div>
                ${item.code === uiLang ? '<span class="lang-active-check">✓ Active</span>' : ''}
              </button>
            `).join('')}
          </div>
        </article>

        <!-- PROFILE & LEARNING PREFERENCES CARD -->
        <article class="settings-card">
          <div class="settings-card-header">
            <span class="settings-card-icon">👤</span>
            <div>
              <h3>${t('studentProfile', uiLang) || 'Profile & Learning Path'}</h3>
              <p>${t('profileNotice', uiLang) || 'Your academic configuration managed in partnership with your teacher.'}</p>
            </div>
          </div>

          <div class="settings-info-list">
            <div class="settings-info-row">
              <span>${t('studentLabel', uiLang) || 'Student'}</span>
              <strong>${escapeHtml(student.name || 'Student')}</strong>
            </div>

            <div class="settings-info-row">
              <span>${t('targetLanguage', uiLang) || 'Target Learning Language'}</span>
              <strong>${escapeHtml(student.language || 'English')}</strong>
            </div>

            <div class="settings-info-row">
              <span>${t('currentLevel', uiLang) || 'Current Level'}</span>
              <strong>${escapeHtml(student.level || 'A1')} · ${escapeHtml(student.levelName || student.level_name || 'Beginner')}</strong>
            </div>

            <div class="settings-info-row">
              <span>${t('learningGoalLabel', uiLang) || 'Goal'}</span>
              <strong>${escapeHtml(student.goal || 'General fluency')}</strong>
            </div>
          </div>
        </article>

      </div>

    </section>
  `
}

export async function setupAcademicAIConsent(client, root = document) {
  const card = root.querySelector('[data-ai-consent-card]')
  if (!card || card.dataset.bound) return
  card.dataset.bound = 'true'
  const checkbox = card.querySelector('[data-ai-consent]')
  const button = card.querySelector('[data-save-ai-consent]')
  const status = card.querySelector('[data-ai-consent-status]')
  try {
    const saved = await getAcademicAIConsent(client)
    checkbox.checked = saved.allowed === true
    checkbox.disabled = false
    button.disabled = false
    status.textContent = saved.allowed ? 'Academic AI processing is allowed.' : 'Academic AI processing is disabled.'
  } catch {
    status.textContent = 'Privacy controls are unavailable. AI processing remains unavailable until consent can be verified.'
    return
  }
  button.onclick = async () => {
    button.disabled = true
    try {
      const saved = await setAcademicAIConsent(client, checkbox.checked)
      if (saved.allowed !== checkbox.checked) throw new Error('Privacy choice was not confirmed.')
      status.textContent = checkbox.checked ? 'Privacy choice saved: academic AI processing allowed.' : 'Privacy choice saved: academic AI processing disabled.'
    } catch (error) { status.textContent = error.message || 'Could not save privacy choice.' }
    finally { button.disabled = false }
  }
}