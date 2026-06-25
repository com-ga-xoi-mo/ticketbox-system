import { describe, it, expect } from 'vitest';
import { stripBom, prependBom } from './utf8.util';

describe('utf8.util', () => {
  describe('stripBom', () => {
    it('should strip BOM from text with BOM', () => {
      expect(stripBom('\uFEFFHello World')).toBe('Hello World');
    });

    it('should return unchanged for text without BOM', () => {
      expect(stripBom('Hello World')).toBe('Hello World');
    });
  });

  describe('prependBom', () => {
    it('should prepend BOM to text without BOM', () => {
      expect(prependBom('Hello World')).toBe('\uFEFFHello World');
    });

    it('should return unchanged for text already with BOM', () => {
      expect(prependBom('\uFEFFHello World')).toBe('\uFEFFHello World');
    });
  });
});
