import { escapeHtml } from '../lib/auth.js'
import { normalizeInterfaceLanguage, t } from '../lib/i18n.js'

/**
 * Renders the Student Packages, Available Classes, and Payment Summary view.
 */
export function renderPackages(studentPackages = [], payments = [], student = {}) {
  const uiLang = normalizeInterfaceLanguage(
    typeof student === 'string'
      ? student
      : (student?.interfaceLanguage || student?.interface_language || 'es')
  )

  let totalClasses = 0
  let usedClasses = 0

  studentPackages.forEach((pkg) => {
    const tot = Number(pkg.classes_total || pkg.total_classes || pkg.packages?.class_count || pkg.package?.class_count || 0)
    const usd = Number(pkg.classes_used || pkg.classes_completed || 0)
    totalClasses += tot
    usedClasses += usd
  })

  const remainingClasses = Math.max(0, totalClasses - usedClasses)

  return `
    <section class="packages-section" id="packages">

      <div class="platform-section-heading">

        <p class="platform-label">
          ${t('packagesKicker', uiLang) || '09 — PACKAGES & PAYMENTS'}
        </p>

        <h2>
          ${t('packagesHeading', uiLang) || 'Your learning packages.'}
          <span>${t('packagesHeadingSpan', uiLang) || 'Track your available sessions.'}</span>
        </h2>

        <p>
          ${t('packagesDesc', uiLang) || 'Review your active lesson packages, remaining sessions, and complete payment record.'}
        </p>

      </div>

      <!-- COUNTERS HERO -->
      <div class="packages-metric-grid">
        <div class="packages-metric-card metric-primary">
          <span class="packages-metric-label">${t('remainingClassesLabel', uiLang) || 'AVAILABLE CLASSES'}</span>
          <strong class="packages-metric-number">${remainingClasses}</strong>
          <span class="packages-metric-sub">${t('readyToBook', uiLang) || 'sessions ready to schedule'}</span>
        </div>

        <div class="packages-metric-card">
          <span class="packages-metric-label">${t('usedClassesLabel', uiLang) || 'CLASSES COMPLETED'}</span>
          <strong class="packages-metric-number">${usedClasses}</strong>
          <span class="packages-metric-sub">${t('lessonsDone', uiLang) || 'sessions accomplished'}</span>
        </div>

        <div class="packages-metric-card">
          <span class="packages-metric-label">${t('totalClassesLabel', uiLang) || 'TOTAL ALLOCATED'}</span>
          <strong class="packages-metric-number">${totalClasses}</strong>
          <span class="packages-metric-sub">${t('acrossAllPackages', uiLang) || 'across all your packages'}</span>
        </div>
      </div>

      <div class="packages-layout">

        <!-- ACTIVE PACKAGES LIST -->
        <div class="packages-subgroup">
          <h3 style="margin: 0 0 16px; font-family: 'Playfair Display', serif; font-size: 22px; color: var(--vo-navy);">
            ${t('myPackagesTitle', uiLang) || 'Assigned Packages'}
          </h3>

          ${studentPackages.length === 0 ? `
            <div class="empty-platform-state">
              <p>${t('noPackagesTitle', uiLang) || 'No package currently assigned.'}</p>
              <small>${t('noPackagesHint', uiLang) || 'Your teacher will activate your class packages upon enrollment.'}</small>
            </div>
          ` : `
            <div class="packages-cards-list">
              ${studentPackages.map((item) => {
                const tot = Number(item.classes_total || item.total_classes || item.packages?.class_count || 1)
                const usd = Number(item.classes_used || item.classes_completed || 0)
                const pkgName = item.packages?.name || item.package_name || `Paquete de ${tot} clases`
                const pct = tot > 0 ? Math.min(100, Math.round((usd / tot) * 100)) : 0
                const status = item.status || (usd >= tot ? 'completed' : 'active')

                return `
                  <article class="package-item-card">
                    <div class="package-item-header">
                      <div>
                        <span class="package-status-badge status-${status}">
                          ${status.toUpperCase()}
                        </span>
                        <h4 class="package-item-title">
                          ${escapeHtml(pkgName)}
                        </h4>
                      </div>

                      <div class="package-classes-count">
                        <strong>${tot - usd}</strong>
                        <span>/ ${tot} ${t('classesLeft', uiLang) || 'classes left'}</span>
                      </div>
                    </div>

                    <div class="package-progress-bar-wrapper">
                      <div class="package-progress-bar-track">
                        <div class="package-progress-bar-fill" style="width: ${pct}%;"></div>
                      </div>
                      <div class="package-progress-labels">
                        <span>${usd} ${t('completed', uiLang) || 'completed'} (${pct}%)</span>
                        <span>${tot - usd} ${t('remaining', uiLang) || 'remaining'}</span>
                      </div>
                    </div>
                  </article>
                `
              }).join('')}
            </div>
          `}
        </div>

        <!-- PAYMENTS & RECEIPTS -->
        <div class="packages-subgroup" style="margin-top: 36px;">
          <h3 style="margin: 0 0 16px; font-family: 'Playfair Display', serif; font-size: 22px; color: var(--vo-navy);">
            ${t('paymentsTitle', uiLang) || 'Payment History & Receipts'}
          </h3>

          ${payments.length === 0 ? `
            <div class="empty-platform-state">
              <p>${t('noPaymentsTitle', uiLang) || 'No payment records found.'}</p>
              <small>${t('noPaymentsHint', uiLang) || 'Recorded tuition and package payments will be documented here.'}</small>
            </div>
          ` : `
            <div class="payments-table-container">
              <table class="platform-data-table">
                <thead>
                  <tr>
                    <th>${t('dateHeader', uiLang) || 'Date'}</th>
                    <th>${t('amountHeader', uiLang) || 'Amount'}</th>
                    <th>${t('statusHeader', uiLang) || 'Status'}</th>
                    <th>${t('referenceHeader', uiLang) || 'Reference'}</th>
                  </tr>
                </thead>
                <tbody>
                  ${payments.map((p) => {
                    const dateStr = p.paid_at || p.created_at
                      ? new Date(p.paid_at || p.created_at).toLocaleDateString()
                      : '—'
                    const numAmount = p.amount != null ? Number(p.amount) : Number(p.amount_paid || 0)
                    const formattedAmount = `${p.currency || 'COP'} ${numAmount.toLocaleString('es-CO')}`

                    return `
                      <tr>
                        <td>${dateStr}</td>
                        <td><strong>${formattedAmount}</strong></td>
                        <td>
                          <span class="payment-status-pill status-${p.status || 'received'}">
                            ${(p.status || 'received').toUpperCase()}
                          </span>
                        </td>
                        <td><small>${escapeHtml(p.reference || p.notes || p.id?.slice(0, 8) || 'Confirmed')}</small></td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

      </div>

    </section>
  `
}
