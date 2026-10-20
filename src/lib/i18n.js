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
    calendar: 'Calendario',
    packages: 'Paquetes',
    culture: 'Cultura',
    inbox: 'Mensajes',
    reports: 'Reporte',
    settings: 'Ajustes',
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

    // Inbox
    inboxKicker: '07 — MENSAJES Y COMUNICACIONES',
    inboxHeading: 'Tus conversaciones.',
    inboxHeadingSpan: 'Directo con tu profesora.',
    inboxDesc: 'Mantén contacto directo con tu profesora, recibe notas de clase y responde mensajes.',

    // Inbox details
    inboxTitle: 'Bandeja de Mensajes',
    sendMessageToTeacher: 'Enviar mensaje a tu profesora',
    sendMessageDesc: 'Escribe tus dudas sobre las clases, tareas o avances.',
    subjectLabel: 'Asunto',
    subjectPlaceholder: 'Ej. Duda con la tarea de conversación',
    messageLabel: 'Mensaje',
    messagePlaceholder: 'Escribe tu mensaje aquí...',
    sendMessageBtn: 'Enviar mensaje',
    receivedMessages: 'Historial de mensajes',
    noMessagesTitle: 'No tienes mensajes en tu bandeja.',
    noMessagesDesc: 'Cuando tu profesora te escriba o envíes un mensaje, aparecerán aquí.',
    allMessagesRead: 'Al día',
    unreadCount: 'no leídos',
    totalMessages: 'mensajes en total',
    markAsRead: 'Marcar como leído',
    fromTeacher: 'Profesora',
    fromYou: 'Tú',

    // Calendar details
    upcomingSessions: 'sesiones programadas',
    pastSessions: 'sesiones completadas',
    upcomingClassesTitle: 'Próximas Clases en Vivo',
    noUpcomingClasses: 'No tienes clases programadas actualmente.',
    noUpcomingClassesHint: 'Tu profesora programará tu próxima sesión aquí.',
    sessionNotes: 'Notas de la sesión:',
    pastSessionsTitle: 'Historial de clases y asistencia',
    noPastClasses: 'Aún no registras clases completadas.',
    noPastClassesHint: 'Cuando completes tus primeras sesiones aparecerán aquí con su registro de asistencia.',
    datePending: 'Fecha pendiente',

    // Packages details
    availableClasses: 'Clases disponibles',
    classesRemaining: 'clases restantes',
    totalCompleted: 'clases completadas en total',
    activePackagesTitle: 'Paquetes de Aprendizaje Activos',
    noActivePackages: 'No tienes paquetes de clases activos.',
    noActivePackagesHint: 'Comunícate con Vera Orbis para renovar o activar tu próximo paquete.',
    packageOf: 'Paquete de',
    classes: 'clases',
    completed: 'completadas',
    paymentHistoryTitle: 'Historial de pagos y colegiaturas',
    noPayments: 'No hay registros de pago disponibles.',
    paymentReceipt: 'Comprobante de pago',

    // Culture details
    exploreCulture: 'Explorar Recursos',
    noCultureTitle: 'No hay recursos culturales disponibles.',
    noCultureDesc: 'Tu profesora publicará artículos, tradiciones y recomendaciones culturales aquí.',
    openResource: 'Explorar recurso ↗',

    // Academic report details
    academicReportKicker: '02 — DOSSIER ACADÉMICO',
    academicReportHeading: 'Tu expediente académico.',
    academicReportHeadingSpan: 'Progreso certificado.',
    academicReportDesc: 'Revisa tu nivel CEFR oficial, avance porcentual, módulo actual y recomendaciones pedagógicas.',
    officialDossier: 'Dossier Académico Oficial',

    // Settings details
    settingsKicker: '11 — PREFERENCIAS',
    settingsHeading: 'Configuración de Plataforma.',
    settingsHeadingSpan: 'Personaliza tu experiencia.',
    settingsDesc: 'Selecciona el idioma de la interfaz. Esto no altera tu idioma objetivo de aprendizaje ni tu nivel.',
    interfaceLanguageTitle: 'Idioma de la Interfaz',
    interfaceLanguageDesc: 'Elige el idioma con el que navegarás en Vera Orbis.',

    // Package counters & titles
    remainingClassesLabel: 'Clases disponibles',
    readyToBook: 'sesiones listas para agendar',
    usedClassesLabel: 'Clases completadas',
    lessonsDone: 'sesiones realizadas',
    totalClassesLabel: 'Total asignadas',
    acrossAllPackages: 'en todos tus paquetes',
    myPackagesTitle: 'Paquetes de Aprendizaje Activos',
    noPackagesTitle: 'No tienes paquetes de clases activos.',
    noPackagesHint: 'Tu profesora activará tu paquete de clases aquí.',
    classesLeft: 'clases restantes',
    remaining: 'restantes',
    paymentsTitle: 'Historial de pagos y colegiaturas',
    noPaymentsTitle: 'No hay registros de pago disponibles.',
    noPaymentsHint: 'Los comprobantes de pago de tu colegiatura aparecerán aquí.',
    dateHeader: 'Fecha',
    amountHeader: 'Monto',
    statusHeader: 'Estado',
    referenceHeader: 'Referencia',

    // Culture
    exploreResource: 'Explorar recurso ↗',
    noCultureHint: 'Tu profesora compartirá artículos y tradiciones culturales aquí.',

    // Inbox extra
    unreadMessages: 'no leídos',

    // Academic Dossier extra
    officialRecord: 'Dossier Académico Oficial',
    overallProgress: 'Progreso general',
    lessonsCompleted: 'lecciones completadas',
    currentModuleLabel: 'Módulo actual',
    nextMilestoneLabel: 'Próximo paso',
    learningGoalLabel: 'Objetivo de aprendizaje',
    uiLanguageLabel: 'Idioma de interfaz',
    activitySummary: 'Resumen de actividad',
    materialsAssigned: 'Materiales asignados',
    challengesCompleted: 'Retos completados',
    exercisesAssigned: 'Ejercicios asignados',
    feedbackReceived: 'Comentarios recibidos',
    scheduledSessions: 'Clases programadas',




    // Calendar
    calendarKicker: '08 — CALENDARIO Y CLASES',
    calendarHeading: 'Tus clases agendadas.',
    calendarHeadingSpan: 'Aprende en tiempo real.',
    calendarDesc: 'Consulta tus próximas sesiones en vivo, horario, modalidad e historial de asistencia.',

    // Packages
    packagesKicker: '09 — PAQUETES Y PAGOS',
    packagesHeading: 'Tus paquetes de clase.',
    packagesHeadingSpan: 'Controla tus sesiones disponibles.',
    packagesDesc: 'Revisa tus paquetes activos, clases restantes y el historial de pagos de tu colegiatura.',

    // Culture
    cultureKicker: '10 — INMERSIÓN CULTURAL',
    cultureHeading: 'Más allá de la gramática.',
    cultureHeadingSpan: 'Vive la cultura.',
    cultureDesc: 'Descubre artículos, tradiciones y recursos multimedia para sumergirte en tu idioma objetivo.',

    // Reports
    reportKicker: '11 — REPORTE ACADÉMICO',
    reportHeading: 'Tu expediente académico.',
    reportHeadingSpan: 'Cada logro documentado.',
    reportDesc: 'Resumen completo de tu nivel, avance, asistencia, retos y retroalimentación recibida.',

    // Settings
    settingsKicker: '12 — AJUSTES Y PREFERENCIAS',
    settingsHeading: 'Tus preferencias de plataforma.',
    settingsHeadingSpan: 'Personaliza tu experiencia.',
    settingsDesc: 'Configura el idioma de la interfaz y revisa los datos de tu perfil de estudiante.',

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
    calendar: 'Calendar',
    packages: 'Packages',
    culture: 'Culture',
    inbox: 'Inbox',
    reports: 'Reports',
    settings: 'Settings',
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

    // Inbox
    inboxKicker: '07 — INBOX & MESSAGES',
    inboxHeading: 'Your conversations.',
    inboxHeadingSpan: 'Direct with your teacher.',
    inboxDesc: 'Stay in touch with your teacher, receive lesson notes, and review announcements.',

    // Inbox details
    inboxTitle: 'Message Inbox',
    sendMessageToTeacher: 'Send message to your teacher',
    sendMessageDesc: 'Ask questions about your classes, assignments, or progress.',
    subjectLabel: 'Subject',
    subjectPlaceholder: 'e.g. Question about speaking assignment',
    messageLabel: 'Message',
    messagePlaceholder: 'Write your message here...',
    sendMessageBtn: 'Send message',
    receivedMessages: 'Message History',
    noMessagesTitle: 'No messages in your inbox yet.',
    noMessagesDesc: 'When your teacher messages you or you send an inquiry, it will appear here.',
    allMessagesRead: 'All caught up',
    unreadCount: 'unread',
    totalMessages: 'total messages',
    markAsRead: 'Mark as read',
    fromTeacher: 'Teacher',
    fromYou: 'You',

    // Calendar details
    upcomingSessions: 'upcoming sessions',
    pastSessions: 'completed sessions',
    upcomingClassesTitle: 'Upcoming Live Classes',
    noUpcomingClasses: 'No classes currently scheduled.',
    noUpcomingClassesHint: 'Your teacher will add your next scheduled session time here.',
    sessionNotes: 'Session notes:',
    pastSessionsTitle: 'Class History & Attendance',
    noPastClasses: 'No completed classes recorded yet.',
    noPastClassesHint: 'Your completed sessions and attendance will appear here once recorded.',
    datePending: 'Date pending',

    // Packages details
    availableClasses: 'Available classes',
    classesRemaining: 'classes remaining',
    totalCompleted: 'total classes completed',
    activePackagesTitle: 'Active Learning Packages',
    noActivePackages: 'No active packages found.',
    noActivePackagesHint: 'Contact Vera Orbis to activate or renew your class package.',
    packageOf: 'Package of',
    classes: 'classes',
    completed: 'completed',
    paymentHistoryTitle: 'Payment History & Invoices',
    noPayments: 'No payment records available.',
    paymentReceipt: 'Payment receipt',

    // Culture details
    exploreCulture: 'Explore Resources',
    noCultureTitle: 'No cultural resources published yet.',
    noCultureDesc: 'Your teacher will curate articles, media, and cultural traditions here.',
    openResource: 'Explore resource ↗',

    // Academic report details
    academicReportKicker: '02 — ACADEMIC DOSSIER',
    academicReportHeading: 'Your academic record.',
    academicReportHeadingSpan: 'Certified progress.',
    academicReportDesc: 'Track your official CEFR level, completion percentage, current module, and learning targets.',
    officialDossier: 'Official Academic Dossier',

    // Settings details
    settingsKicker: '11 — PREFERENCES',
    settingsHeading: 'Platform Settings.',
    settingsHeadingSpan: 'Personalize your experience.',
    settingsDesc: 'Select your interface language. This does not alter your learning target language or level.',
    interfaceLanguageTitle: 'Interface Language',
    interfaceLanguageDesc: 'Choose the language you navigate Vera Orbis with.',

    // Package counters & titles
    remainingClassesLabel: 'Available classes',
    readyToBook: 'sessions ready to schedule',
    usedClassesLabel: 'Classes completed',
    lessonsDone: 'sessions accomplished',
    totalClassesLabel: 'Total allocated',
    acrossAllPackages: 'across all your packages',
    myPackagesTitle: 'Active Learning Packages',
    noPackagesTitle: 'No active packages found.',
    noPackagesHint: 'Your teacher will activate your class packages upon enrollment.',
    classesLeft: 'classes left',
    remaining: 'remaining',
    paymentsTitle: 'Payment History & Receipts',
    noPaymentsTitle: 'No payment records available.',
    noPaymentsHint: 'Recorded tuition and package payments will be documented here.',
    dateHeader: 'Date',
    amountHeader: 'Amount',
    statusHeader: 'Status',
    referenceHeader: 'Reference',

    // Culture
    exploreResource: 'Explore resource ↗',
    noCultureHint: 'Your teacher will share cultural insights and media recommendations here.',

    // Inbox extra
    unreadMessages: 'unread',

    // Academic Dossier extra
    officialRecord: 'Official Academic Dossier',
    overallProgress: 'Overall progress',
    lessonsCompleted: 'lessons completed',
    currentModuleLabel: 'Current module',
    nextMilestoneLabel: 'Next milestone',
    learningGoalLabel: 'Learning goal',
    uiLanguageLabel: 'UI language',
    activitySummary: 'Activity summary',
    materialsAssigned: 'Materials assigned',
    challengesCompleted: 'Challenges completed',
    exercisesAssigned: 'Exercises assigned',
    feedbackReceived: 'Feedback received',
    scheduledSessions: 'Scheduled sessions',




    // Calendar
    calendarKicker: '08 — CALENDAR & SCHEDULE',
    calendarHeading: 'Your scheduled sessions.',
    calendarHeadingSpan: 'Learn in real time.',
    calendarDesc: 'Track your live classes, upcoming session schedules, modality, and past attendance record.',

    // Packages
    packagesKicker: '09 — PACKAGES & PAYMENTS',
    packagesHeading: 'Your learning packages.',
    packagesHeadingSpan: 'Track your available sessions.',
    packagesDesc: 'Review your active lesson packages, remaining sessions, and complete payment record.',

    // Culture
    cultureKicker: '10 — CULTURAL IMMERSION',
    cultureHeading: 'Beyond the grammar.',
    cultureHeadingSpan: 'Experience the culture.',
    cultureDesc: 'Explore handpicked articles, traditions, idioms, and multimedia resources to live your target language.',

    // Reports
    reportKicker: '11 — ACADEMIC REPORT',
    reportHeading: 'Your learning dossier.',
    reportHeadingSpan: 'Every milestone documented.',
    reportDesc: 'A comprehensive summary of your level, milestones achieved, attendance, and feedback throughout your journey.',

    // Settings
    settingsKicker: '12 — SETTINGS & PREFERENCES',
    settingsHeading: 'Your platform settings.',
    settingsHeadingSpan: 'Tailor your experience.',
    settingsDesc: 'Manage your interface language, view your profile settings, and configure your learning preferences.',

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
    calendar: 'Calendrier',
    packages: 'Forfaits',
    culture: 'Culture',
    inbox: 'Messagerie',
    reports: 'Bilan',
    settings: 'Paramètres',
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

    // Inbox
    inboxKicker: '07 — MESSAGERIE',
    inboxHeading: 'Vos conversations.',
    inboxHeadingSpan: 'En direct avec votre professeur.',
    inboxDesc: 'Restez en contact avec votre professeur, recevez des notes de cours et échangez facilement.',

    // Inbox details
    inboxTitle: 'Boîte de réception',
    sendMessageToTeacher: 'Envoyer un message à votre professeur',
    sendMessageDesc: 'Posez vos questions sur vos cours, devoirs ou progrès.',
    subjectLabel: 'Objet',
    subjectPlaceholder: 'ex. Question sur le devoir d\'expression',
    messageLabel: 'Message',
    messagePlaceholder: 'Écrivez votre message ici...',
    sendMessageBtn: 'Envoyer le message',
    receivedMessages: 'Historique des messages',
    noMessagesTitle: 'Aucun message dans votre boîte.',
    noMessagesDesc: 'Les échanges avec votre professeur s\'afficheront ici.',
    allMessagesRead: 'À jour',
    unreadCount: 'non lus',
    totalMessages: 'messages au total',
    markAsRead: 'Marquer comme lu',
    fromTeacher: 'Professeur',
    fromYou: 'Vous',

    // Calendar details
    upcomingSessions: 'séances à venir',
    pastSessions: 'séances terminées',
    upcomingClassesTitle: 'Prochains cours en direct',
    noUpcomingClasses: 'Aucun cours planifié pour le moment.',
    noUpcomingClassesHint: 'Votre professeur planifiera votre prochain cours ici.',
    sessionNotes: 'Notes de la séance :',
    pastSessionsTitle: 'Historique des cours et présences',
    noPastClasses: 'Aucun cours terminé enregistré pour le moment.',
    noPastClassesHint: 'Vos cours terminés apparaîtront ici avec leur relevé de présence.',
    datePending: 'Date en attente',

    // Packages details
    availableClasses: 'Cours disponibles',
    classesRemaining: 'cours restants',
    totalCompleted: 'cours complétés au total',
    activePackagesTitle: 'Forfaits d\'apprentissage actifs',
    noActivePackages: 'Aucun forfait actif trouvé.',
    noActivePackagesHint: 'Contactez Vera Orbis pour activer ou renouveler votre forfait.',
    packageOf: 'Forfait de',
    classes: 'cours',
    completed: 'complétés',
    paymentHistoryTitle: 'Historique des paiements',
    noPayments: 'Aucun paiement enregistré.',
    paymentReceipt: 'Reçu de paiement',

    // Culture details
    exploreCulture: 'Explorer les ressources',
    noCultureTitle: 'Aucune ressource culturelle disponible.',
    noCultureDesc: 'Votre professeur partagera des articles et des traditions culturelles ici.',
    openResource: 'Explorer la ressource ↗',

    // Academic report details
    academicReportKicker: '02 — DOSSIER ACADÉMIQUE',
    academicReportHeading: 'Votre dossier académique.',
    academicReportHeadingSpan: 'Progression certifiée.',
    academicReportDesc: 'Consultez votre niveau CECRL officiel, votre progression et vos recommandations pédagogiques.',
    officialDossier: 'Dossier académique officiel',

    // Settings details
    settingsKicker: '11 — PRÉFÉRENCES',
    settingsHeading: 'Paramètres de la plateforme.',
    settingsHeadingSpan: 'Personnalisez votre expérience.',
    settingsDesc: 'Choisissez la langue de l\'interface sans modifier votre langue cible.',
    interfaceLanguageTitle: 'Langue de l\'interface',
    interfaceLanguageDesc: 'Choisissez la langue pour naviguer sur Vera Orbis.',

    // Package counters & titles
    remainingClassesLabel: 'Cours disponibles',
    readyToBook: 'séances prêtes à planifier',
    usedClassesLabel: 'Cours complétés',
    lessonsDone: 'séances accomplies',
    totalClassesLabel: 'Total alloué',
    acrossAllPackages: 'sur l\'ensemble de vos forfaits',
    myPackagesTitle: 'Forfaits d\'apprentissage actifs',
    noPackagesTitle: 'Aucun forfait actif trouvé.',
    noPackagesHint: 'Votre professeur activera vos forfaits de cours ici.',
    classesLeft: 'cours restants',
    remaining: 'restants',
    paymentsTitle: 'Historique des paiements',
    noPaymentsTitle: 'Aucun paiement enregistré.',
    noPaymentsHint: 'L\'historique de vos paiements apparaîtra ici.',
    dateHeader: 'Date',
    amountHeader: 'Montant',
    statusHeader: 'Statut',
    referenceHeader: 'Référence',

    // Culture
    exploreResource: 'Explorer la ressource ↗',
    noCultureHint: 'Votre professeur partagera des repères culturels et recommandations ici.',

    // Inbox extra
    unreadMessages: 'non lus',

    // Academic Dossier extra
    officialRecord: 'Dossier académique officiel',
    overallProgress: 'Progression globale',
    lessonsCompleted: 'leçons complétées',
    currentModuleLabel: 'Module actuel',
    nextMilestoneLabel: 'Prochaine étape',
    learningGoalLabel: 'Objectif d\'apprentissage',
    uiLanguageLabel: 'Langue de l\'interface',
    activitySummary: 'Résumé d\'activité',
    materialsAssigned: 'Supports assignés',
    challengesCompleted: 'Défis complétés',
    exercisesAssigned: 'Exercices assignés',
    feedbackReceived: 'Retours reçus',
    scheduledSessions: 'Séances planifiées',




    // Calendar
    calendarKicker: '08 — CALENDRIER ET COURS',
    calendarHeading: 'Vos cours planifiés.',
    calendarHeadingSpan: 'Apprenez en direct.',
    calendarDesc: 'Consultez vos prochaines séances en direct, horaires, modalités et historique d’assiduité.',

    // Packages
    packagesKicker: '09 — FORFAITS ET PAIEMENTS',
    packagesHeading: 'Vos forfaits de cours.',
    packagesHeadingSpan: 'Suivez vos séances disponibles.',
    packagesDesc: 'Consultez vos forfaits actifs, vos cours restants et l’historique complet de vos règlements.',

    // Culture
    cultureKicker: '10 — IMMERSION CULTURELLE',
    cultureHeading: 'Au-delà de la grammaire.',
    cultureHeadingSpan: 'Vivez la culture.',
    cultureDesc: 'Découvrez des articles, traditions et ressources multimédias pour vivre votre langue cible.',

    // Reports
    reportKicker: '11 — BILAN PÉDAGOGIQUE',
    reportHeading: 'Votre dossier pédagogique.',
    reportHeadingSpan: 'Chaque étape documentée.',
    reportDesc: 'Un récapitulatif complet de votre niveau, de vos progrès, de votre assiduité et des retours reçus.',

    // Settings
    settingsKicker: '12 — PARAMÈTRES ET PRÉFÉRENCES',
    settingsHeading: 'Vos préférences de plateforme.',
    settingsHeadingSpan: 'Personnalisez votre expérience.',
    settingsDesc: 'Choisissez la langue de l’interface et gérez vos préférences d’apprentissage.',

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
    calendar: '课表日程',
    packages: '课时包',
    culture: '文化沉浸',
    inbox: '收件箱',
    reports: '学情报告',
    settings: '个性设置',
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

    // Inbox
    inboxKicker: '07 — 消息与沟通',
    inboxHeading: '专属对话。',
    inboxHeadingSpan: '与授课导师直连。',
    inboxDesc: '与授课导师保持紧密联系，查阅课后要点与专属教学通知。',

    // Calendar
    calendarKicker: '08 — 课表与日程',
    calendarHeading: '实时课表安排。',
    calendarHeadingSpan: '实时互动精进。',
    calendarDesc: '掌握即将开始的直播互动课时、上课形式及往期考勤记录。',

    // Packages
    packagesKicker: '09 — 课时包与支付',
    packagesHeading: '您的课时账户。',
    packagesHeadingSpan: '掌握剩余课时明细。',
    packagesDesc: '查阅当前生效的课时包、可用节数及完整学费流水记录。',

    // Culture
    cultureKicker: '10 — 文化深度沉浸',
    cultureHeading: '超越语法本身。',
    cultureHeadingSpan: '地道体验文化。',
    cultureDesc: '探索精选文化札记、生活风俗与音视频素材，全方位融入目标语言。',

    // Reports
    reportKicker: '11 — 学业档案报告',
    reportHeading: '您的学业里程碑。',
    reportHeadingSpan: '见证每一步成长。',
    reportDesc: '详尽汇总您的语言级别、课时出勤、周挑战成果与综合导师评述。',

    // Settings
    settingsKicker: '12 — 设置与偏好',
    settingsHeading: '平台设置与偏好。',
    settingsHeadingSpan: '定制专属体验。',
    settingsDesc: '自主切换系统界面语言，查看个人学籍信息与学习偏好。',

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

