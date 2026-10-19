/**
 * Vera Orbis Centralized i18n System
 * Provides internationalization for interface languages (es, en, fr, zh)
 * while preserving complete separation from target learning languages.
 */

export const SUPPORTED_INTERFACE_LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'zh', label: '简体中文', flag: '🇨🇳' }
]

export const DEFAULT_INTERFACE_LANGUAGE = 'es'

/**
 * Normalizes interface language code to one of 'es', 'en', 'fr', 'zh'.
 */
export function normalizeInterfaceLanguage(code) {
  if (!code || typeof code !== 'string') return DEFAULT_INTERFACE_LANGUAGE
  const lower = code.toLowerCase().trim()
  if (lower.startsWith('es') || lower.includes('span')) return 'es'
  if (lower.startsWith('en') || lower.includes('engl')) return 'en'
  if (lower.startsWith('fr') || lower.includes('franc')) return 'fr'
  if (lower.startsWith('zh') || lower.includes('chin') || lower.includes('mand')) return 'zh'
  return DEFAULT_INTERFACE_LANGUAGE
}

/**
 * Normalizes target learning language to 'en', 'fr', or 'zh'.
 */
export function normalizeTargetLanguage(lang = '') {
  if (!lang || typeof lang !== 'string') return 'en'
  const str = lang.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  if (str.includes('franc') || str.includes('french') || str === 'fr') return 'fr'
  if (str.includes('mandar') || str.includes('chin') || str === 'zh') return 'zh'
  return 'en'
}

/**
 * Requirement 5: Action and navigation button labels must ALWAYS be in the
 * student's TARGET learning language, regardless of interface language:
 *   - English: My Learning Journey, My Challenges, Class Materials, Talk to Vera
 *   - French: Mon parcours, Mes défis, Supports de cours, Parler à Vera
 *   - Mandarin: 我的学习旅程, 我的挑战, 课程资料, 与Vera对话
 */
export function getTargetActionLabels(targetLang = 'en') {
  const norm = normalizeTargetLanguage(targetLang)
  switch (norm) {
    case 'fr':
      return {
        journey: 'Mon parcours',
        challenges: 'Mes défis',
        materials: 'Supports de cours',
        talkToVera: 'Parler à Vera'
      }
    case 'zh':
      return {
        journey: '我的学习旅程',
        challenges: '我的挑战',
        materials: '课程资料',
        talkToVera: '与Vera对话'
      }
    case 'en':
    default:
      return {
        journey: 'My Learning Journey',
        challenges: 'My Challenges',
        materials: 'Class Materials',
        talkToVera: 'Talk to Vera'
      }
  }
}

/**
 * UI dictionaries for interface translations.
 */
