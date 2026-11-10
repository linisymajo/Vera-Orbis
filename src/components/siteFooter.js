const VO_LOGO = '/logo/Logo%20Vera%20Orbis%20recoloreado.png'

/**
 * Renderiza el Pie de Página Global de Vera Orbis.
 */
export function renderSiteFooter() {
  return `
  <footer class="site-footer">

    <div class="footer-ambient" aria-hidden="true"></div>

    <div class="footer-top-grid">

      <div class="footer-brand-col">
        <a href="/" class="footer-logo-link" aria-label="Vera Orbis Home">
          <img src="${VO_LOGO}" alt="Vera Orbis" class="footer-logo-img" />
        </a>
        <p class="footer-brand-manifesto">
          Language, Culture &amp; Connection Center. Creamos espacios donde aprender un idioma es descubrir, conectar y vivir el mundo sin barreras.
        </p>
        <div class="footer-badge-pill">
          <span>WE SPEAK THE WORLD</span>
          <span class="badge-dot" aria-hidden="true"></span>
          <span>BOGOTÁ · 4°42′N · 74°04′W</span>
        </div>
      </div>

      <div class="footer-links-col">
        <span class="footer-heading">Navegación</span>
        <ul class="footer-links-list">
          <li><a href="/" class="footer-link">Inicio</a></li>
          <li><a href="/who-we-are" class="footer-link">Quiénes somos</a></li>
          <li><a href="/languages" class="footer-link">Nuestros idiomas</a></li>
          <li><a href="/method" class="footer-link">Cómo enseñamos</a></li>
          <li><a href="/experiences" class="footer-link">Experiencias &amp; Ecosistema</a></li>
          <li><a href="/contact" class="footer-link">Let's Connect</a></li>
        </ul>
      </div>

      <div class="footer-links-col">
        <span class="footer-heading">Idiomas</span>
        <ul class="footer-links-list">
          <li><a href="/languages#ingles" class="footer-link">Inglés (Global Commerce)</a></li>
          <li><a href="/languages#frances" class="footer-link">Francés (Culture &amp; Diplomatie)</a></li>
          <li><a href="/languages#mandarin" class="footer-link">Mandarín (Comercio &amp; Asia)</a></li>
          <li><a href="/contact#empresas" class="footer-link">Programas para Empresas (B2B)</a></li>
        </ul>
      </div>

      <div class="footer-links-col">
        <span class="footer-heading">Estudiantes &amp; Contacto</span>
        <ul class="footer-links-list">
          <li><a href="/platform.html" class="footer-link">Acceso Plataforma Estudiantes</a></li>
          <li><a href="/login.html" class="footer-link">Iniciar sesión</a></li>
          <li><a href="https://wa.me/573123035708?text=Hola%20Vera%20Orbis.%20Quiero%20conocer%20m%C3%A1s%20sobre%20sus%20programas." target="_blank" rel="noopener noreferrer" class="footer-link">WhatsApp (+57 312 303 5708)</a></li>
          <li><a href="/contact" class="footer-link">Agendar llamada de diagnóstico</a></li>
        </ul>
      </div>

    </div>

    <div class="footer-bottom-bar">
      <div class="footer-motto-row">
        <span>LEARN IT</span>
        <span class="bullet" aria-hidden="true">·</span>
        <span>LIVE IT</span>
        <span class="bullet" aria-hidden="true">·</span>
        <span>SPEAK IT</span>
      </div>

      <div class="footer-copy">
        © 2026 VERA ORBIS. TODOS LOS DERECHOS RESERVADOS.
      </div>
    </div>

  </footer>
  `
}
