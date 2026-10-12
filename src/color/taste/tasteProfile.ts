// Taste profile: learns which looks/LUTs the user picks so suggestions get
// personal over time. Pure data model; persistence belongs to the local server.

export interface TastePick {
  assetId: string;
  name: string;
  mood?: string;
  at: number;
}

export interface TasteProfileData {
  version: 1;
  picks: TastePick[];
}

/** Mood keyword → look/LUT asset-id hints. Vietnamese + English. */
const MOOD_HINTS: Array<{ keywords: string[]; assetIds: string[] }> = [
  {
    keywords: ['teal', 'orange', 'điện ảnh', 'cinematic', 'hollywood', 'phim hành động', 'bom tấn'],
    assetIds: ['builtin:look-teal-orange', 'builtin:look-cinestill'],
  },
  {
    keywords: ['phim hàn', 'korean', 'ấm', 'warm', 'ngọt', 'lãng mạn', 'romantic', 'wedding', 'cưới'],
    assetIds: ['builtin:look-warm', 'builtin:look-kodak-gold', 'builtin:look-fuji-portra'],
  },
  {
    keywords: ['vintage', 'cổ điển', 'film', 'phim nhựa', 'retro', 'kodak', 'fuji'],
    assetIds: [
      'builtin:look-kodak-gold',
      'builtin:look-fuji-velvia',
      'builtin:look-fuji-chrome',
      'builtin:look-disposable',
    ],
  },
  {
    keywords: ['ngầu', 'cool', 'lạnh', 'cold', 'cyber', 'neon', 'đêm', 'night', 'moody'],
    assetIds: ['builtin:look-cool', 'builtin:look-cyber', 'builtin:look-mono'],
  },
  {
    keywords: ['đen trắng', 'black and white', 'bw', 'mono', 'trắng đen', 'documentary', 'tài liệu'],
    assetIds: ['builtin:look-mono', 'builtin:look-bleach'],
  },
  {
    keywords: ['hoàng hôn', 'sunset', 'chiều tà', 'golden hour', 'nắng'],
    assetIds: ['builtin:look-sunset', 'builtin:look-warm'],
  },
  {
    keywords: ['tươi', 'vibrant', 'rực rỡ', 'sống động', 'du lịch', 'travel', 'vlog'],
    assetIds: ['builtin:look-fuji-velvia', 'builtin:look-sunset'],
  },
  {
    keywords: ['nhạt', 'faded', 'bleach', 'buồn', 'indie', 'art'],
    assetIds: ['builtin:look-bleach', 'builtin:look-ricoh-gr'],
  },
  {
    keywords: ['đường phố', 'street', 'gr', 'ricoh', 'snap'],
    assetIds: ['builtin:look-ricoh-gr', 'builtin:look-mono'],
  },
];

export function moodToAssetIds(mood: string): string[] {
  const q = mood.toLowerCase();
  const hits: string[] = [];
  for (const hint of MOOD_HINTS) {
    if (hint.keywords.some((k) => q.includes(k))) {
      for (const id of hint.assetIds) if (!hits.includes(id)) hits.push(id);
    }
  }
  return hits;
}

const MAX_PICKS = 200;

export class TasteProfile {
  private data: TasteProfileData = { version: 1, picks: [] };

  constructor(initial?: TasteProfileData) {
    if (initial?.version === 1 && Array.isArray(initial.picks)) {
      this.data.picks = initial.picks.filter((pick) =>
        pick && typeof pick.assetId === 'string' && typeof pick.name === 'string'
        && Number.isFinite(pick.at)
        && (pick.mood === undefined || typeof pick.mood === 'string'),
      ).slice(-MAX_PICKS).map((pick) => ({ ...pick }));
    }
  }

  record(assetId: string, name: string, mood?: string): void {
    this.data.picks.push({ assetId, name, mood, at: Date.now() });
    if (this.data.picks.length > MAX_PICKS) {
      this.data.picks = this.data.picks.slice(-MAX_PICKS);
    }
  }

  /** Frequency of each assetId (recent picks weigh more). */
  private scores(): Map<string, number> {
    const now = Date.now();
    const map = new Map<string, number>();
    for (const p of this.data.picks) {
      const ageDays = (now - p.at) / 86400000;
      const w = Math.exp(-ageDays / 30); // 30-day half-life-ish decay
      map.set(p.assetId, (map.get(p.assetId) ?? 0) + w);
    }
    return map;
  }

  /**
   * Rank candidate assetIds for a mood: mood keyword hits first, then
   * personal frequency boosts, stable order otherwise.
   */
  rank(candidates: string[], mood?: string): string[] {
    const moodHits = mood ? moodToAssetIds(mood) : [];
    const freq = this.scores();
    return [...candidates].sort((x, y) => {
      const mx = moodHits.includes(x) ? 0 : 1;
      const my = moodHits.includes(y) ? 0 : 1;
      if (mx !== my) return mx - my;
      const fx = freq.get(x) ?? 0;
      const fy = freq.get(y) ?? 0;
      if (fx !== fy) return fy - fx;
      return x.localeCompare(y);
    });
  }

  top(n = 5): Array<{ assetId: string; name: string; count: number }> {
    const freq = this.scores();
    const names = new Map<string, string>();
    for (const p of this.data.picks) names.set(p.assetId, p.name);
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([assetId, count]) => ({ assetId, name: names.get(assetId) ?? assetId, count }));
  }

  toJSON(): TasteProfileData {
    return { version: 1, picks: this.data.picks.map((pick) => ({ ...pick })) };
  }
}
