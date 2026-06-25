export function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, '');
}

export function prependBom(text: string): string {
  if (text.startsWith('\uFEFF')) {
    return text;
  }
  return '\uFEFF' + text;
}
