export type Language = 'es' | 'en'

export interface TranslationSchema {
  // Sidebar & Navigation
  addGame: string
  store: string
  specs: string
  downloads: string
  extensions: string
  settings: string
  exit: string

  // Top bar & Header
  library: string
  home: string
  friends: string
  noMusic: string
  gameSingular: string
  gamePlural: string

  // Home card & Actions
  connected: string
  disconnected: string
  active: string
  play: string
  playing: string
  install: string
  download: string
  open: string

  // Settings Tabs
  tabHome: string
  tabCustomization: string
  tabHelp: string

  // Settings - Home Tab
  shortcutsTitle: string
  shortcutsSubtitle: string
  languageTitle: string
  languageDesc: string
  selectLanguage: string
  spanish: string
  english: string
  linkSteam: string
  steamLinked: string
  createSteamShortcut: string
  unlink: string
  checkUpdates: string
  checkingUpdates: string
  downloadUpdate: string
  checkNewVersions: string
  otherTitle: string
  otherSubtitle: string
  defaultStore: string

  // Settings - Customization Tab
  profileTitle: string
  username: string
  customBackground: string
  defaultBackground: string
  changeBackground: string
  restoreBackground: string
  chooseFolder: string
  folderBackgrounds: string
  folderBackgroundsTitle: string
  backgroundCountSingular: string
  backgroundCountPlural: string

  // Settings - Help Tab
  helpTitle: string
  helpSubtitle: string
  welcomeTutorial: string
  viewTutorial: string

  // Helper Modal
  welcome: string
  welcomeHeading1: string
  welcomeDesc1: string
  welcomeHeading2: string
  welcomeDesc2: string
  welcomeHeading3: string
  welcomeDesc3: string
  dontShowAgain: string
  next: string
  start: string
}

export const translations: Record<Language, TranslationSchema> = {
  es: {
    addGame: 'Agregar juego',
    store: 'Tienda',
    specs: 'Especificaciones',
    downloads: 'Descargas',
    extensions: 'Extensiones',
    settings: 'Ajustes',
    exit: 'Salir',

    library: 'Biblioteca',
    home: 'Inicio',
    friends: 'Amigos',
    noMusic: 'Sin música',
    gameSingular: 'juego',
    gamePlural: 'juegos',

    connected: 'Conectado',
    disconnected: 'Desconectado',
    active: 'Activo',
    play: 'Jugar',
    playing: 'Jugando',
    install: 'Instalar',
    download: 'Descargar',
    open: 'Abrir',

    tabHome: 'Inicio',
    tabCustomization: 'Personalización',
    tabHelp: 'Ayuda',

    shortcutsTitle: 'Accesos directos',
    shortcutsSubtitle: 'Opciones rápidas y configuración del sistema',
    languageTitle: 'Idioma',
    languageDesc: 'Idioma de la interfaz',
    selectLanguage: 'Seleccionar idioma',
    spanish: 'Español',
    english: 'English',
    linkSteam: 'Vincular Steam',
    steamLinked: 'Cuenta conectada',
    createSteamShortcut: 'Crear atajo de Steam',
    unlink: 'Desvincular',
    checkUpdates: 'Buscar actualización',
    checkingUpdates: 'Buscando...',
    downloadUpdate: 'Descargar actualización',
    checkNewVersions: 'Comprobar nuevas versiones',
    otherTitle: 'Otros',
    otherSubtitle: 'Configuración general de la aplicación',
    defaultStore: 'Tienda por defecto',

    profileTitle: 'Perfil',
    username: 'Nombre de usuario',
    customBackground: 'Fondo personalizado',
    defaultBackground: 'Fondo por defecto',
    changeBackground: 'Cambiar fondo',
    restoreBackground: 'Restaurar',
    chooseFolder: 'Elegir carpeta',
    folderBackgrounds: 'Fondos de la carpeta',
    folderBackgroundsTitle: 'Fondos de la carpeta',
    backgroundCountSingular: 'fondo',
    backgroundCountPlural: 'fondos',

    helpTitle: 'Centro de ayuda y tutoriales',
    helpSubtitle: 'Explora las guías interactivas para conocer y aprovechar al máximo HASHI.',
    welcomeTutorial: 'Bienvenida',
    viewTutorial: 'Ver tutorial',

    welcome: 'Te damos la bienvenida a HASHI',
    welcomeHeading1: 'Tu lanzador de juegos personal',
    welcomeDesc1: 'Organiza y ejecuta todos tus juegos de PC, Steam y aplicaciones desde un solo lugar.',
    welcomeHeading2: '¡Personalízalo todo!',
    welcomeDesc2: 'Desde portadas hasta fondos, cada detalle está en tus manos.',
    welcomeHeading3: 'Todo listo para comenzar',
    welcomeDesc3: 'Disfruta de tu biblioteca personalizada con soporte para mando, efectos de sonido e interfaz inmersiva.',
    dontShowAgain: 'No mostrar de nuevo',
    next: 'Siguiente',
    start: 'Comenzar'
  },
  en: {
    addGame: 'Add game',
    store: 'Store',
    specs: 'Specs',
    downloads: 'Downloads',
    extensions: 'Extensions',
    settings: 'Settings',
    exit: 'Exit',

    library: 'Library',
    home: 'Home',
    friends: 'Friends',
    noMusic: 'No music',
    gameSingular: 'game',
    gamePlural: 'games',

    connected: 'Online',
    disconnected: 'Offline',
    active: 'Active',
    play: 'Play',
    playing: 'Playing',
    install: 'Install',
    download: 'Download',
    open: 'Open',

    tabHome: 'Home',
    tabCustomization: 'Customization',
    tabHelp: 'Help',

    shortcutsTitle: 'Shortcuts & System',
    shortcutsSubtitle: 'Quick options and system settings',
    languageTitle: 'Language',
    languageDesc: 'Interface language',
    selectLanguage: 'Select language',
    spanish: 'Spanish',
    english: 'English',
    linkSteam: 'Link Steam',
    steamLinked: 'Account connected',
    createSteamShortcut: 'Create Steam shortcut',
    unlink: 'Unlink',
    checkUpdates: 'Check for updates',
    checkingUpdates: 'Checking...',
    downloadUpdate: 'Download update',
    checkNewVersions: 'Check for new versions',
    otherTitle: 'Other',
    otherSubtitle: 'General application settings',
    defaultStore: 'Default store',

    profileTitle: 'Profile',
    username: 'Username',
    customBackground: 'Custom background',
    defaultBackground: 'Default background',
    changeBackground: 'Change background',
    restoreBackground: 'Restore',
    chooseFolder: 'Choose folder',
    folderBackgrounds: 'Folder backgrounds',
    folderBackgroundsTitle: 'Folder backgrounds',
    backgroundCountSingular: 'wallpaper',
    backgroundCountPlural: 'wallpapers',

    helpTitle: 'Help Center & Tutorials',
    helpSubtitle: 'Explore interactive guides to discover and make the most of HASHI.',
    welcomeTutorial: 'Welcome',
    viewTutorial: 'View tutorial',

    welcome: 'Welcome to HASHI',
    welcomeHeading1: 'Your personal game launcher',
    welcomeDesc1: 'Organize and launch all your PC games, Steam titles, and apps from one place.',
    welcomeHeading2: 'Customize everything!',
    welcomeDesc2: 'From game covers to wallpapers, every detail is in your hands.',
    welcomeHeading3: 'All set to start',
    welcomeDesc3: 'Enjoy your customized library with controller support, sound effects, and an immersive interface.',
    dontShowAgain: "Don't show again",
    next: 'Next',
    start: 'Get started'
  }
}
