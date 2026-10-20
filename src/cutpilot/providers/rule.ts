import type { DecisionState, ProviderOutput } from '../types.js';

export interface DirectiveFlags {
  keepJokes: boolean;
  slower: boolean;
  tighter: boolean;
  broll: boolean;
  zoom: boolean;
}

const FILLER = /^(?:um+|uh+|er+|erm+|hmm+|mm+|like|嗯+|呃+|啊+|唔+|额+)$/i;

export function directiveFlags(directive: string): DirectiveFlags {
  const text = directive.toLowerCase();
  const mentionsJoke = /joke|funny|hilarious|đùa|笑话|哈哈/.test(text);
  const mentionsKeep = /keep|giữ|留|保留/.test(text);
  return {
    keepJokes: /keep the jokes|keep jokes|câu đùa|giữ.*(đùa|joke)/.test(text) || (mentionsJoke && mentionsKeep),
    slower: /slower|slow pace|nhịp chậm|chậm hơn|放慢|慢一点|节奏慢/.test(text),
    tighter: /tighter|faster|cut filler|nhanh hơn|更快|收紧|紧一点/.test(text),
    broll: /b-?roll/.test(text),
    zoom: /\bzoom\b/.test(text),
  };
}

export function tokensOf(text: string): string[] {
  return text.split(/[\s,.!?，。！？、;:]+/).map((token) => token.trim()).filter(Boolean);
}

export function isFillerToken(token: string): boolean {
  return FILLER.test(token.trim());
}

export function isJoke(text: string): boolean {
  return /joke|funny|hilarious|laugh|ladder|keyframes|haha|哈哈|笑死|kidding/i.test(text);
}

export function isSilenceText(text: string): boolean {
  return text.trim() === '' || text.trim().toLowerCase() === '(silence)';
}

/**
 * Deterministic baseline. It understands a handful of directives and otherwise
 * cuts silence and fillers. Jokes are cut until a directive asks to keep them,
 * so a mid-run note can change the next decision. Instructions inside the
 * transcript are not directives.
 */
export function ruleDecide(state: DecisionState): Omit<ProviderOutput, 'modelMs' | 'networkMs' | 'upstreamUnsplit'> {
  const flags = directiveFlags(state.directive);
  const text = state.text.trim();
  const tokens = tokensOf(text);
  const fillerOnly = tokens.length > 0 && tokens.every(isFillerToken);
  const silence = isSilenceText(text) || (state.silenceMs >= 400 && state.silenceMs >= state.durationMs * 0.8);
  const joke = isJoke(text);
  const mixed = tokens.some(isFillerToken) && tokens.some((token) => !isFillerToken(token));

  let action: ProviderOutput['action'] = 'keep';
  let confidence = 0.86;
  let reason = 'spoken content';
  let brollLabel: string | undefined;

  if (silence) {
    if (flags.slower) {
      action = 'keep';
      confidence = 0.9;
      reason = 'directive keeps the pauses';
    } else {
      action = 'cut';
      confidence = 0.97;
      reason = 'silence longer than 400ms';
    }
  } else if (fillerOnly) {
    if (flags.slower) {
      action = 'keep';
      confidence = 0.88;
      reason = 'directive keeps fillers';
    } else {
      action = 'cut';
      confidence = 0.95;
      reason = 'filler word';
    }
  } else if (mixed) {
    action = flags.tighter ? 'cut' : 'keep';
    confidence = 0.48;
    reason = 'filler mixed with content';
  } else if (joke) {
    if (flags.keepJokes) {
      action = 'keep';
      confidence = 0.93;
      reason = 'directive keeps the jokes';
    } else {
      action = 'cut';
      confidence = 0.84;
      reason = 'joke aside';
    }
  } else if (flags.tighter && state.durationMs > 4500) {
    action = 'trim';
    confidence = 0.74;
    reason = 'directive tightens a long line';
  } else if (!flags.slower && state.durationMs > 7000) {
    action = 'trim';
    confidence = 0.72;
    reason = 'line runs long';
  } else if (flags.slower && state.durationMs > 7000) {
    action = 'keep';
    confidence = 0.8;
    reason = 'directive keeps the slower pace';
  }

  if (flags.broll && action !== 'cut' && /desk|shot|city|screen|b-roll/i.test(text)) {
    action = 'broll';
    confidence = Math.max(confidence, 0.78);
    reason = 'directive asks for b-roll';
    brollLabel = 'Desk shot';
  }

  const zoomTarget = /desk|shot|face|camera/i.test(state.directive);
  return {
    action,
    confidence,
    reason,
    zoom: flags.zoom && action !== 'cut' && (!zoomTarget || /desk|shot|face|camera/i.test(text)),
    ...(brollLabel ? { brollLabel } : {}),
  };
}
