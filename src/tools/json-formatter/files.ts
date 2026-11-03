export class InvalidFileError extends Error {
  constructor() {
    super('Invalid UTF-8 file');
    this.name = 'InvalidFileError';
  }
}

/** Decode a text file without letting invalid bytes turn into silent replacement characters. */
export async function readTextFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new InvalidFileError();
  }
}
