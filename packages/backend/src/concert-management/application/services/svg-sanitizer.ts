import { DOMParser } from 'linkedom';

import type { SvgSanitizationResult } from '../../domain/seating-map.types';

const ALLOWED_ELEMENTS = new Set([
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath',
  'use', 'pattern', 'marker', 'symbol', 'title', 'desc', 'mask', 'image', 'textPath'
]);

const ALLOWED_ATTRIBUTES = new Set([
  'id', 'class', 'style', 'viewbox', 'width', 'height', 'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry',
  'x1', 'y1', 'x2', 'y2', 'points', 'd', 'transform', 'fill', 'stroke', 'stroke-width',
  'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'opacity',
  'fill-opacity', 'stroke-opacity', 'font-family', 'font-size', 'font-weight', 'font-style',
  'text-anchor', 'dominant-baseline', 'cursor', 'mask', 'clip-path', 'offset', 'stop-color',
  'stop-opacity', 'href', 'xlink:href', 'version', 'xmlns', 'xmlns:xlink', 'preserveaspectratio'
]);

export class SvgSanitizer {
  sanitize(buffer: Buffer): SvgSanitizationResult {
    const svgStr = buffer.toString('utf8');
    const parser = new DOMParser();
    const document = parser.parseFromString(svgStr, 'image/svg+xml');

    const removedElements = new Set<string>();

    const traverse = (node: any) => {
      // Check element allowlist
      const tagName = node.tagName.toLowerCase();
      if (!ALLOWED_ELEMENTS.has(tagName)) {
        removedElements.add(tagName);
        node.remove();
        return;
      }

      // Check attributes
      const attributes = Array.from(node.attributes);
      for (const attr of attributes as any[]) {
        const attrName = attr.name.toLowerCase();

        if (!ALLOWED_ATTRIBUTES.has(attrName)) {
          node.removeAttribute(attr.name);
          continue;
        }

        // Special handling for href and xlink:href — local fragment refs only
        if (attrName === 'href' || attrName === 'xlink:href') {
          const value = attr.value.trim();
          if (!value.startsWith('#')) {
            node.removeAttribute(attr.name);
            continue;
          }
        }

        // Special handling for attributes containing url() — allow url(#...) only
        if (attr.value.includes('url(')) {
          // Match url(...) where the argument does NOT start with #
          // e.g. url(http://...), url(data:...), url('http://...') are all stripped
          const nonLocalUrl = /url\(\s*['"]?(?!#)[^)]*\)/gi;
          if (nonLocalUrl.test(attr.value)) {
            const sanitized = attr.value.replace(nonLocalUrl, 'none');
            node.setAttribute(attr.name, sanitized);
          }
        }
      }

      // Traverse children
      const children = Array.from(node.children);
      for (const child of children) {
        traverse(child);
      }
    };

    if (document.documentElement) {
      traverse(document.documentElement);
    }

    const sanitizedSvg = document.documentElement ? document.documentElement.toString() : '';
    return {
      sanitizedBuffer: Buffer.from(sanitizedSvg, 'utf8'),
      removedElements: Array.from(removedElements),
    };
  }
}
