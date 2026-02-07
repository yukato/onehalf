export interface Chunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
}

const MAX_TOKENS = 500;
const OVERLAP_TOKENS = 50;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkText(text: string): Chunk[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  const chunks: Chunk[] = [];
  let current = '';
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const combined = current ? `${current}\n\n${paragraph}` : paragraph;
    const tokens = estimateTokens(combined);

    if (tokens > MAX_TOKENS && current) {
      chunks.push({
        content: current.trim(),
        chunkIndex,
        tokenCount: estimateTokens(current),
      });
      chunkIndex++;

      // Overlap: keep the tail of the previous chunk
      const words = current.split(/\s+/);
      const overlapWords = words.slice(-Math.ceil(OVERLAP_TOKENS * 4));
      const overlap = overlapWords.join(' ');
      current = overlap ? `${overlap}\n\n${paragraph}` : paragraph;
    } else {
      current = combined;
    }
  }

  if (current.trim()) {
    chunks.push({
      content: current.trim(),
      chunkIndex,
      tokenCount: estimateTokens(current),
    });
  }

  // Handle case where input is a single long block without paragraph breaks
  if (chunks.length === 0 && text.trim()) {
    chunks.push({
      content: text.trim(),
      chunkIndex: 0,
      tokenCount: estimateTokens(text),
    });
  }

  return chunks;
}
