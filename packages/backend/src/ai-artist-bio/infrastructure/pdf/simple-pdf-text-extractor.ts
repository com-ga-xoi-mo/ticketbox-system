import { Injectable } from '@nestjs/common';

import type { PdfTextExtractorPort } from '../../domain/ports/pdf-text-extractor.port';

@Injectable()
export class SimplePdfTextExtractor implements PdfTextExtractorPort {
  async extractText(pdf: Buffer): Promise<string> {
    const content = pdf.toString('latin1');
    const literalStrings = Array.from(content.matchAll(/\(([^()]{3,})\)/g))
      .map((match) => match[1])
      .join(' ');

    const printable = content
      .replace(/[^\x20-\x7E\n\r\t]+/g, ' ')
      .replace(/[<>{}[\]()/\\%]/g, ' ');

    return `${literalStrings} ${printable}`;
  }
}

