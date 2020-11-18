export function sseMessage(payload: string, id?: string, event?: string): Uint8Array {
	let message = '';
	if (event) {
		message += `event:${event}\n`;
	}
	for (let line of payload.split('\n')) {
		message += `data:${line}\n`;
	}
	if (id) {
		message += `id:${id}\n`;
	}
	message += '\n';
	return Buffer.from(message);
}
