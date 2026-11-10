import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u

test('Web Experience & Conversion Agent — Multi-Page Architecture & Route Entry Points', () => {
  // 1. Verify all 6 HTML entry points exist
  assert.ok(existsSync('index.html'), 'index.html must exist (Home /)')
  assert.ok(existsSync('who-we-are/index.html'), 'who-we-are/index.html must exist')
  assert.ok(existsSync('languages/index.html'), 'languages/index.html must exist')
  assert.ok(existsSync('method/index.html'), 'method/index.html must exist')
  assert.ok(existsSync('experiences/index.html'), 'experiences/index.html must exist')
  assert.ok(existsSync('contact/index.html'), 'contact/index.html must exist')

  // 2. Verify all 6 Page JS scripts exist
  assert.ok(existsSync('src/main.js'), 'src/main.js must exist')
  assert.ok(existsSync('src/pages/who-we-are.js'), 'src/pages/who-we-are.js must exist')
  assert.ok(existsSync('src/pages/languages.js'), 'src/pages/languages.js must exist')
  assert.ok(existsSync('src/pages/method.js'), 'src/pages/method.js must exist')
  assert.ok(existsSync('src/pages/experiences.js'), 'src/pages/experiences.js must exist')
  assert.ok(existsSync('src/pages/contact.js'), 'src/pages/contact.js must exist')

  // 3. Verify student platform is preserved
  assert.ok(existsSync('platform.html'), 'platform.html must be preserved')
  assert.ok(existsSync('src/pages/platform.js'), 'src/pages/platform.js must be preserved')

  // 4. Verify vite.config.js rollup input includes all pages
  const viteConfig = readFileSync('vite.config.js', 'utf8')
  assert.match(viteConfig, /whoWeAre:\s*resolve\([^,]+,\s*'who-we-are\/index\.html'\)/)
  assert.match(viteConfig, /languages:\s*resolve\([^,]+,\s*'languages\/index\.html'\)/)
  assert.match(viteConfig, /method:\s*resolve\([^,]+,\s*'method\/index\.html'\)/)
  assert.match(viteConfig, /experiences:\s*resolve\([^,]+,\s*'experiences\/index\.html'\)/)
  assert.match(viteConfig, /contact:\s*resolve\([^,]+,\s*'contact\/index\.html'\)/)
})

test('Web Experience & Conversion Agent — Home Page (/) Integrity & Approved Hero Composition', () => {
  const mainJs = readFileSync('src/main.js', 'utf8')
  const styleCss = readFileSync('src/style.css', 'utf8')

  // 1. Approved Hero right-side composition must be 100% preserved
  assert.match(mainJs, /class="hero-art-canvas"/)
  assert.match(mainJs, /class="hero-orbit orbit-one"/)
  assert.match(mainJs, /class="hero-orbit orbit-two"/)
  assert.match(mainJs, /class="hero-orbit orbit-three"/)
  assert.match(mainJs, /class="photo photo-one"/)
  assert.match(mainJs, /class="photo photo-two"/)
  assert.match(mainJs, /class="photo photo-three"/)
  assert.match(mainJs, /CULTURA/)
  assert.match(mainJs, /PERSONAS/)
  assert.match(mainJs, /LUGARES/)
  assert.match(mainJs, /class="route-line"/)

  // 2. Brand identity and motto
  assert.match(mainJs, /WE SPEAK THE WORLD/)
  assert.match(mainJs, /El mundo es más grande/)
  assert.match(mainJs, /cuando puedes hablar con él\./)
  assert.match(mainJs, /4°42′N · 74°04′W/)

  // 3. Five Universes Brief Presentation
  assert.match(mainJs, /class="universes-five-grid"/)
  assert.match(mainJs, /<h3>Language<\/h3>/)
  assert.match(mainJs, /<h3>Culture<\/h3>/)
  assert.match(mainJs, /<h3>People<\/h3>/)
  assert.match(mainJs, /<h3>Places<\/h3>/)
  assert.match(mainJs, /<h3>Experiences<\/h3>/)

  // 4. Visual Gateways to Independent Pages
  assert.match(mainJs, /class="home-portals-grid"/)
  assert.match(mainJs, /href="\/who-we-are"/)
  assert.match(mainJs, /href="\/languages"/)
  assert.match(mainJs, /href="\/method"/)
  assert.match(mainJs, /href="\/experiences"/)
  assert.match(mainJs, /href="\/contact"/)

  // 5. Zero emojis in main.js
  assert.ok(!emojiRegex.test(mainJs), 'main.js must contain zero emojis')
})

