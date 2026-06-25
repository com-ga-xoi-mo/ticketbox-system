import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

import type { BulkCreatedStaffCredential } from './api';

export interface CredentialPdfInput {
  concertTitle: string;
  createdAt: Date;
  pdfPassword: string;
  credentials: BulkCreatedStaffCredential[];
}

export function buildCredentialPdfFileName(concertTitle: string, createdAt: Date): string {
  const date = createdAt.toISOString().slice(0, 10);
  const safeTitle = concertTitle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `checkin-staff-credentials-${safeTitle || 'concert'}-${date}.pdf`;
}

export function createCredentialPdfArrayBuffer(input: CredentialPdfInput): ArrayBuffer {
  if (input.pdfPassword.trim().length === 0) {
    throw new Error('PDF password is required.');
  }
  if (input.credentials.length === 0) {
    throw new Error('No credentials are available for PDF export.');
  }

  const doc = new jsPDF({
    orientation: 'l',
    unit: 'pt',
    format: 'a4',
    encryption: {
      userPassword: input.pdfPassword,
      ownerPassword: input.pdfPassword,
      userPermissions: ['print'],
    },
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('TicketBox Check-in Staff Credentials', 40, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Concert: ${input.concertTitle}`, 40, 68);
  doc.text(`Created at: ${input.createdAt.toLocaleString()}`, 40, 86);
  doc.setTextColor(160, 40, 40);
  doc.text('Security note: Send this PDF and its open password through separate channels.', 40, 106);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: 126,
    head: [['No.', 'Display name', 'Email', 'Account password']],
    body: input.credentials.map((credential, index) => [
      String(index + 1),
      credential.displayName,
      credential.email,
      credential.password,
    ]),
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 6,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [26, 36, 56],
      textColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 36 },
      1: { cellWidth: 170 },
      2: { cellWidth: 230 },
      3: { cellWidth: 180 },
    },
  });

  const output = doc.output('arraybuffer');
  if (!pdfContainsEncryptionMarker(output)) {
    throw new Error('PDF encryption is unavailable. Refusing to download an unprotected file.');
  }

  return output;
}

export function downloadCredentialPdf(input: CredentialPdfInput): void {
  const output = createCredentialPdfArrayBuffer(input);
  const blob = new Blob([output], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildCredentialPdfFileName(input.concertTitle, input.createdAt);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function pdfContainsEncryptionMarker(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let text = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    text += String.fromCharCode(...chunk);
  }
  return text.includes('/Encrypt');
}
