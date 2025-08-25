import b4a from "b4a";
import process from "process";

class UIDisplay {
  constructor({ logger }) {
    this.logger = logger;
  }

  showHelp() {
    this.logger.separator();
    this.logger.info("Available commands:");
    console.log("  /help      - Show this help message");
    console.log("  /peers     - List connected peers");
    console.log("  /ping      - Ping all connected peers");
    console.log("  /broadcast <message> - Broadcast message to all peers");
    console.log("  /history   - Show message history");
    console.log("  /status    - Show connection status");
    console.log("  /topic     - Show current topic for sharing");
    console.log("  /quit      - Quit the application");
    console.log("  <message>  - Send message to all peers");
    this.logger.separator();
  }

  showPeers({ connectionManager }) {
    const connections = connectionManager.getConnections();
    const connectionsSize = connectionManager.getConnectionsSize();

    this.logger.separator();
    this.logger.info(`Connected peers (${connectionsSize}):`);

    if (connectionsSize === 0) {
      console.log("  No peers connected");
    } else {
      for (const [peerId, conn] of connections) {
        console.log(`  • ${peerId} (${conn.remoteAddress})`);
      }
    }
    this.logger.separator();
  }

  showMessageHistory({ messageHistory }) {
    this.logger.separator();
    this.logger.info(`Message history (${messageHistory.length} messages):`);

    messageHistory.slice(-10).forEach((msg, index) => {
      const time = new Date(msg.received).toLocaleTimeString();
      console.log(`  [${time}] ${msg.peerId}: ${msg.message || msg.type}`);
    });
    this.logger.separator();
  }

  showStatus({ mode, name, topic, connectionManager, messageHistory }) {
    const connectionsSize = connectionManager.getConnectionsSize();

    this.logger.separator();
    this.logger.info("Status Information:");
    console.log(`  Mode: ${mode}`);
    console.log(`  Name: ${name}`);
    console.log(`  Topic: ${topic ? b4a.toString(topic, "hex").substring(0, 16) + "..." : "none"}`);
    console.log(`  Connected peers: ${connectionsSize}`);
    console.log(`  Messages received: ${messageHistory.length}`);
    console.log(`  Uptime: ${Math.floor(process.uptime())}s`);
    this.logger.separator();
  }

  showTopic({ topic }) {
    this.logger.separator();
    if (topic) {
      const topicHex = b4a.toString(topic, "hex");
      this.logger.info("Current Topic (copy this to connect other peers):");
      console.log(`  ${topicHex}`);
      console.log("");
      console.log(`To connect peers, use:`);
      console.log(`  node main.js --topic ${topicHex}`);
      console.log(`  npm run peer -- --topic ${topicHex}`);
    } else {
      this.logger.warn("No topic set");
    }
    this.logger.separator();
  }

  showUsage() {
    console.log(`
🌐 Hyperswarm CLI - Advanced P2P Networking Tool

Usage: node main.js [options]

Options:
  -m, --mode <mode>     Operation mode: peer, server, client (default: peer)
  -t, --topic <topic>   Hex-encoded topic to join (generates random if not provided)
  -n, --name <name>     Peer name (generates random if not provided)
  -p, --port <port>     Port number (for future use)
  -h, --help           Show this help message
  -v, --version        Show version information

Examples:
  node main.js                                     # Start as peer with random topic
  node main.js --mode server --name "server1"      # Start as server
  node main.js --mode client --topic <hex-topic>   # Connect as client to specific topic
  node main.js --name "alice" --topic <hex-topic>  # Join specific topic as "alice"

npm scripts:
  npm run peer     # Start as peer
  npm run server   # Start as server
  npm run client   # Start as client
  npm run demo     # Run automated demo with multiple peers
  npm run logs     # Monitor log files
  npm run clean    # Clean log files
`);
  }

  showVersion() {
    console.log("Hyperswarm CLI v1.0.0");
  }
}

export default UIDisplay;
