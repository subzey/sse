import { createServer, IncomingMessage, ServerResponse } from 'http';
import { MessageChannel } from './channel.js';
import { Connection } from './connection.js';



const channel = new MessageChannel();
let messageId = 0;
setInterval(() => {
	channel.queue(
		JSON.stringify({
			'current-date': new Date().toISOString(),
			'random-number': Math.random(),
			'message': [
				'Server-Sent Events (SSE) is a server push technology enabling a client to receive automatic updates from a server via HTTP connection. The Server-Sent Events EventSource API is standardized as part of HTML5[1] by the W3C.',
				'The WHATWG Web Applications 1.0 proposal[2] included a mechanism to push content to the client. On September 1, 2006, the Opera web browser implemented this new experimental technology in a feature called "Server-Sent Events".[3][4]',
				'Server-Sent Events is a standard describing how servers can initiate data transmission towards clients once an initial client connection has been established. They are commonly used to send message updates or continuous data streams to a browser client and designed to enhance native, cross-browser streaming through a JavaScript API called EventSource, through which a client requests a particular URL in order to receive an event stream.'
			]
		}, null, 2),
		String(messageId++)
	);
}, 10000);

function notFound(req: IncomingMessage, res: ServerResponse): void {
	res.writeHead(404);
	res.end();
}

function handler(req: IncomingMessage, res: ServerResponse): void {
	res.writeHead(200, {
		'content-type': 'text/event-stream',
		'content-encoding': 'gzip',
		'access-control-allow-origin': '*',
	});
	const lastEventId = (Array.isArray(req.headers['last-event-id']) ? req.headers['last-event-id'][0] : req.headers['last-event-id']) || undefined;
	const connection = new Connection(
		res.write.bind(res),
		channel,
		lastEventId
	);
	req.on('close', () => connection.destroy());
}

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
	if (req.url === '/sse/') {
		return handler(req, res);
	}
	return notFound(req, res);
})
.on('listening', () => {
	const addr = server.address() as { port: number };
	console.log(`Listening on ${addr.port}`);
})
.listen(8080)
