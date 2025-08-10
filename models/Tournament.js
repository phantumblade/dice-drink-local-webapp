class Tournament {
  constructor(tournamentData = {}) {
    // Dati base
    this.id = tournamentData.id;
    this.title = tournamentData.title;
    this.description = tournamentData.description;
    this.gameId = tournamentData.game_id;
    this.gameName = tournamentData.game_name; // Join con games table

    // Scheduling
    this.startDate = tournamentData.start_date;
    this.endDate = tournamentData.end_date;
    this.startTime = tournamentData.start_time;
    this.endTime = tournamentData.end_time;
    this.isRecurring = tournamentData.is_recurring || false;
    this.recurringPattern = tournamentData.recurring_pattern; // 'weekly', 'monthly', etc.

    // Partecipanti
    this.minParticipants = tournamentData.min_participants || 2;
    this.maxParticipants = tournamentData.max_participants;
    this.currentParticipants = tournamentData.current_participants || 0;
    this.waitlistCount = tournamentData.waitlist_count || 0;

    // Finanziario
    this.entryFee = tournamentData.entry_fee || 0;
    this.prizePool = tournamentData.prize_pool || 0;
    this.prizes = tournamentData.prizes ? safeParseJSON(tournamentData.prizes, []) : [];

    // Dettagli torneo
    this.format = tournamentData.format; // 'elimination', 'swiss', 'round-robin'
    this.location = tournamentData.location || 'Sala Principale';
    this.difficulty = tournamentData.difficulty || 'medium'; // 'easy', 'medium', 'hard'
    this.category = tournamentData.category; // 'strategy', 'party', 'dnd', etc.
    this.theme = tournamentData.theme; // per styling CSS

    // Stato
    this.status = tournamentData.status || 'upcoming'; // 'upcoming', 'ongoing', 'completed', 'cancelled'
    this.registrationOpen = tournamentData.registration_open !== false;
    this.registrationDeadline = tournamentData.registration_deadline;

    // Metadata
    this.createdBy = tournamentData.created_by;
    this.createdAt = tournamentData.created_at;
    this.updatedAt = tournamentData.updated_at;
    this.imageUrl = tournamentData.image_url;

    // Regole specifiche
    this.rules = tournamentData.rules ? safeParseJSON(tournamentData.rules, []) : [];
    this.included = tournamentData.included ? safeParseJSON(tournamentData.included, []) : [];

    // Per D&D campaigns
    this.currentSession = tournamentData.current_session || 1;
    this.totalSessions = tournamentData.total_sessions;
    this.currentLevel = tournamentData.current_level;
    this.partyComposition = tournamentData.party_composition ? safeParseJSON(tournamentData.party_composition, []) : [];
    // D&D extra (joined from dnd_campaigns)
    this.dndSetting = tournamentData.dnd_setting || null;
    this.dndWorld = tournamentData.dnd_world || null;
    this.dndTags = tournamentData.dnd_tags ? (typeof tournamentData.dnd_tags === 'string' ? safeParseJSON(tournamentData.dnd_tags, []) : tournamentData.dnd_tags) : [];
    this.dndAllowedClasses = tournamentData.dnd_allowed_classes ? (typeof tournamentData.dnd_allowed_classes === 'string' ? safeParseJSON(tournamentData.dnd_allowed_classes, []) : tournamentData.dnd_allowed_classes) : [];
    this.dndDays = tournamentData.dnd_days || null;
    this.dndSessionDuration = tournamentData.dnd_session_duration || null;
    this.dndSafetyTools = tournamentData.dnd_safety_tools ? (typeof tournamentData.dnd_safety_tools === 'string' ? safeParseJSON(tournamentData.dnd_safety_tools, []) : tournamentData.dnd_safety_tools) : [];
  }

  // ==========================================
  // VALIDAZIONI
  // ==========================================

  static validateTournamentData(data) {
    const errors = [];

    if (!data.title || data.title.trim().length < 3) {
      errors.push('Il titolo deve essere di almeno 3 caratteri');
    }

    if (!data.game_id) {
      errors.push('Deve essere associato un gioco');
    }

    if (!data.start_date) {
      errors.push('Data di inizio obbligatoria');
    }

    if (data.start_date && data.end_date && new Date(data.start_date) > new Date(data.end_date)) {
      errors.push('Data di fine deve essere successiva alla data di inizio');
    }

    if (data.min_participants && data.max_participants && data.min_participants > data.max_participants) {
      errors.push('Numero minimo partecipanti non può essere maggiore del massimo');
    }

    if (data.entry_fee && data.entry_fee < 0) {
      errors.push('Quota di iscrizione non può essere negativa');
    }

    const validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled'];
    if (data.status && !validStatuses.includes(data.status)) {
      errors.push(`Stato non valido. Valori ammessi: ${validStatuses.join(', ')}`);
    }

    const validFormats = ['elimination', 'swiss', 'round-robin', 'campaign'];
    if (data.format && !validFormats.includes(data.format)) {
      errors.push(`Formato non valido. Valori ammessi: ${validFormats.join(', ')}`);
    }

    if (errors.length > 0) {
      throw new Error(`Errori validazione: ${errors.join(', ')}`);
    }

    return true;
  }

  // ==========================================
  // STATI E BUSINESS LOGIC
  // ==========================================

  canRegister() {
    if (this.status !== 'upcoming') {
      return { canRegister: false, reason: 'Torneo non più disponibile per registrazioni' };
    }

    if (!this.registrationOpen) {
      return { canRegister: false, reason: 'Registrazioni chiuse' };
    }

    if (this.registrationDeadline && new Date() > new Date(this.registrationDeadline)) {
      return { canRegister: false, reason: 'Scaduto il termine per le registrazioni' };
    }

    if (this.currentParticipants >= this.maxParticipants) {
      return { canRegister: false, reason: 'Torneo al completo', canWaitlist: true };
    }

    return { canRegister: true };
  }

  isUpcoming() {
    return this.status === 'upcoming' && new Date(this.startDate) > new Date();
  }

  isOngoing() {
    return this.status === 'ongoing' ||
           (new Date(this.startDate) <= new Date() && new Date() <= new Date(this.endDate));
  }

  isCompleted() {
    return this.status === 'completed' ||
           (this.endDate && new Date() > new Date(this.endDate));
  }

  getRegistrationStatus() {
    const registrationCheck = this.canRegister();

    if (registrationCheck.canRegister) {
      return 'open';
    }

    if (registrationCheck.canWaitlist) {
      return 'waitlist';
    }

    return 'closed';
  }

  getParticipantsInfo() {
    return {
      current: this.currentParticipants,
      max: this.maxParticipants,
      min: this.minParticipants,
      waitlist: this.waitlistCount,
      available: Math.max(0, this.maxParticipants - this.currentParticipants),
      percentage: this.maxParticipants > 0 ? (this.currentParticipants / this.maxParticipants) * 100 : 0
    };
  }

  getTimeInfo() {
    const now = new Date();
    const startDate = new Date(this.startDate);
    const endDate = this.endDate ? new Date(this.endDate) : null;

    return {
      startsIn: startDate > now ? startDate - now : null,
      isToday: startDate.toDateString() === now.toDateString(),
      isPast: startDate < now,
      duration: endDate ? endDate - startDate : null,
      formattedStart: startDate.toLocaleString('it-IT'),
      formattedEnd: endDate ? endDate.toLocaleString('it-IT') : null
    };
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  getThemeClass() {
    const themeMap = {
      'strategy': 'strategy-theme',
      'party': 'party-theme',
      'dnd': 'dnd-theme',
      'card': 'card-theme',
      'racing': 'racing-theme',
      'puzzle': 'puzzle-theme'
    };

    return themeMap[this.category] || themeMap[this.theme] || 'default-theme';
  }

  getDisplayDate() {
    const date = new Date(this.startDate);
    const currentYear = new Date().getFullYear();
    const tournamentYear = date.getFullYear();
    
    const displayData = {
      day: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleString('it-IT', { month: 'short' }).toUpperCase(),
      year: tournamentYear,
      showYear: tournamentYear !== currentYear
    };
    
    return displayData;
  }

  getDisplayTime() {
    if (this.startTime && this.endTime) {
      return `${this.startTime} - ${this.endTime}`;
    }

    const start = new Date(this.startDate);
    const end = this.endDate ? new Date(this.endDate) : null;

    return `${start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}${
      end ? ` - ${end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : ''
    }`;
  }

  getPrizeInfo() {
    if (this.prizes && this.prizes.length > 0) {
      return this.prizes;
    }

    if (this.prizePool > 0) {
      return [`Premio totale: €${this.prizePool}`];
    }

    return ['Premi da definire'];
  }

  // ==========================================
  // SERIALIZZAZIONE
  // ==========================================

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      gameId: this.gameId,
      gameName: this.gameName,
      start_date: this.startDate,
      end_date: this.endDate,
      start_time: this.startTime,
      end_time: this.endTime,
      isRecurring: this.isRecurring,
      recurringPattern: this.recurringPattern,
      minParticipants: this.minParticipants,
      maxParticipants: this.maxParticipants,
      currentParticipants: this.currentParticipants,
      waitlistCount: this.waitlistCount,
      entryFee: this.entryFee,
      prizePool: this.prizePool,
      prizes: this.prizes,
      format: this.format,
      location: this.location,
      difficulty: this.difficulty,
      category: this.category,
      theme: this.theme,
      status: this.status,
      registrationOpen: this.registrationOpen,
      registrationDeadline: this.registrationDeadline,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      imageUrl: this.imageUrl,
      rules: this.rules,
      included: this.included,
      currentSession: this.currentSession,
      totalSessions: this.totalSessions,
      currentLevel: this.currentLevel,
      partyComposition: this.partyComposition
      , dndSetting: this.dndSetting
      , dndWorld: this.dndWorld
      , dndTags: this.dndTags
      , dndAllowedClasses: this.dndAllowedClasses
      , dndDays: this.dndDays
      , dndSessionDuration: this.dndSessionDuration
      , dndSafetyTools: this.dndSafetyTools
    };
  }

  toDatabaseObject() {
    return {
      title: this.title,
      description: this.description,
      game_id: this.gameId,
      start_date: this.startDate,
      end_date: this.endDate,
      start_time: this.startTime,
      end_time: this.endTime,
      is_recurring: this.isRecurring ? 1 : 0,
      recurring_pattern: this.recurringPattern,
      min_participants: this.minParticipants,
      max_participants: this.maxParticipants,
      current_participants: this.currentParticipants,
      waitlist_count: this.waitlistCount,
      entry_fee: this.entryFee,
      prize_pool: this.prizePool,
      prizes: JSON.stringify(this.prizes || []),
      format: this.format,
      location: this.location,
      difficulty: this.difficulty,
      category: this.category,
      theme: this.theme,
      status: this.status,
      registration_open: this.registrationOpen ? 1 : 0,
      registration_deadline: this.registrationDeadline,
      created_by: this.createdBy,
      image_url: this.imageUrl,
      rules: JSON.stringify(this.rules || []),
      included: JSON.stringify(this.included || []),
      current_session: this.currentSession,
      total_sessions: this.totalSessions,
      current_level: this.currentLevel,
      party_composition: JSON.stringify(this.partyComposition || []),
      updated_at: new Date().toISOString()
    };
  }

  static fromDatabaseRow(row) {
    return new Tournament(row);
  }
}

function safeParseJSON(input, fallback) {
  try { return JSON.parse(input); } catch { return fallback; }
}

module.exports = Tournament;
