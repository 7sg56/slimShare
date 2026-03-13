const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { ExpressPeerServer } = require("peer");
const express = require("express");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = process.env.PORT || 3000;

app.prepare().then(() => {
  const server = express();

  // Create HTTP server
  const httpServer = createServer(server);

  // Mount PeerJS signaling server on /api/peerjs
  const peerServer = ExpressPeerServer(httpServer, {
    path: "/",
    allow_discovery: false,
  });

  server.use("/api/peerjs", peerServer);

  // Log peer connections for debugging
  peerServer.on("connection", (client) => {
    console.log(`[PeerJS] Peer connected: ${client.getId()}`);
  });

  peerServer.on("disconnect", (client) => {
    console.log(`[PeerJS] Peer disconnected: ${client.getId()}`);
  });

  // All other requests go to Next.js
  server.all("{*path}", (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  httpServer.listen(PORT, () => {
    console.log(`> SlimShare ready on http://localhost:${PORT}`);
    console.log(`> PeerJS signaling server on http://localhost:${PORT}/api/peerjs`);
  });
});
