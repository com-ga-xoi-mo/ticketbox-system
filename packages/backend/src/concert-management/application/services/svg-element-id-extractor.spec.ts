import { describe, it, expect, beforeEach } from 'vitest';
import { SvgElementIdExtractor } from './svg-element-id-extractor';

describe('SvgElementIdExtractor', () => {
  let extractor: SvgElementIdExtractor;

  beforeEach(() => {
    extractor = new SvgElementIdExtractor();
  });

  it('should extract ids from various elements', () => {
    const svg = `
      <svg id="root">
        <g id="group1">
          <path id="path1" d="M0,0" />
          <rect id="rect1" x="0" y="0" width="10" height="10" />
        </g>
        <circle id="circle1" cx="5" cy="5" r="5" />
      </svg>
    `;
    const ids = extractor.extract(svg);
    expect(ids).toContain('root');
    expect(ids).toContain('group1');
    expect(ids).toContain('path1');
    expect(ids).toContain('rect1');
    expect(ids).toContain('circle1');
    expect(ids.length).toBe(5);
  });

  it('should handle empty SVG', () => {
    const svg = '<svg></svg>';
    const ids = extractor.extract(svg);
    expect(ids.length).toBe(0);
  });

  it('should handle SVG with no IDs', () => {
    const svg = `
      <svg>
        <g>
          <path d="M0,0" />
          <rect x="0" y="0" width="10" height="10" />
        </g>
        <circle cx="5" cy="5" r="5" />
      </svg>
    `;
    const ids = extractor.extract(svg);
    expect(ids.length).toBe(0);
  });

  it('should handle duplicate IDs by deduplicating them', () => {
    const svg = `
      <svg id="root">
        <g id="duplicate">
          <path id="duplicate" d="M0,0" />
        </g>
      </svg>
    `;
    const ids = extractor.extract(svg);
    expect(ids).toEqual(['root', 'duplicate']);
    expect(ids.length).toBe(2);
  });
});
