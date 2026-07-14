import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

import type { PdfTextExtractorPort } from '../../domain/ports/pdf-text-extractor.port';

@Injectable()
export class SimplePdfTextExtractor implements PdfTextExtractorPort {
  async extractText(pdf: Buffer): Promise<string> {
    const parser = new PDFParse({ data: pdf });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
}
