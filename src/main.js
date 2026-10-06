import './style.css'

document.querySelector('#app').innerHTML = `

  <!-- =========================================
       NAVBAR
  ========================================== -->

  <header class="navbar">

    <a href="#inicio" class="logo">
      VERA <span>ORBIS</span>
    </a>

    <nav class="nav-links">
      <a href="#quienes-somos">Quiénes somos</a>
      <a href="#idiomas">Nuestros idiomas</a>
      <a href="#contacto">Contacto</a>
    </nav>

    <a href="/platform.html" class="platform-button">
  Acceso a plataforma ↗
</a>

  </header>


  <main>

    <!-- =========================================
         HERO
    ========================================== -->

    <section id="inicio" class="hero">

      <div class="hero-content">

        <p class="hero-kicker">
          LANGUAGE · CULTURE · CONNECTION
        </p>

        <h1>
          THE WORLD
          <span>IS WAITING</span>
          <em>FOR YOU.</em>
        </h1>

        <p class="hero-description">
          Learn a language. Discover a culture.
          Connect with the world.
        </p>

        <a href="#idiomas" class="hero-link">
          Explore Vera Orbis
          <span>↗</span>
        </a>

      </div>


      <div class="hero-orbit orbit-one"></div>
      <div class="hero-orbit orbit-two"></div>


      <div class="hero-dot dot-violet"></div>
      <div class="hero-dot dot-orange"></div>
      <div class="hero-dot dot-yellow"></div>
      <div class="hero-dot dot-turquoise"></div>


      <div class="photo photo-one">
        <span>CULTURE</span>
      </div>

      <div class="photo photo-two">
        <span>PEOPLE</span>
      </div>

      <div class="photo photo-three">
        <span>PLACES</span>
      </div>


      <svg class="route-line" viewBox="0 0 600 400">
        <path d="M40 330 C150 80, 280 350, 390 130 S520 90, 580 40"></path>
      </svg>


      <div class="coordinates">
        4°42′N · 74°04′W
      </div>

      <div class="scroll-indicator">
        SCROLL TO EXPLORE ↓
      </div>

    </section>


    <!-- =========================================
         QUIÉNES SOMOS
    ========================================== -->

    <section id="quienes-somos" class="intro-section">

      <p class="section-label">
        01 — VERA ORBIS
      </p>

      <h2>
        Language is not
        <span>a destination.</span>
      </h2>

      <p class="intro-text">
        It is a way of seeing the world,
        understanding others and finding
        your place in it.
      </p>

    </section>


    <!-- =========================================
         IDIOMAS
    ========================================== -->

    <section id="idiomas" class="languages-section">

      <p class="section-label">
        02 — OUR LANGUAGES
      </p>

      <h2>
        Choose your
        <span>next world.</span>
      </h2>

      <div class="language-grid">

        <article class="language-card english-card">

          <p>01</p>

          <h3>English</h3>

          <span>
            Explore →
          </span>

        </article>


        <article class="language-card french-card">

          <p>02</p>

          <h3>Français</h3>

          <span>
            Explorer →
          </span>

        </article>


        <article class="language-card mandarin-card">

          <p>03</p>

          <h3>中文</h3>

          <span>
            Discover →
          </span>

        </article>

      </div>

    </section>


    <!-- =========================================
         MÉTODO VERA ORBIS
    ========================================== -->

    <section class="experience-section">

      <div class="experience-header">

        <p class="section-label">
          03 — THE VERA ORBIS METHOD
        </p>

        <h2>
          Your language.
          <span>Your journey.</span>
        </h2>

        <p class="experience-intro">
          No two journeys are the same.
          We build your learning experience around
          your goals, your world and the way you learn.
        </p>

      </div>


      <div class="process-grid">

        <article class="process-card process-one">

          <span class="process-number">
            01
          </span>

          <div>

            <h3>
              ASSESS
            </h3>

            <p>
              We discover your current level,
              your goals and what you actually
              need from the language.
            </p>

          </div>

          <span class="process-word">
            Discover
          </span>

        </article>


        <article class="process-card process-two">

          <span class="process-number">
            02
          </span>

          <div>

            <h3>
              DESIGN
            </h3>

            <p>
              Your learning path is created around
              your interests, your pace and your
              personal objectives.
            </p>

          </div>

          <span class="process-word">
            Create
          </span>

        </article>


        <article class="process-card process-three">

          <span class="process-number">
            03
          </span>

          <div>

            <h3>
              LEARN
            </h3>

            <p>
              Personalized lessons, real communication
              and meaningful practice that connects
              language with your everyday life.
            </p>

          </div>

          <span class="process-word">
            Live it
          </span>

        </article>


        <article class="process-card process-four">

          <span class="process-number">
            04
          </span>

          <div>

            <h3>
              CONNECT
            </h3>

            <p>
              Because language is more than words.
              It opens conversations, cultures,
              opportunities and new worlds.
            </p>

          </div>

          <span class="process-word">
            Connect
          </span>

        </article>

      </div>

    </section>


    <!-- =========================================
         EXPERIENCIA DEL ESTUDIANTE
    ========================================== -->

    <section class="student-experience">

      <div class="experience-top">

        <p class="section-label">
          04 — THE EXPERIENCE
        </p>

        <h2>
          More than
          <span>language lessons.</span>
        </h2>

        <p class="experience-description">
          Your journey comes with the tools,
          resources and guidance you need to
          make the language part of your world.
        </p>

      </div>


      <div class="experience-layout">


        <!-- PASSPORT CARD -->

        <div class="experience-main-card">

          <div class="card-top">

            <span>
              VERA ORBIS
            </span>

            <span>
              STUDENT 001
            </span>

          </div>


          <div class="passport-circle">
            VO
          </div>


          <div class="passport-content">

            <p class="passport-label">
              LANGUAGE PASSPORT
            </p>

            <h3>
              Your progress.
              Your world.
            </h3>

            <p>
              A personal space to keep track of
              your language journey, achievements
              and goals.
            </p>

          </div>


          <div class="card-bottom">

            <span>
              LEARN IT
            </span>

            <span>
              LIVE IT
            </span>

            <span>
              SPEAK IT
            </span>

          </div>

        </div>


        <!-- EXPERIENCE ITEMS -->

        <div class="experience-items">


          <article class="experience-item">

            <span class="item-number">
              01
            </span>

            <div>

              <h3>
                Personal Roadmap
              </h3>

              <p>
                A clear path designed around your
                current level, goals and destination.
              </p>

            </div>

            <span class="item-arrow">
              ↗
            </span>

          </article>


          <article class="experience-item">

            <span class="item-number">
              02
            </span>

            <div>

              <h3>
                Personalized Materials
              </h3>

              <p>
                Resources created around the things
                you actually want to talk about,
                understand and experience.
              </p>

            </div>

            <span class="item-arrow">
              ↗
            </span>

          </article>


          <article class="experience-item">

            <span class="item-number">
              03
            </span>

            <div>

              <h3>
                Progress & Feedback
              </h3>

              <p>
                See where you are, what you have
                achieved and where your journey
                goes next.
              </p>

            </div>

            <span class="item-arrow">
              ↗
            </span>

          </article>


          <article class="experience-item">

            <span class="item-number">
              04
            </span>

            <div>

              <h3>
                Student Platform
              </h3>

              <p>
                Your resources and learning experience
                continue beyond the classroom.
              </p>

            </div>

            <span class="item-arrow">
              ↗
            </span>

          </article>


        </div>

      </div>

    </section>


    <!-- =========================================
         CONTACTO
    ========================================== -->

    <section id="contacto" class="contact-section">

      <p class="section-label">
        05 — YOUR NEXT STEP
      </p>

      <h2>
        Where will your
        <span>language take you?</span>
      </h2>

     <a
  href="https://wa.me/573123035708?text=Hola.%20Quiero%20comenzar%20mi%20journey%20y%20me%20gustar%C3%ADa%20conocer%20las%20opciones%20disponibles."
  class="contact-button"
  target="_blank"
  rel="noopener noreferrer"
>
  Start your journey ↗
</a>

    </section>

  </main>


  <!-- =========================================
       FOOTER
  ========================================== -->

  <footer>

    <div class="footer-logo">
      VERA ORBIS
    </div>

    <div>
      LEARN IT · LIVE IT · SPEAK IT
    </div>

  </footer>

`