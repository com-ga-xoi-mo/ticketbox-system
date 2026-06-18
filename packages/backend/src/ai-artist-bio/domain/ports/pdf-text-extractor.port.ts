export const PDF_TEXT_EXTRACTOR = Symbol('PdfTextExtractorPort');

export interface PdfTextExtractorPort {
  extractText(pdf: Buffer): Promise<string>;
}

