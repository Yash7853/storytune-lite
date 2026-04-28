import type { AnalysisResult } from './imageAnalyzer';

export interface SearchQuery {
  term: string;
  language: 'telugu' | 'hindi';
}

const moodSceneMap: Record<string, Record<string, { telugu: string[]; hindi: string[] }>> = {
  happy: {
    beach: {
      telugu: ['telugu happy beach', 'telugu summer songs'],
      hindi: ['hindi beach happy', 'hindi summer songs'],
    },
    gym: {
      telugu: ['telugu workout energetic', 'telugu gym mass'],
      hindi: ['hindi workout songs', 'hindi gym motivational'],
    },
    street: {
      telugu: ['telugu happy mass songs', 'telugu dance songs'],
      hindi: ['hindi street dance', 'hindi happy upbeat'],
    },
    home: {
      telugu: ['telugu feel good songs', 'telugu happy melody'],
      hindi: ['hindi feel good', 'hindi happy acoustic'],
    },
    travel: {
      telugu: ['telugu travel songs', 'telugu road trip happy'],
      hindi: ['hindi travel songs', 'hindi road trip'],
    },
    night: {
      telugu: ['telugu night party songs', 'telugu club mix'],
      hindi: ['hindi night party', 'hindi club songs'],
    },
  },
  sad: {
    beach: {
      telugu: ['telugu sad melody songs', 'telugu emotional beach'],
      hindi: ['hindi sad acoustic', 'hindi emotional songs'],
    },
    gym: {
      telugu: ['telugu motivational sad', 'telugu struggle songs'],
      hindi: ['hindi motivational sad', 'hindi struggle'],
    },
    street: {
      telugu: ['telugu sad songs', 'telugu heartbreak songs'],
      hindi: ['hindi sad songs', 'hindi heartbreak'],
    },
    home: {
      telugu: ['telugu sad melody', 'telugu emotional home'],
      hindi: ['hindi sad piano', 'hindi lonely songs'],
    },
    travel: {
      telugu: ['telugu melancholy travel', 'telugu journey sad'],
      hindi: ['hindi travel emotional', 'hindi journey sad'],
    },
    night: {
      telugu: ['telugu sad night songs', 'telugu late night sad'],
      hindi: ['hindi sad night', 'hindi late night emotional'],
    },
  },
  romantic: {
    beach: {
      telugu: ['telugu romantic beach', 'telugu love melody'],
      hindi: ['hindi romantic beach', 'hindi love songs sunset'],
    },
    gym: {
      telugu: ['telugu romantic dance', 'telugu love mass'],
      hindi: ['hindi romantic upbeat', 'hindi love dance'],
    },
    street: {
      telugu: ['telugu romantic songs', 'telugu love songs'],
      hindi: ['hindi romantic songs', 'hindi love songs'],
    },
    home: {
      telugu: ['telugu romantic melody', 'telugu intimate love'],
      hindi: ['hindi romantic acoustic', 'hindi intimate love'],
    },
    travel: {
      telugu: ['telugu romantic travel', 'telugu love journey'],
      hindi: ['hindi romantic travel', 'hindi love journey'],
    },
    night: {
      telugu: ['telugu romantic night', 'telugu love night melody'],
      hindi: ['hindi romantic night', 'hindi love night songs'],
    },
  },
  energetic: {
    beach: {
      telugu: ['telugu mass dance', 'telugu energetic party'],
      hindi: ['hindi beach dance', 'hindi energetic party'],
    },
    gym: {
      telugu: ['telugu mass beat', 'telugu gym workout mass'],
      hindi: ['hindi gym workout', 'hindi energetic gym'],
    },
    street: {
      telugu: ['telugu mass songs', 'telugu energetic mass'],
      hindi: ['hindi mass songs', 'hindi energetic street'],
    },
    home: {
      telugu: ['telugu energetic dance', 'telugu party songs'],
      hindi: ['hindi dance party', 'hindi energetic home'],
    },
    travel: {
      telugu: ['telugu energetic travel', 'telugu road trip mass'],
      hindi: ['hindi road trip energetic', 'hindi travel upbeat'],
    },
    night: {
      telugu: ['telugu night mass', 'telugu club mass beat'],
      hindi: ['hindi night dance', 'hindi club bollywood'],
    },
  },
};

const vibeModifiers: Record<string, string[]> = {
  aesthetic: ['aesthetic', 'lofi', 'indie'],
  mass: ['mass', 'beat', 'bass'],
  chill: ['chill', 'lofi', 'relaxing'],
  emotional: ['emotional', 'melody', 'touching'],
};

export function getSearchQueries(analysis: AnalysisResult): SearchQuery[] {
  const { mood, scene, vibe } = analysis;
  const queries: SearchQuery[] = [];

  // Get mood+scene specific queries
  const moodSceneQueries = moodSceneMap[mood]?.[scene];
  if (moodSceneQueries) {
    // Add Telugu queries
    moodSceneQueries.telugu.forEach(term => {
      queries.push({ term, language: 'telugu' });
    });
    // Add Hindi queries
    moodSceneQueries.hindi.forEach(term => {
      queries.push({ term, language: 'hindi' });
    });
  } else {
    // Fallback
    queries.push({ term: `${mood} telugu songs`, language: 'telugu' });
    queries.push({ term: `${mood} hindi songs`, language: 'hindi' });
  }

  // Add vibe-modified query
  const vibeWords = vibeModifiers[vibe] || [];
  if (vibeWords.length > 0) {
    const lang = queries.length % 2 === 0 ? 'telugu' : 'hindi';
    queries.push({ term: `${lang} ${vibeWords[0]} ${mood}`, language: lang });
  }

  // Ensure good mix of both languages
  const teluguCount = queries.filter(q => q.language === 'telugu').length;
  const hindiCount = queries.filter(q => q.language === 'hindi').length;

  if (teluguCount < 2) {
    queries.push({ term: `telugu ${mood} ${vibe}`, language: 'telugu' });
  }
  if (hindiCount < 2) {
    queries.push({ term: `hindi ${mood} ${vibe}`, language: 'hindi' });
  }

  return queries;
}

export function getMoodEmoji(mood: string): string {
  const map: Record<string, string> = {
    happy: '😊',
    sad: '😢',
    romantic: '💕',
    energetic: '⚡',
  };
  return map[mood] || '🎵';
}

export function getSceneEmoji(scene: string): string {
  const map: Record<string, string> = {
    beach: '🏖️',
    gym: '💪',
    street: '🌃',
    home: '🏠',
    travel: '✈️',
    night: '🌙',
  };
  return map[scene] || '📸';
}

export function getVibeEmoji(vibe: string): string {
  const map: Record<string, string> = {
    aesthetic: '✨',
    mass: '🔥',
    chill: '😎',
    emotional: '💭',
  };
  return map[vibe] || '🎶';
}
