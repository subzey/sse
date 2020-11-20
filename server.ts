import { readFileSync } from 'fs';
import { URL } from 'url';
import { createSecureServer, ServerHttp2Stream, IncomingHttpHeaders } from 'http2';
import { VanillaFakeChannel, MotivationalFakeChannel } from './fake-channel.js';
import { Connection } from './connection.js';

const fakeChannels = {
	'vanilla': new VanillaFakeChannel(),
	'motivational': new MotivationalFakeChannel(),
} as const;


function handler(flavor: keyof typeof fakeChannels, stream: ServerHttp2Stream, headers: IncomingHttpHeaders): void {
	stream.respond({
		':status': 200,
		'content-type': 'text/event-stream',
		'content-encoding': 'gzip',
		'access-control-allow-origin': '*',
	});
	const lastEventId = (Array.isArray(headers['last-event-id']) ? headers['last-event-id'][0] : headers['last-event-id']) || undefined;
	const connection = new Connection(
		stream.write.bind(stream),
		fakeChannels[flavor],
		lastEventId
	);
	stream.on('close', () => connection.destroy());
}

function serveStatic(stream: ServerHttp2Stream): void {
	stream.respond({
		':status': 200,
		'content-type': 'text/html;charset=utf-8',
	});
	stream.end(readFileSync('client.html'));
}

function notFound(stream: ServerHttp2Stream): void {
	stream.respond({':status': 404});
	stream.end();
}

const server = createSecureServer({
	key: readFileSync('localhost-privkey.pem'),
	cert: readFileSync('localhost-cert.pem'),
});

server.on('stream', (stream: ServerHttp2Stream, headers: IncomingHttpHeaders): void => {
	const { pathname } = new URL(headers[':path'] || '/', 'https://127.0.0.1');
	console.log(pathname);
	if (pathname === '/') {
		stream.respondWithFile('client.html', {':status': 200, 'content-type': 'text/html;charset=utf-8'});
		return;
	}
	if (pathname === '/blank/') {
		stream.respond({':status': 200, 'content-type': 'text/html'});
		stream.end('<!doctype html>');
		return;
	}
	if (pathname === '/service-worker.js') {
		stream.respondWithFile('service-worker.js', {':status': 200, 'content-type': 'application/javascript;charset=utf-8'});
		return;
	}
	if (pathname === '/sse/vanilla/') {
		return handler('vanilla', stream, headers);
	}
	if (pathname === '/sse/motivational/') {
		return handler('motivational', stream, headers);
	}
	return notFound(stream);
});
server.on('listening', () => {
	const addr = server.address() as { port: number };
	console.log(`https://127.0.0.1:${addr.port}/`);
});
server.listen(3443)
