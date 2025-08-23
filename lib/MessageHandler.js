class MessageHandler {
  constructor({ logger, name, sendToPeer }) {
    this.logger = logger;
    this.name = name;
    this.sendToPeer = sendToPeer;
  }

  handleIncomingMessage({ peerId, data, messageHistory }) {
    try {
      const message = this.parseMessage({ data });
      this.recordMessage({ message, peerId, messageHistory });
      this.logIncomingMessage({ peerId, message });
      this.processMessageByType({ peerId, message });
    } catch (err) {
      this.logger.error("Failed to parse incoming message:", { error: err.message });
    }
  }

  parseMessage({ data }) {
    return JSON.parse(data.toString());
  }

  recordMessage({ message, peerId, messageHistory }) {
    messageHistory.push({ ...message, peerId, received: Date.now() });
  }

  logIncomingMessage({ peerId, message }) {
    this.logger.peer(`Message from ${peerId}:`, message);
  }

  processMessageByType({ peerId, message }) {
    switch (message.type) {
      case "welcome":
        this.handleWelcomeMessage({ message });
        break;
      case "chat":
        this.handleChatMessage({ message });
        break;
      case "broadcast":
        this.handleBroadcastMessage({ message });
        break;
      case "ping":
        this.handlePingMessage({ peerId, message });
        break;
      case "pong":
        this.handlePongMessage({ message });
        break;
      default:
        this.logger.warn(`Unknown message type: ${message.type}`, message);
    }
  }

  handleWelcomeMessage({ message }) {
    this.logger.success(`Welcome message from ${message.from}`);
  }

  handleChatMessage({ message }) {
    this.logger.info(`💬 ${message.from}: ${message.message}`);
  }

  handleBroadcastMessage({ message }) {
    this.logger.info(`📢 Broadcast from ${message.from}: ${message.message}`);
  }

  handlePingMessage({ peerId, message }) {
    this.sendToPeer({ 
      peerId, 
      message: {
        type: "pong",
        from: this.name,
        originalTimestamp: message.timestamp,
        timestamp: Date.now(),
      }
    });
  }

  handlePongMessage({ message }) {
    const latency = Date.now() - message.originalTimestamp;
    this.logger.success(`🏓 Pong from ${message.from} (${latency}ms latency)`);
  }

  createWelcomeMessage({ name }) {
    return {
      type: "welcome",
      from: name,
      message: `Hello from ${name}!`,
      timestamp: Date.now(),
    };
  }

  createBroadcastMessage({ name, message }) {
    return {
      type: "broadcast",
      from: name,
      message,
      timestamp: Date.now(),
    };
  }

  createPingMessage({ name }) {
    return {
      type: "ping",
      from: name,
      timestamp: Date.now(),
    };
  }
}

export default MessageHandler;