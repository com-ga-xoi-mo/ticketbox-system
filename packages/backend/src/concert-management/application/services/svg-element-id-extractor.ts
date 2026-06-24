import { DOMParser } from 'linkedom';

export class SvgElementIdExtractor {
  extract(svgContent: string): string[] {
    const parser = new DOMParser();
    const document = parser.parseFromString(svgContent, 'image/svg+xml');
    
    const ids = new Set<string>();
    
    const traverse = (node: any) => {
      if (node.hasAttribute('id')) {
        const id = node.getAttribute('id');
        if (id) {
          ids.add(id);
        }
      }
      
      const children = Array.from(node.children);
      for (const child of children) {
        traverse(child);
      }
    };
    
    if (document.documentElement) {
      traverse(document.documentElement);
    }
    
    return Array.from(ids);
  }
}
