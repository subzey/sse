export interface MessageItem {
	readonly id: string | undefined;
	/** Byte length of the original unpacked message */
	readonly byteLength: number;
	/**
	 * Chunk of the deflate binary, compressed without backrefs
	 * that crosses the chunk boundary.
	 */
	readonly deflateNoTakeover: Uint8Array;
	/**
	 * Chunk of the deflate binary, compressed with backrefs
	 * that crosses the chunk boundary (up to 32768).
	 */
	readonly deflateWithTakeover: Uint8Array | null;
}
