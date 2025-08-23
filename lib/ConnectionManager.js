import b4a from "b4a";

class ConnectionManager {
  constructor({ logger, messageHandler, messageHistory }) {
    this.logger = logger;
    this.messageHandler = messageHandler;
    this.messageHistory = messageHistory;
    this.connections = new Map();
  }

  handleConnection({ connection, info }) {
    const peerId = this.generatePeerId({ connection });
    this.registerConnection({ peerId, connection, info });
    this.setupConnectionEventHandlers({ peerId, connection });
    this.sendWelcomeMessage({ peerId });
  }

  generatePeerId({ connection }) {
    return b4a.toString(connection.remotePublicKey, "hex").substring(0, 8);
  }

  registerConnection({ peerId, connection, info }) {
    this.connections.set(peerId, connection);
    this.logger.connection(`New connection from peer ${peerId}`, {
      remoteAddress: connection.remoteAddress,
      type: info.client ? "client" : "server",
      totalConnections: this.connections.size,
    });
  }

  setupConnectionEventHandlers({ peerId, connection }) {
    connection.on("data", (data) => {
      this.messageHandler.handleIncomingMessage({
        peerId,
        data,
        messageHistory: this.messageHistory,
      });
    });

    connection.on("close", () => {
      this.onConnectionClose({ peerId });
    });

    connection.on("error", (err) => {
      this.onConnectionError({ peerId, error: err });
    });
  }

  onConnectionClose({ peerId }) {
    this.connections.delete(peerId);
    this.logger.connection(`Peer ${peerId} disconnected`, {
      totalConnections: this.connections.size,
    });
  }

  onConnectionError({ peerId, error }) {
    this.logger.error(`Connection error with peer ${peerId}:`, { error: error.message });
  }

  sendWelcomeMessage({ peerId }) {
    const welcomeMessage = this.messageHandler.createWelcomeMessage({
      name: this.messageHandler.name,
    });
    this.sendToPeer({ peerId, message: welcomeMessage });
  }

  sendToPeer({ peerId, message }) {
    const conn = this.connections.get(peerId);
    if (conn) {
      conn.write(JSON.stringify(message));
    }
  }

  broadcast({ message, name }) {
    const broadcastMsg = this.messageHandler.createBroadcastMessage({ name, message });

    this.logger.info(`📢 Broadcasting to ${this.connections.size} peers: ${message}`);

    for (const [peerId, conn] of this.connections) {
      try {
        conn.write(JSON.stringify(broadcastMsg));
      } catch (err) {
        this.logger.error(`Failed to broadcast to peer ${peerId}:`, { error: err.message });
      }
    }
  }

  pingAllPeers({ name }) {
    const pingMsg = this.messageHandler.createPingMessage({ name });

    this.logger.info(`🏓 Pinging ${this.connections.size} peers...`);

    for (const [peerId, conn] of this.connections) {
      try {
        conn.write(JSON.stringify(pingMsg));
      } catch (err) {
        this.logger.error(`Failed to ping peer ${peerId}:`, { error: err.message });
      }
    }
  }

  getConnectionsSize() {
    return this.connections.size;
  }

  getConnections() {
    return this.connections;
  }

  closeAllConnections() {
    for (const [peerId, conn] of this.connections) {
      try {
        conn.end();
        this.logger.debug(`Closed connection to peer ${peerId}`);
      } catch (err) {
        this.logger.error(`Error closing connection to peer ${peerId}:`, { error: err.message });
      }
    }
  }
}

export default ConnectionManager;
