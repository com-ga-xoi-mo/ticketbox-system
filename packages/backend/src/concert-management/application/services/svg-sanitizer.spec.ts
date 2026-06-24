import { describe, it, expect, beforeEach } from 'vitest';
import { SvgSanitizer } from './svg-sanitizer';

describe('SvgSanitizer', () => {
  let sanitizer: SvgSanitizer;

  beforeEach(() => {
    sanitizer = new SvgSanitizer();
  });

  it('should remove script elements', () => {
    const input = Buffer.from('<svg><script>alert(1);</script><g id="test"></g></svg>');
    const result = sanitizer.sanitize(input);
    const output = result.sanitizedBuffer.toString('utf8');

    expect(output).not.toContain('<script>');
    expect(output).toContain('<g id="test" />');
    expect(result.removedElements).toContain('script');
  });

  it('should strip event handler attributes', () => {
    const input = Buffer.from('<svg><g onclick="alert(1)" id="test"></g></svg>');
    const result = sanitizer.sanitize(input);
    const output = result.sanitizedBuffer.toString('utf8');

    expect(output).not.toContain('onclick');
    expect(output).toContain('id="test"');
  });

  it('should remove foreign elements', () => {
    const input = Buffer.from('<svg><foreignObject><iframe src="example.com"></iframe></foreignObject></svg>');
    const result = sanitizer.sanitize(input);
    const output = result.sanitizedBuffer.toString('utf8');

    expect(output).not.toContain('<foreignObject>');
    expect(output).not.toContain('<iframe>');
    expect(result.removedElements).toContain('foreignobject');
  });

  it('should preserve id attributes', () => {
    const input = Buffer.from('<svg id="root"><g id="group1"><path id="path1" d="M0,0 L1,1"/></g></svg>');
    const result = sanitizer.sanitize(input);
    const output = result.sanitizedBuffer.toString('utf8');

    expect(output).toContain('id="root"');
    expect(output).toContain('id="group1"');
    expect(output).toContain('id="path1"');
    expect(result.removedElements.length).toBe(0);
  });

  it('should pass through safe SVG', () => {
    const input = Buffer.from('<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" id="c1" /></svg>');
    const result = sanitizer.sanitize(input);
    const output = result.sanitizedBuffer.toString('utf8');

    expect(output).toContain('<svg viewBox="0 0 100 100">');
    expect(output).toContain('<circle cx="50" cy="50" r="40" fill="red" id="c1"');
    expect(result.removedElements.length).toBe(0);
  });

  it('should sanitize style attributes by replacing external urls with none', () => {
    const input = Buffer.from('<svg><g style="fill: url(http://example.com/image.jpg)" id="g1"></g><g style="fill: url(#localGradient)" id="g2"></g></svg>');
    const result = sanitizer.sanitize(input);
    const output = result.sanitizedBuffer.toString('utf8');

    expect(output).toContain('none');
    expect(output).not.toContain('http://example.com/image.jpg');
    expect(output).toContain('url(#localGradient)');
  });

  it('should allow local href and xlink:href but strip external ones', () => {
    const input = Buffer.from('<svg><use href="#local" /><use href="http://example.com" /><use xlink:href="#local2" /><use xlink:href="data:text/html" /></svg>');
    const result = sanitizer.sanitize(input);
    const output = result.sanitizedBuffer.toString('utf8');

    expect(output).toContain('href="#local"');
    expect(output).toContain('xlink:href="#local2"');
    expect(output).not.toContain('http://example.com');
    expect(output).not.toContain('data:text/html');
  });
});
