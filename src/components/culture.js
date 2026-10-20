import { escapeHtml } from '../lib/auth.js'
import { normalizeInterfaceLanguage, t } from '../lib/i18n.js'

/**
 * Renders the Cultural Immersion view for students.
 */
export function renderCulture(resources = [], student = {}) {
  const uiLang = normalizeInterfaceLanguage(
    typeof student === 'string'
      ? student
      : (student?.interfaceLanguage || student?.interface_language || 'es')
  )

  return `
    <section class="culture-section" id="culture">

      <div class="platform-section-heading">

        <p class="platform-label">
          ${t('cultureKicker', uiLang) || '10 — CULTURAL IMMERSION'}
        </p>

        <h2>
          ${t('cultureHeading', uiLang) || 'Beyond the grammar.'}
          <span>${t('cultureHeadingSpan', uiLang) || 'Experience the culture.'}</span>
        </h2>

        <p>
          ${t('cultureDesc', uiLang) || 'Explore handpicked articles, traditions, idioms, and multimedia resources to live your target language.'}
        </p>

      </div>

      ${resources.length === 0 ? `
        <div class="empty-platform-state">
          <p>${t('noCultureTitle', uiLang) || 'Cultural resources coming soon.'}</p>
          <small>${t('noCultureHint', uiLang) || 'Your teacher will share cultural insights and media recommendations here.'}</small>
        </div>
      ` : `
        <div class="culture-grid">
          ${resources.map((item) => {
            return `
              <article class="culture-card">
                <div class="culture-card-top">
                  <span class="culture-topic-badge">
                    ${escapeHtml((item.topic || 'Traditions').toUpperCase())}
                  </span>
                  ${item.language ? `
                    <span class="culture-lang-badge">${escapeHtml(item.language)}</span>
                  ` : ''}
                </div>

                <h3 class="culture-card-title">
                  ${escapeHtml(item.title || 'Cultural Insight')}
                </h3>

                <p class="culture-card-desc">
                  ${escapeHtml(item.description || 'Explore this cultural discovery and enrich your language context.')}
                </p>

                ${item.url ? `
                  <a
                    href="${escapeHtml(item.url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="culture-explore-link"
                  >
                    ${t('exploreResource', uiLang) || 'Explore resource ↗'}
                  </a>
                ` : ''}
              </article>
            `
          }).join('')}
        </div>
      `}

    </section>
  `
}
