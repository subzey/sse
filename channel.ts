import { EventEmitter } from 'events';
import { deflateBlock } from './deflate.js';
import { MessageItem } from './interface.js';
import { sseMessage } from './message.js';

export class MessageChannel extends EventEmitter {
	/** Raw deflate compressor that holds the backref buffer */
	private _lastRaw: Uint8Array | undefined;
	private readonly _messages: MessageItem[];
	private readonly _maxCache = 100;

	constructor() {
		super();
		this._messages = [];
	}

	public queue(payload: string, id?: string, event?: string): void {
		const raw = sseMessage(payload, id, event);
		const message: MessageItem = {
			id: id,
			byteLength: raw.byteLength,
			deflateNoTakeover: deflateBlock(raw, undefined),
			deflateWithTakeover: deflateBlock(raw, this._lastRaw),
		};
		this._lastRaw = raw;
		if (this._messages.length > this._maxCache) {
			// TODO: Make it a SLL
			this._messages.shift();
		}
		this._messages.push(message);
		this.emit('message', message);
	}

	public messages(): readonly MessageItem[] {
		return this._messages;
	}

	public destroy(): void {
		this._messages.length = 0;
	}
}
