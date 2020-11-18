import { createServer, IncomingMessage, ServerResponse } from 'http';
import { VanillaFakeChannel, MotivationalFakeChannel } from './fake-channel.js';
import { Connection } from './connection.js';

const fakeChannels = {
	'vanilla': new VanillaFakeChannel(),
	'motivational': new MotivationalFakeChannel(),
} as const;

function notFound(req: IncomingMessage, res: ServerResponse): void {
	res.writeHead(404);
	res.end();
}

function handler(req: IncomingMessage, res: ServerResponse, flavor: keyof typeof fakeChannels): void {
	res.writeHead(200, {
		'content-type': 'text/event-stream',
		'content-encoding': 'gzip',
		'access-control-allow-origin': '*',
	});
	const lastEventId = (Array.isArray(req.headers['last-event-id']) ? req.headers['last-event-id'][0] : req.headers['last-event-id']) || undefined;
	const connection = new Connection(
		res.write.bind(res),
		fakeChannels[flavor],
		lastEventId
	);
	req.on('close', () => connection.destroy());
}

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
	if (req.url === '/vanilla/') {
		return handler(req, res, 'vanilla');
	}
	if (req.url === '/motivational/') {
		return handler(req, res, 'motivational');
	}
	return notFound(req, res);
})
.on('listening', () => {
	const addr = server.address() as { port: number };
	console.log(`Listening on ${addr.port}`);
})
.listen(8080)