test('Web Experience & Conversion Agent — Who We Are (/who-we-are): Video, Lina Celedón & Clarity', () => {
  const whoJs = readFileSync('src/pages/who-we-are.js', 'utf8')
  const styleCss = readFileSync('src/style.css', 'utf8')

  // 1. Central core idea
  assert.match(whoJs, /Vera Orbis es el mundo[\s\S]*?Las personas son quienes le dan vida/i)
  assert.match(whoJs, /A World of Living Connections/)
  assert.match(whoJs, /Abrimos puertas/)
  assert.match(whoJs, /Guiamos descubrimientos/)
  assert.match(whoJs, /Unimos personas/)

  // 2. Video stage referencing verified MOV file
  assert.ok(existsSync('public/videos/vera-orbis-intro.mov'), 'Original MOV video file must exist on disk')
  assert.match(whoJs, /id="intro-video"/)
  assert.match(whoJs, /id="intro-video-frame"/)
  assert.match(whoJs, /id="intro-video-overlay"/)
  assert.match(whoJs, /src="\/videos\/vera-orbis-intro\.mov"/)

  // 3. Lina Celedón: confirmed Founder & Director, real photo space (no AI face substitute)
  assert.match(whoJs, /Lina Celedón/)
  assert.match(whoJs, /Founder &amp; Director/)
  assert.match(whoJs, /class="founder-real-photo-placeholder"/)
  assert.doesNotMatch(whoJs, /src="\/assets\/Vera\.png".*Lina Celedón/s, 'Vera avatar must not be used as Lina photo')

  // 4. Clarity box: clear distinction between Lina (human Founder) and Vera (AI assistant)
  assert.match(whoJs, /class="clarity-box-distinction"/)
  assert.match(whoJs, /Lina Celedón[\s\S]*?Founder &amp; Director[\s\S]*?Líder humana/)
  assert.match(whoJs, /Vera[\s\S]*?Asistente Virtual &amp; IA[\s\S]*?Compañera digital/)

  // 5. Zero emojis in who-we-are.js
  assert.ok(!emojiRegex.test(whoJs), 'who-we-are.js must contain zero emojis')

  // 6. CSS styles exist
  assert.match(styleCss, /\.founder-real-photo-placeholder/)
  assert.match(styleCss, /\.clarity-box-distinction/)
})

