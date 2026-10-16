export function readableParagraphs(text: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ])/u);
  const paragraphs: string[] = [];
  for (const sentence of sentences) {
    const previous = paragraphs.length - 1;
    if (previous >= 0 && (paragraphs[previous].length < 180 || paragraphs[previous].length + sentence.length <= 330)) {
      paragraphs[previous] += " " + sentence;
    } else {
      paragraphs.push(sentence);
    }
  }
  return paragraphs;
}
