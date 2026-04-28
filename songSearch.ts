import { getSearchQueries } from './moodMapping';
import type { AnalysisResult } from './imageAnalyzer';

export interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  previewUrl: string;
  duration: number;
  language: string;
}

interface iTunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
  trackTimeMillis: number;
  isStreamable?: boolean;
}

async function searchiTunes(term: string, limit: number = 5): Promise<iTunesResult[]> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=${limit}&country=IN`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await response.json();
    return data.results || [];
  } catch {
    console.warn('iTunes search failed for:', term);
    return [];
  }
}

function getHighResArtwork(url: string): string {
  if (!url) return '';
  return url.replace('100x100bb', '600x600bb').replace('100x100', '600x600');
}

export async function searchSongs(analysis: AnalysisResult): Promise<Song[]> {
  const queries = getSearchQueries(analysis);

  // Execute all searches in parallel
  const searchPromises = queries.map((query, index) =>
    searchiTunes(query.term, 4).then(results =>
      results.map(r => ({ ...r, _lang: query.language, _idx: index }))
    )
  );

  const allResults = await Promise.all(searchPromises);

  // Flatten, filter, and deduplicate
  const songs: Song[] = [];
  const seenIds = new Set<number>();
  const seenTitles = new Set<string>();

  for (const resultSet of allResults) {
    for (const track of resultSet) {
      if (
        track.previewUrl &&
        track.trackName &&
        !seenIds.has(track.trackId)
      ) {
        // Deduplicate by normalized title
        const normalTitle = track.trackName.toLowerCase().trim();
        if (seenTitles.has(normalTitle)) continue;

        seenIds.add(track.trackId);
        seenTitles.add(normalTitle);

        songs.push({
          id: track.trackId.toString(),
          title: track.trackName,
          artist: track.artistName,
          thumbnail: getHighResArtwork(track.artworkUrl100),
          previewUrl: track.previewUrl,
          duration: Math.round((track.trackTimeMillis || 30000) / 1000),
          language: (track as { _lang?: string })._lang || 'hindi',
        });
      }
    }
  }

  // Interleave Telugu and Hindi songs
  const telugu = songs.filter(s => s.language === 'telugu');
  const hindi = songs.filter(s => s.language === 'hindi');
  const interleaved: Song[] = [];
  const maxLen = Math.max(telugu.length, hindi.length);

  for (let i = 0; i < maxLen; i++) {
    if (i < telugu.length) interleaved.push(telugu[i]);
    if (i < hindi.length) interleaved.push(hindi[i]);
  }

  return interleaved.slice(0, 8);
}