test('Web Experience & Conversion Agent — Languages (/languages): 3D Flip Cards & Identity', () => {
  const langJs = readFileSync('src/pages/languages.js', 'utf8')
  const styleCss = readFileSync('src/style.css', 'utf8')

  // 1. Three languages with individual identity
  assert.match(langJs, /id="ingles"/)
  assert.match(langJs, /id="frances"/)
  assert.match(langJs, /id="mandarin"/)

  // 2. 3D interactive flip cards
  assert.match(langJs, /class="lang-showcase-card/)
  assert.match(langJs, /class="lang-card-inner"/)
  assert.match(langJs, /class="lang-card-face lang-card-front"/)
  assert.match(langJs, /class="lang-card-face lang-card-back"/)
  assert.match(langJs, /class="btn-card-flip-action"/)
  assert.match(langJs, /class="btn-card-flip-return"/)

  // 3. CSS 3D transforms
  assert.match(styleCss, /transform-style:\s*preserve-3d/)
  assert.match(styleCss, /backface-visibility:\s*hidden/)
  assert.match(styleCss, /\.is-flipped\s+\.lang-card-inner/)

  // 4. Zero emojis
  assert.ok(!emojiRegex.test(langJs), 'languages.js must contain zero emojis')
})

test('Web Experience & Conversion Agent — Our Method (/method): Learn It · Live It · Speak It', () => {
  const methodJs = readFileSync('src/pages/method.js', 'utf8')
  const styleCss = readFileSync('src/style.css', 'utf8')

  // 1. Core motto and stages
  assert.match(methodJs, /Learn It\. Live It\. Speak It\./)
  assert.match(methodJs, /Learn It · Comprende con sentido/)
  assert.match(methodJs, /Live It · Vive la cultura/)
  assert.match(methodJs, /Speak It · Suelta tu voz/)

  // 2. Visual experience cards
  assert.match(methodJs, /class="method-cards-stack"/)
  assert.match(methodJs, /class="method-experience-card card-stage-learn"/)
  assert.match(methodJs, /class="method-experience-card card-stage-live"/)
  assert.match(methodJs, /class="method-experience-card card-stage-speak"/)

  // 3. Zero emojis
  assert.ok(!emojiRegex.test(methodJs), 'method.js must contain zero emojis')
})

test('Web Experience & Conversion Agent — Experiences (/experiences): Available vs Upcoming', () => {
  const expJs = readFileSync('src/pages/experiences.js', 'utf8')
  const styleCss = readFileSync('src/style.css', 'utf8')

  // 1. 5 Universes
  assert.match(expJs, /class="universes-five-grid"/)

  // 2. Active proposals clearly available
  assert.match(expJs, /class="active-proposals-grid"/)
  assert.match(expJs, /DISPONIBLE AHORA/)
  assert.match(expJs, /Acompañamiento 1 a 1 para Personas/)
  assert.match(expJs, /Programas Corporativos B2B/)
  assert.match(expJs, /Carta Living Connections/)

  // 3. Future spaces clearly marked as upcoming / in development (Condition 3)
  assert.match(expJs, /class="upcoming-grid"/)
  assert.match(expJs, /PRÓXIMAMENTE · EN DESARROLLO/)
  assert.match(expJs, /EN FASE DE INTEGRACIÓN/)
  assert.match(expJs, /Vera Voice \(IA conversacional\)/)
  assert.match(expJs, /Próximamente disponible para estudiantes matriculados/)
  assert.match(expJs, /Language Passport Interactivo/)
  assert.match(expJs, /Próxima experiencia interactiva en la plataforma/)

  // 4. Zero emojis
  assert.ok(!emojiRegex.test(expJs), 'experiences.js must contain zero emojis')
})

test('Web Experience & Conversion Agent — Contact (/contact): 4 Pathways, Studio & Newsletter', () => {
  const contactJs = readFileSync('src/pages/contact.js', 'utf8')
  const styleCss = readFileSync('src/style.css', 'utf8')

  // 1. Four conversion pathways
  assert.match(contactJs, /class="conversion-pathways-grid"/)
  assert.match(contactJs, /id="start-pathfinder-btn"/)
  assert.match(contactJs, /id="start-journey-btn"/)
  assert.match(contactJs, /id="contact-b2b-cta"/)
  assert.match(contactJs, /https:\/\/wa\.me\/573123035708/)

  // 2. Studio details and coordinates
  assert.match(contactJs, /class="contact-details-bar"/)
  assert.match(contactJs, /4°42′N · 74°04′W/)
  assert.match(contactJs, /\+57 312 303 5708/)

  // 3. Newsletter form
  assert.match(contactJs, /id="newsletter-subscription-form"/)
  assert.match(contactJs, /Carta Living Connections/)

  // 4. Zero emojis
  assert.ok(!emojiRegex.test(contactJs), 'contact.js must contain zero emojis')
})

test('Web Experience & Conversion Agent — Conversion Modals & Lead Capture Integration', () => {
  const modalsJs = readFileSync('src/components/conversionModals.js', 'utf8')
  const styleCss = readFileSync('src/style.css', 'utf8')

  // 1. Pathfinder modal with 3 steps
  assert.match(modalsJs, /id="pathfinder-modal"/)
  assert.match(modalsJs, /Encuentra tu ruta de aprendizaje/)
  assert.match(modalsJs, /id="pathfinder-step-1"/)
  assert.match(modalsJs, /id="pathfinder-step-2"/)
  assert.match(modalsJs, /id="pathfinder-step-3"/)

  // 2. Orientation modal (B2C)
  assert.match(modalsJs, /id="orientation-modal"/)
  assert.match(modalsJs, /id="orientation-form"/)
  assert.match(modalsJs, /id="orient-name"/)
  assert.match(modalsJs, /id="orient-email"/)
  assert.match(modalsJs, /id="orient-phone"/)

  // 3. Corporate modal (B2B)
  assert.match(modalsJs, /id="corporate-modal"/)
  assert.match(modalsJs, /id="corporate-form"/)
  assert.match(modalsJs, /id="corp-company"/)
  assert.match(modalsJs, /id="corp-email"/)

  // 4. saveInquiry and Sales Engine integration
  assert.match(modalsJs, /function saveInquiry/)
  assert.match(modalsJs, /\/api\/sales-engine\/prospects/)

  // 5. Zero emojis in conversionModals.js
  assert.ok(!emojiRegex.test(modalsJs), 'conversionModals.js must contain zero emojis')
})

test('Web Experience & Conversion Agent — SEO & Structured Data Integrity in index.html', () => {
  const indexHtml = readFileSync('index.html', 'utf8')

  // Canonical and Robots
  assert.match(indexHtml, /<link rel="canonical" href="https:\/\/veraorbis\.studio\/"/)
  assert.match(indexHtml, /<meta name="robots" content="index, follow"/)

  // OpenGraph and Twitter
  assert.match(indexHtml, /<meta property="og:type" content="website"/)
  assert.match(indexHtml, /<meta property="og:title" content="Vera Orbis/)
  assert.match(indexHtml, /<meta name="twitter:card" content="summary_large_image"/)

  // Schema.org JSON-LD
  assert.match(indexHtml, /<script type="application\/ld\+json">/)
  assert.match(indexHtml, /"EducationalOrganization"/)
  assert.match(indexHtml, /English for the World/)
  assert.match(indexHtml, /Le Parcours Français/)
  assert.match(indexHtml, /Mandarín: Comunicación, Cultura & Negocios/)
})

test('Web Experience & Conversion Agent — Accessibility and Motion Defense', () => {
  const styleCss = readFileSync('src/style.css', 'utf8')

  // Prefers-reduced-motion block encompasses animations
  assert.match(styleCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  assert.match(styleCss, /animation-duration:\s*0\.001ms/i)
})
