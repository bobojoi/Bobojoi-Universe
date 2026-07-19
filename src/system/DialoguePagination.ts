/** Parsed copy keeps an optional character name separate from the dialogue body. */
export interface ParsedDialogueMessage {
  speaker?: string;
  body: string;
}

const SPEAKER_SEPARATOR = '：';
const MAX_SPEAKER_LENGTH = 12;

/** Extracts the established `角色：內容` format without misreading body punctuation. */
export function parseDialogueMessage(text: string): ParsedDialogueMessage {
  const separatorIndex = text.indexOf(SPEAKER_SEPARATOR);
  const candidate = text.slice(0, separatorIndex).trim();
  if (
    separatorIndex > 0 &&
    candidate.length <= MAX_SPEAKER_LENGTH &&
    !candidate.includes('\n')
  ) {
    return {
      speaker: candidate,
      body: text.slice(separatorIndex + SPEAKER_SEPARATOR.length).trim(),
    };
  }

  return { body: text.trim() };
}

/** Groups renderer-wrapped lines into complete pages without dropping any copy. */
export function paginateDialogueLines(lines: readonly string[], linesPerPage: number): string[] {
  if (!Number.isInteger(linesPerPage) || linesPerPage <= 0) return [lines.join('\n')];
  if (lines.length === 0) return [''];

  const pages: string[] = [];
  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push(lines.slice(index, index + linesPerPage).join('\n'));
  }
  return pages;
}
