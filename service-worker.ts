/// <reference no-default-lib="true"/>
/// <reference lib="webworker"/>

class Upstream {
	public readonly url: string;
	private _destroyed: boolean = false;
	private _request: Promise<Response>;
	private _streamControllers: ReadableStreamDefaultController<Uint8Array>[] = [];

	constructor(url: string) {
		this.url = url;
		this._request = (self as unknown as ServiceWorkerGlobalScope).fetch(this.url, { headers: { accept: 'text/event-stream' } });
		this._init();
	}

	public async response(): Promise<Response> {
		let ctl!: ReadableStreamDefaultController<Uint8Array>;
		const stream = new ReadableStream({
			start: (c: ReadableStreamDefaultController<Uint8Array>) => {
				ctl = c;
			},
			cancel: (reason: string) => {
				console.log(`Stream cancelled: ${reason}`);
				ctl.close();
				this._teardown(ctl);
			},
		});
		this._streamControllers.push(ctl);

		const upstreamResponse = await this._request;
		if (!upstreamResponse.ok) {
			// Return as is
			this._teardown(ctl);
			return upstreamResponse;
		}
		return new Response(stream, { headers: {'content-type': 'text/event-stream'} });
	}

	public destroy(): void {
		this._destroyed = true;
		for (const ctl of this._streamControllers.splice(0)) {
			ctl.close();
		}
	}

	public isDestroyed() {
		return this._destroyed;
	}

	private async _init(): Promise<void> {
		const upstreamResponse = await this._request;
		if (!upstreamResponse.ok) {
			this.destroy();
			return;
		}
		const reader = upstreamResponse.body!.getReader();
		while (true) {
			const { done, value } = await reader.read();
			for (const ctl of this._streamControllers) {
				if (value) {
					ctl.enqueue(value);
				}
				if (done) {
					ctl.close();
				}
			}
			if (done) {
				break;
			}
		}
		this.destroy();
	}

	private _teardown(controller: ReadableStreamDefaultController<Uint8Array>): void {
		this._streamControllers.splice(this._streamControllers.indexOf(controller) >>> 0, 1);
		if (this._streamControllers.length === 0) {
			setTimeout(() => {
				if (this._streamControllers.length === 0) {
					this.destroy();
				}
			}, 1000)
		}
	}
}

const upstreams: Map<string, Upstream> = new Map();

function getUpstream(url: string): Upstream {
	if (!upstreams.has(url)) {
		upstreams.set(url, new Upstream(url));
	}
	return upstreams.get(url)!;
}

(self as unknown as ServiceWorkerGlobalScope).addEventListener('fetch', (fetchEvent: FetchEvent) => {
	const url = fetchEvent.request.url;
	console.log('fetch!', url);
	if (fetchEvent.request.headers.get('accept') !== 'text/event-stream') {
		return;
	}
	fetchEvent.request.signal.addEventListener('abort', () => console.log(`Aborted: ${url}`));
	let upstream = upstreams.get(url);
	if (!upstream || upstream.isDestroyed()) {
		upstream = new Upstream(url);
		upstreams.set(url, upstream);
	}
	fetchEvent.respondWith(upstream.response());
});