const dictionaries = {
  es: {
    // Nav
    home: 'Inicio',
    feedback: 'Feedback',
    progress: 'Progreso',
    exercises: 'Ejercicios',
    signOut: 'Cerrar sesión',
    interfaceLangSelect: 'Idioma de la interfaz',

    // Welcome
    journeyEyebrow: 'TU VIAJE EN VERA ORBIS',
    welcomeBack: 'Bienvenido de nuevo,',
    welcomeIntro: 'Tu viaje lingüístico continúa aquí. Explora tu progreso, materiales y próximos pasos.',

    // Passport
    passportKicker: '01 — PASAPORTE LINGÜÍSTICO',
    passportTitle: 'Tu idioma.',
    passportTitleSpan: 'Tu identidad.',
    passportIntro: 'Un pasaporte digital que acompaña tu progreso a lo largo de tu experiencia en Vera Orbis.',
    studentLabel: 'ESTUDIANTE',
    languageLabel: 'IDIOMA',
    levelLabel: 'NIVEL',
    destinationLabel: 'DESTINO',
    journeyLabel: 'TRAYECTO',
    lessonsLabel: 'LECCIONES',
    totalPending: 'TOTAL PENDIENTE',
    lessonsPendingConfig: 'LECCIONES PENDIENTES DE CONFIGURACIÓN',
    journeyProgress: 'PROGRESO DEL VIAJE',
    inProgress: 'EN PROGRESO',
    beginning: 'INICIO',
    yourJourney: 'TU VIAJE',
    destination: 'DESTINO',
    activeJourney: 'VIAJE ACTIVO',
    learnIt: 'APRENDE',
    liveIt: 'VIVE',
    speakIt: 'HABLA',
    of: 'de',
    completed: 'completadas',
    remaining: 'RESTANTES',

    // Modules
    journeyKicker: '02 — MI VIAJE',
    journeyHeading: 'Tu camino.',
    journeyHeadingSpan: 'Tu próximo paso.',
    journeyCardDesc: 'Sigue tu ruta de aprendizaje, explora tu progreso y descubre qué viene a continuación.',
    journeyCardInnerDesc: 'Explora tu hoja de ruta, tus lecciones y todo lo que tienes por delante en tu viaje.',

    materialsKicker: '03 — MATERIALES',
    materialsHeading: 'Tus recursos.',
    materialsHeadingSpan: 'Siempre listos.',
    materialsDesc: 'Accede a tus materiales de clase, lecturas y guías personalizadas.',

    learningAccessKicker: '04 — SIGUE APRENDIENDO',
    learningAccessHeading: 'Tu aprendizaje.',
    learningAccessHeadingSpan: 'Tu espacio.',
    learningAccessDesc: 'Continúa tu viaje a través de retroalimentación personalizada, retos semanales y tus recursos de estudio.',
    feedbackCardTitle: 'Feedback de tu profesor.',
    feedbackCardDesc: 'Revisa observaciones personalizadas, recomendaciones y retroalimentación de tus lecciones.',
    challengesCardTitle: 'Ponlo en práctica.',
    challengesCardDesc: 'Completa retos personalizados y aplica lo que aprendes más allá de clase.',

    progressKicker: '05 — MI PROGRESO',
    progressHeading: 'Mira cuánto has avanzado.',
    progressDesc: 'Sigue tus lecciones, celebra lo completado y descubre lo que sigue.',
    progressCardTitle: 'Cada lección. Cada paso.',
    progressCardDesc: 'Revisa lo que has completado, lo que te falta y hacia dónde te conduce tu viaje.',
    currentProgress: 'PROGRESO ACTUAL',
    nextStepIs: 'Tu próximo paso:',

    // Vera Voice
    veraVoiceKicker: '06 — VERA VOICE',
    veraVoiceTitle: 'Conoce a Vera.<br><span>Tu compañera de conversación.</span>',
    veraVoiceDesc: 'Practica, gana confianza y habla otro idioma a tu propio ritmo.',
    veraVoiceMeetVera: 'Conoce a Vera',
    veraVoicePartner: 'Tu compañera de conversación',
    veraVoiceFlipHint: 'Toca o presiona Enter para descubrir más',
    veraVoiceReady: '¿LISTO PARA PRACTICAR?',
    veraVoiceStartConvo: 'Inicia una conversación con Vera.',
    veraVoicePracticePace: 'Practica tu idioma y aprende a tu propio ritmo.',
    veraVoiceStatusConnecting: 'Conectando con Vera Voice...',
    veraVoiceStatusConnected: 'Sesión conectada con Vera Voice.',
    veraVoiceStatusFailed: 'No se pudo conectar la sesión.',
    veraVoiceStatusTimeout: 'Vera Voice tardó en responder. Si el servidor backend está despertando, espera unos segundos y reintenta.',
    veraVoiceRequiresHttps: 'Vera Voice requiere configurar VITE_VERA_VOICE_URL con HTTPS en producción.',
    veraVoiceInvalidUrl: 'URL de Vera Voice inválida.',

    // Next step
    nextStepLabel: 'TU SIGUIENTE PASO',
    nextStepHeading: 'Sigue avanzando.',
    continueJourney: 'Continuar mi viaje ↗',
    backToHome: '← Volver al inicio',

    // Error recovery
    profileNotFoundTitle: 'Perfil no encontrado',
    profileNotFoundDesc: 'La sesión está activa, pero Vera Orbis no pudo cargar el perfil del estudiante.',
    profileNotFoundAction: 'Por favor inicia sesión de nuevo o contacta a tu profesor.',
    timeoutTitle: 'La conexión tardó demasiado',
    timeoutDesc: 'El servidor o la red tardaron en responder al verificar tu sesión.',
    genericErrorTitle: 'No pudimos cargar tu plataforma',
    genericErrorDesc: 'Ocurrió un error inesperado al verificar tu sesión o tus datos.',
    retryAction: 'Reintentar ↻',
    signOutAction: 'Cerrar sesión ↗'
  },

  en: {
    // Nav
    home: 'Home',
    feedback: 'Feedback',
    progress: 'Progress',
    exercises: 'Exercises',
    signOut: 'Sign out ↗',
    interfaceLangSelect: 'Interface language',

    // Welcome
    journeyEyebrow: 'YOUR VERA ORBIS JOURNEY',
    welcomeBack: 'Welcome Back,',
    welcomeIntro: 'Your language journey continues here. Explore your progress, materials and next steps.',

    // Passport
    passportKicker: '01 — LANGUAGE PASSPORT',
    passportTitle: 'Your language.',
    passportTitleSpan: 'Your identity.',
    passportIntro: 'A digital passport that follows your progress throughout your Vera Orbis journey.',
    studentLabel: 'STUDENT',
    languageLabel: 'LANGUAGE',
    levelLabel: 'LEVEL',
    destinationLabel: 'DESTINATION',
    journeyLabel: 'JOURNEY',
    lessonsLabel: 'LESSONS',
    totalPending: 'TOTAL PENDING',
    lessonsPendingConfig: 'TOTAL LESSONS PENDING CONFIGURATION',
    journeyProgress: 'JOURNEY PROGRESS',
    inProgress: 'IN PROGRESS',
    beginning: 'BEGINNING',
    yourJourney: 'YOUR JOURNEY',
    destination: 'DESTINATION',
    activeJourney: 'ACTIVE JOURNEY',
    learnIt: 'LEARN IT',
    liveIt: 'LIVE IT',
    speakIt: 'SPEAK IT',
    of: 'of',
    completed: 'completed',
    remaining: 'LESSONS REMAINING',

    // Modules
    journeyKicker: '02 — MY JOURNEY',
    journeyHeading: 'Your journey.',
    journeyHeadingSpan: 'Your next step.',
    journeyCardDesc: 'Follow your learning path, explore your roadmap and discover what comes next.',
    journeyCardInnerDesc: 'Explore your roadmap, your lessons and everything ahead in your language journey.',

    materialsKicker: '03 — CLASS MATERIALS',
    materialsHeading: 'Your resources.',
    materialsHeadingSpan: 'Always ready.',
    materialsDesc: 'Access your class materials, readings and personalized study guides.',

    learningAccessKicker: '04 — KEEP LEARNING',
    learningAccessHeading: 'Your learning.',
    learningAccessHeadingSpan: 'Your space.',
    learningAccessDesc: 'Continue your journey through personalized feedback, weekly challenges and your learning resources.',
    feedbackCardTitle: 'Your teacher’s feedback.',
    feedbackCardDesc: 'See personalized observations, recommendations and feedback from your lessons.',
    challengesCardTitle: 'Put it into practice.',
    challengesCardDesc: 'Complete personalized challenges and apply what you learn beyond class.',

    progressKicker: '05 — MY PROGRESS',
    progressHeading: 'See how far you’ve come.',
    progressDesc: 'Track your lessons, celebrate what you’ve completed and see what comes next.',
    progressCardTitle: 'Every lesson. Every step.',
    progressCardDesc: 'See what you’ve completed, what remains and where your learning journey is taking you next.',
    currentProgress: 'CURRENT PROGRESS',
    nextStepIs: 'Your next step:',

    // Vera Voice
    veraVoiceKicker: '06 — VERA VOICE',
    veraVoiceTitle: 'Meet Vera.<br><span>Your speaking partner.</span>',
    veraVoiceDesc: 'Practice, build confidence and speak another language at your own pace.',
    veraVoiceMeetVera: 'Meet Vera',
    veraVoicePartner: 'Your Speaking Partner',
    veraVoiceFlipHint: 'Tap or press Enter to discover more',
    veraVoiceReady: 'READY TO PRACTICE?',
    veraVoiceStartConvo: 'Start a conversation with Vera.',
    veraVoicePracticePace: 'Practice your language and learn at your own pace.',
    veraVoiceStatusConnecting: 'Connecting to Vera Voice...',
    veraVoiceStatusConnected: 'Session connected with Vera Voice.',
    veraVoiceStatusFailed: 'Could not connect the session.',
    veraVoiceStatusTimeout: 'Vera Voice took too long to respond. If the backend is waking up, wait a few seconds and retry.',
    veraVoiceRequiresHttps: 'Vera Voice requires VITE_VERA_VOICE_URL configured with HTTPS in production.',
    veraVoiceInvalidUrl: 'Invalid Vera Voice URL.',

    // Next step
    nextStepLabel: 'YOUR NEXT STEP',
    nextStepHeading: 'Keep moving forward.',
    continueJourney: 'Continue your journey ↗',
    backToHome: '← Back to Home',

    // Error recovery
    profileNotFoundTitle: 'Profile not found',
    profileNotFoundDesc: 'The user is logged in, but Vera Orbis could not load the student profile.',
    profileNotFoundAction: 'Please sign in again or contact your instructor.',
    timeoutTitle: 'The connection timed out',
    timeoutDesc: 'The server or network took too long to verify your session.',
    genericErrorTitle: 'Could not load your platform',
    genericErrorDesc: 'An unexpected error occurred while verifying your session or data.',
    retryAction: 'Retry ↻',
    signOutAction: 'Sign out ↗'
  },

  fr: {
    // Nav
    home: 'Accueil',
    feedback: 'Commentaires',
    progress: 'Progrès',
    exercises: 'Exercices',
    signOut: 'Déconnexion ↗',
    interfaceLangSelect: 'Langue de l’interface',

    // Welcome
    journeyEyebrow: 'VOTRE PARCOURS VERA ORBIS',
    welcomeBack: 'Bienvenue à nouveau,',
    welcomeIntro: 'Votre parcours linguistique se poursuit ici. Découvrez vos progrès, vos supports et vos prochaines étapes.',

    // Passport
    passportKicker: '01 — PASSEPORT LINGUISTIQUE',
    passportTitle: 'Votre langue.',
    passportTitleSpan: 'Votre identité.',
    passportIntro: 'Un passeport numérique qui accompagne vos progrès tout au long de votre expérience Vera Orbis.',
    studentLabel: 'ÉTUDIANT',
    languageLabel: 'LANGUE',
    levelLabel: 'NIVEAU',
    destinationLabel: 'DESTINATION',
    journeyLabel: 'PARCOURS',
    lessonsLabel: 'LEÇONS',
    totalPending: 'TOTAL EN ATTENTE',
    lessonsPendingConfig: 'LEÇONS EN ATTENTE DE CONFIGURATION',
    journeyProgress: 'PROGRÈS DU PARCOURS',
    inProgress: 'EN COURS',
    beginning: 'DÉBUT',
    yourJourney: 'VOTRE PARCOURS',
    destination: 'DESTINATION',
    activeJourney: 'PARCOURS ACTIF',
    learnIt: 'APPRENDRE',
    liveIt: 'VIVRE',
    speakIt: 'PARLER',
    of: 'sur',
    completed: 'terminées',
    remaining: 'LEÇONS RESTANTES',

    // Modules
    journeyKicker: '02 — MON PARCOURS',
    journeyHeading: 'Votre parcours.',
    journeyHeadingSpan: 'Votre prochaine étape.',
    journeyCardDesc: 'Suivez votre chemin d’apprentissage, explorez votre feuille de route et découvrez la suite.',
    journeyCardInnerDesc: 'Explorez votre feuille de route, vos leçons et tout ce qui vous attend.',

    materialsKicker: '03 — SUPPORTS DE COURS',
    materialsHeading: 'Vos ressources.',
    materialsHeadingSpan: 'Toujours prêtes.',
    materialsDesc: 'Accédez à vos supports de cours, lectures et guides personnalisés.',

    learningAccessKicker: '04 — CONTINUEZ D’APPRENDRE',
    learningAccessHeading: 'Votre apprentissage.',
    learningAccessHeadingSpan: 'Votre espace.',
    learningAccessDesc: 'Poursuivez votre parcours grâce aux retours personnalisés, défis hebdomadaires et ressources.',
    feedbackCardTitle: 'Commentaires de votre professeur.',
    feedbackCardDesc: 'Consultez les observations personnalisées, recommandations et retours de vos leçons.',
    challengesCardTitle: 'Mettez en pratique.',
    challengesCardDesc: 'Relevez des défis personnalisés et appliquez vos acquis au-delà du cours.',

    progressKicker: '05 — MES PROGRÈS',
    progressHeading: 'Mesurez vos progrès.',
    progressDesc: 'Suivez vos leçons, célébrez vos réussites et découvrez ce qui vous attend.',
    progressCardTitle: 'Chaque leçon. Chaque étape.',
    progressCardDesc: 'Voyez ce que vous avez accompli, ce qu’il reste et où votre parcours vous mène.',
    currentProgress: 'PROGRÈS ACTUEL',
    nextStepIs: 'Votre prochaine étape :',

    // Vera Voice
    veraVoiceKicker: '06 — VERA VOICE',
    veraVoiceTitle: 'Rencontrez Vera.<br><span>Votre partenaire d’expression.</span>',
    veraVoiceDesc: 'Pratiquez, gagnez en confiance et parlez une autre langue à votre rythme.',
    veraVoiceMeetVera: 'Rencontrez Vera',
    veraVoicePartner: 'Votre partenaire d’expression',
    veraVoiceFlipHint: 'Touchez ou appuyez sur Entrée pour en savoir plus',
    veraVoiceReady: 'PRÊT À PRATIQUER ?',
    veraVoiceStartConvo: 'Engagez une conversation avec Vera.',
    veraVoicePracticePace: 'Pratiquez votre langue et apprenez à votre propre rythme.',
    veraVoiceStatusConnecting: 'Connexion à Vera Voice...',
    veraVoiceStatusConnected: 'Session connectée avec Vera Voice.',
    veraVoiceStatusFailed: 'Impossible de connecter la session.',
    veraVoiceStatusTimeout: 'Vera Voice a mis trop de temps à répondre. Si le serveur redémarre, veuillez patienter.',
    veraVoiceRequiresHttps: 'Vera Voice nécessite VITE_VERA_VOICE_URL configuré avec HTTPS en production.',
    veraVoiceInvalidUrl: 'URL Vera Voice invalide.',

    // Next step
    nextStepLabel: 'VOTRE PROCHAINE ÉTAPE',
    nextStepHeading: 'Continuez d’avancer.',
    continueJourney: 'Continuer mon parcours ↗',
    backToHome: '← Retour à l’accueil',

    // Error recovery
    profileNotFoundTitle: 'Profil non trouvé',
    profileNotFoundDesc: 'L’utilisateur est connecté, mais Vera Orbis n’a pas pu charger le profil.',
    profileNotFoundAction: 'Veuillez vous reconnecter ou contacter votre professeur.',
    timeoutTitle: 'La connexion a expiré',
    timeoutDesc: 'Le serveur ou le réseau a mis trop de temps à répondre.',
    genericErrorTitle: 'Impossible de charger votre plateforme',
    genericErrorDesc: 'Une erreur inattendue est survenue lors de la vérification de vos données.',
    retryAction: 'Réessayer ↻',
    signOutAction: 'Déconnexion ↗'
  },

  zh: {
    // Nav
    home: '首页',
    feedback: '教师反馈',
    progress: '学习进度',
    exercises: '课后练习',
    signOut: '退出登录 ↗',
    interfaceLangSelect: '界面语言',

    // Welcome
    journeyEyebrow: '您的 VERA ORBIS 学习旅程',
    welcomeBack: '欢迎回来，',
    welcomeIntro: '您的语言之旅在此继续。随时探索您的学习进度、课程资料与下一步规划。',

    // Passport
    passportKicker: '01 — 语言护照',
    passportTitle: '您的语言。',
    passportTitleSpan: '您的身份。',
    passportIntro: '数字化语言护照，全程陪伴并记录您在 Vera Orbis 学习旅程中的每一次蜕变。',
    studentLabel: '学员姓名',
    languageLabel: '学习语言',
    levelLabel: '当前级别',
    destinationLabel: '学习目标',
    journeyLabel: '课时进度',
    lessonsLabel: '课时',
    totalPending: '待配置',
    lessonsPendingConfig: '总课时待配置',
    journeyProgress: '总进度',
    inProgress: '进行中',
    beginning: '起点',
    yourJourney: '当前阶段',
    destination: '目标终点',
    activeJourney: '活跃状态',
    learnIt: '学习',
    liveIt: '体验',
    speakIt: '开口',
    of: '/',
    completed: '节已完成',
    remaining: '节课待学',

    // Modules
    journeyKicker: '02 — 我的旅程',
    journeyHeading: '您的路线。',
    journeyHeadingSpan: '下一步行动。',
    journeyCardDesc: '跟随个性化学习路径，查阅学习蓝图并探索后续内容。',
    journeyCardInnerDesc: '查阅路线规划、课程内容及语言学习前方的每一步。',

    materialsKicker: '03 — 课程资料',
    materialsHeading: '专属资源。',
    materialsHeadingSpan: '随时查阅。',
    materialsDesc: '随时查阅您的课堂讲义、精选读物与个性化学习指南。',

    learningAccessKicker: '04 — 持续精进',
    learningAccessHeading: '自主学习。',
    learningAccessHeadingSpan: '专属空间。',
    learningAccessDesc: '通过教师专属反馈、每周实战挑战与学习资源持续精进。',
    feedbackCardTitle: '教师个性化点评',
    feedbackCardDesc: '查阅针对课堂表现的详细观察、针对性建议与专业点评。',
    challengesCardTitle: '学以致用',
    challengesCardDesc: '完成量身定制的周挑战，在课堂之外实践所学。',

    progressKicker: '05 — 我的成长',
    progressHeading: '见证您的每一点进步。',
    progressDesc: '记录每节课的足迹，为每一次突破喝彩，并清晰预见下一步。',
    progressCardTitle: '每堂课，每一步。',
    progressCardDesc: '清晰掌握已学内容、待学课时与未来进阶路线。',
    currentProgress: '当前进度',
    nextStepIs: '下一步计划：',

    // Vera Voice
    veraVoiceKicker: '06 — VERA VOICE',
    veraVoiceTitle: '结识 Vera。<br><span>您的专属口语伙伴。</span>',
    veraVoiceDesc: '轻松练习口语，重塑自信，按自己的节奏随时开口畅聊。',
    veraVoiceMeetVera: '结识 Vera',
    veraVoicePartner: '您的口语伙伴',
    veraVoiceFlipHint: '点击或按 Enter 了解更多',
    veraVoiceReady: '准备好开口了吗？',
    veraVoiceStartConvo: '与 Vera 开启一段自由对话。',
    veraVoicePracticePace: '按您自己的节奏在真实语境中练习。',
    veraVoiceStatusConnecting: '正在连接 Vera Voice...',
    veraVoiceStatusConnected: '已成功连接 Vera Voice。',
    veraVoiceStatusFailed: '未能连接语音会话。',
    veraVoiceStatusTimeout: 'Vera Voice 响应超时。如果后端服务器正在唤醒，请稍候并重试。',
    veraVoiceRequiresHttps: '在生产环境中，Vera Voice 需要配置 HTTPS 的 VITE_VERA_VOICE_URL。',
    veraVoiceInvalidUrl: 'Vera Voice URL 无效。',

    // Next step
    nextStepLabel: '下一步行动',
    nextStepHeading: '步履不停。',
    continueJourney: '继续我的旅程 ↗',
    backToHome: '← 返回首页',

    // Error recovery
    profileNotFoundTitle: '未找到学员档案',
    profileNotFoundDesc: '用户已登录，但 Vera Orbis 未能加载该学员的档案。',
    profileNotFoundAction: '请重新登录或联系您的导师。',
    timeoutTitle: '连接超时',
    timeoutDesc: '验证您的会话时服务器响应超时。',
    genericErrorTitle: '无法加载学习平台',
    genericErrorDesc: '验证您的会话或数据时发生了未预期的错误。',
    retryAction: '重试 ↻',
    signOutAction: '退出登录 ↗'
  }
}

/**
 * Returns translated string for key in given interface language.
 */
export function t(key, lang = DEFAULT_INTERFACE_LANGUAGE) {
  const normLang = normalizeInterfaceLanguage(lang)
  const dict = dictionaries[normLang] || dictionaries.es
  if (key in dict) {
    return dict[key]
  }
  // Fallback to English, then Spanish
  if (dictionaries.en && key in dictionaries.en) {
    return dictionaries.en[key]
  }
  return dictionaries.es[key] || key
}

