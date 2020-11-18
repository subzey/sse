import { constants } from 'buffer';
import { deflateRawSync, constants as zlibConstants } from 'zlib';
import { sseMessage } from './message.js';

export function deflateBlock(payload: Uint8Array, dictionary?: Uint8Array): Uint8Array {
	return deflateRawSync(payload, { finishFlush: zlibConstants.Z_FULL_FLUSH, dictionary: dictionary});
}

export const gzipHeader = Uint8Array.of(
	// Gzip header
	0x1f, 0x8b,
	// Deflate
	8,
	// Flags
	0b00000000,
	// File modification time
	0, 0, 0, 0,
	// Extra flags
	0b00000000,
	// OS (it doesn't really matter)
	3 // Unix
);

export const noResume = deflateBlock(sseMessage('no-resume', undefined, 'meta'));
