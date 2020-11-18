import { gzipHeader, noResume } from './deflate.js';
import { MessageChannel } from './channel.js';
import { MessageItem } from './interface.js';

let connectionId = 0;

export class Connection {
	private _mayUseTakeover = false;
	private readonly _sendRaw: (raw: Uint8Array) => unknown;
	private readonly _chan: MessageChannel;
	private readonly _lastId?: string;
	private readonly _boundSend: (this: unknown, message: MessageItem) => void;
	/** for debug */
	private readonly _connectionId: number;

	constructor(callback: (raw: Uint8Array) => unknown, channel: MessageChannel, lastId: string | undefined) {
		this._connectionId = ++connectionId;
		this._sendRaw = callback;
		this._chan = channel;
		this._lastId = lastId;
		this._boundSend = this._send.bind(this);
		this._init();
	}

	public destroy() {
		this._chan.off('message', this._boundSend);
		console.log(`#${this._connectionId}: Closed`);
	}

	private _init(): void {
		console.log(`#${this._connectionId}: Established, last event id: ${this._lastId}`);

		// Write the gzip header
		this._sendRaw(gzipHeader);
		// We won't need the gzip footer as this connection is eternal

		let resumed = false;
		if (this._lastId) {
			for (const message of this._chan.messages()) {
				if (resumed) {
					this._send(message);
				}
				if (message.id === this._lastId) {
					resumed = true;
				}
			}
		}
		if (!resumed) {
			console.log(`#${this._connectionId}: Sending "not resumed"`);
			this._sendRaw(noResume);
		}
		this._chan.on('message', this._boundSend);
	}

	private _send(message: MessageItem): void {
		if (message.deflateWithTakeover !== null && this._mayUseTakeover) {
			console.log(`#${this._connectionId}: Sending with takeover (${message.deflateWithTakeover.byteLength} bytes deflated, ${message.byteLength} raw)`);
			this._sendRaw(message.deflateWithTakeover);
		} else {
			console.log(`#${this._connectionId}: Sending with no takeover (${message.deflateNoTakeover.byteLength} bytes deflated, ${message.byteLength} raw)`);
			this._sendRaw(message.deflateNoTakeover);
		}
		this._mayUseTakeover = true;
	}
}
