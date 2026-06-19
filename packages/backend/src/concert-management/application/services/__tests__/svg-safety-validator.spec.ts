import { describe, expect, it } from 'vitest';

import { SvgSafetyValidator } from '../svg-safety-validator';

describe('SvgSafetyValidator', () => {
  const validator = new SvgSafetyValidator();

  it('passes a valid SVG', () => {
    const result = validator.validate(Buffer.from('<svg><path d="M0 0"/></svg>'));

    expect(result).toEqual({ safe: true, reasons: [] });
  });

  it.each([
    ['script tag', '<svg><script>alert(1)</script></svg>', 'script tags are not allowed'],
    ['onclick handler', '<svg><path onclick="alert(1)"/></svg>', 'event handler attributes are not allowed'],
    ['javascript URL', '<svg><a href="javascript:alert(1)"/></svg>', 'javascript URLs are not allowed'],
    ['iframe', '<svg><iframe src="/x"></iframe></svg>', 'iframe tags are not allowed'],
    ['object', '<svg><object data="/x"></object></svg>', 'object tags are not allowed'],
    ['embed', '<svg><embed src="/x"/></svg>', 'embed tags are not allowed'],
    ['foreignObject', '<svg><foreignObject></foreignObject></svg>', 'foreignObject tags are not allowed'],
    [
      'external href',
      '<svg><use href="https://example.com/icon.svg#x"/></svg>',
      'external href references are not allowed',
    ],
    ['data html', '<svg><a href="data:text/html,<script>x</script>"/></svg>', 'data:text/html URIs are not allowed'],
  ])('rejects SVG with %s', (_name, svg, reason) => {
    const result = validator.validate(Buffer.from(svg));

    expect(result.safe).toBe(false);
    expect(result.reasons).toContain(reason);
  });

  it('returns all unique violation reasons', () => {
    const result = validator.validate(
      Buffer.from('<svg onload="x"><script></script><a href="javascript:x"></a></svg>'),
    );

    expect(result.safe).toBe(false);
    expect(result.reasons).toEqual([
      'script tags are not allowed',
      'event handler attributes are not allowed',
      'javascript URLs are not allowed',
    ]);
  });
});
