const http = require('http');
const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

const host = '0.0.0.0';
const port = 1234;

if (process.env.YPERSISTENCE) {
    console.log(`[collab] LevelDB persistence at: ${process.env.YPERSISTENCE}`);
}

const server = http.createServer((req, res) => {
    res.writeHead(req.url === '/health' ? 200 : 404);
    res.end(req.url === '/health' ? 'ok' : '');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log('[collab] Port in use, retrying in 3s...');
        setTimeout(() => server.listen(port, host), 3000);
    }
});

const wss = new WebSocket.Server({ server });
wss.on('connection', (ws, req) => {
    const room = req.url?.slice(1) ?? 'unknown';
    const ip = req.socket.remoteAddress;
    console.log(`[collab] CONNECTED ip=${ip} room=${room}`);
    ws.on('close', () => console.log(`[collab] DISCONNECTED ip=${ip} room=${room}`));
    setupWSConnection(ws, req);
});

server.listen(port, host, () => {
    console.log(`[collab] running on ws://${host}:${port}`);
});
