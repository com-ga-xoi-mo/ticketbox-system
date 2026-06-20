export interface SvgSafetyValidationResult {
  safe: boolean;
  reasons: string[];
}

interface UnsafePattern {
  pattern: RegExp;
  reason: string;
}

const UNSAFE_PATTERNS: UnsafePattern[] = [
  { pattern: /<\s*script\b/i, reason: 'script tags are not allowed' },
  { pattern: /\son[a-z0-9_-]+\s*=/i, reason: 'event handler attributes are not allowed' },
  { pattern: /javascript\s*:/i, reason: 'javascript URLs are not allowed' },
  { pattern: /<\s*iframe\b/i, reason: 'iframe tags are not allowed' },
  { pattern: /<\s*object\b/i, reason: 'object tags are not allowed' },
  { pattern: /<\s*embed\b/i, reason: 'embed tags are not allowed' },
  { pattern: /<\s*foreignObject\b/i, reason: 'foreignObject tags are not allowed' },
  {
    pattern: /\b(?:href|xlink:href)\s*=\s*["']\s*(?:https?:)?\/\//i,
    reason: 'external href references are not allowed',
  },
  {
    pattern: /\b(?:href|xlink:href)\s*=\s*["']\s*https?:/i,
    reason: 'external href references are not allowed',
  },
  {
    pattern: /url\(\s*["']?\s*(?:https?:)?\/\//i,
    reason: 'external URL references are not allowed',
  },
  { pattern: /data\s*:\s*text\/html/i, reason: 'data:text/html URIs are not allowed' },
];

export class SvgSafetyValidator {
  validate(buffer: Buffer): SvgSafetyValidationResult {
    const svg = buffer.toString('utf8');
    const reasons = Array.from(
      new Set(
        UNSAFE_PATTERNS.filter(({ pattern }) => pattern.test(svg)).map(({ reason }) => reason),
      ),
    );

    return {
      safe: reasons.length === 0,
      reasons,
    };
  }
}
