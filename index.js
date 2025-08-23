#!/usr/bin/env node

import Hyperswarm from "hyperswarm";
import crypto from "hypercore-crypto";
import b4a from "b4a";
import minimist from "minimist";
import process from "process";
import Logger from "./logger.js";

class HyperswarmCLI {
  constructor({ mode = "peer", topic = null, port = null, name = null } = {}) {
    this.mode = mode;
    this.topic = topic;
    this.port = port;
    this.name = name || `peer-${Math.random().toString(36).substr(2, 8)}`;

    this.logger = new Logger({ name: this.name });
    this.swarm = new Hyperswarm();
    this.connections = new Map();
    this.messageHistory = [];
    this.intervals = new Set(); // Track intervals for cleanup

    this.setupEventHandlers();
    this.setupGracefulShutdown();
  }

  setupEventHandlers() {
    this.swarm.on("connection", (conn, info) => {
      this.handleConnection({ connection: conn, info });
    });

    this.swarm.on("update", () => {
      this.logger.debug(`Swarm updated. Connected to ${this.swarm.connections.size} peers`);
    });

    // Add more detailed swarm event logging
    this.swarm.on("peer-add", (peer) => {
      this.logger.peer(`Peer added to swarm: ${b4a.toString(peer.publicKey, "hex").substring(0, 8)}`, {
        address: `${peer.host}:${peer.port}`,
        topics: peer.topics ? peer.topics.length : 0,
      });
    });

    this.swarm.on("peer-remove", (peer) => {
      this.logger.peer(`Peer removed from swarm: ${b4a.toString(peer.publicKey, "hex").substring(0, 8)}`);
    });

    this.swarm.on("connect", (socket, info) => {
      this.logger.connection(`Swarm connecting to peer`, {
        host: info.host,
        port: info.port,
        client: info.client,
      });
    });

    this.swarm.on("disconnect", (socket, info) => {
      this.logger.connection(`Swarm disconnecting from peer`, {
        host: info.host,
        port: info.port,
      });
    });

    // Handle stdin for interactive messaging
    if (process.stdin.isTTY) {
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (data) => {
        this.handleUserInput({ input: data.toString().trim() });
      });
    }
  }

  handleConnection({ connection, info }) {
    const peerId = b4a.toString(connection.remotePublicKey, "hex").substring(0, 8);
    this.connections.set(peerId, connection);

    this.logger.connection(`New connection from peer ${peerId}`, {
      remoteAddress: connection.remoteAddress,
      type: info.client ? "client" : "server",
      totalConnections: this.connections.size,
    });

    // Handle incoming messages
    connection.on("data", (data) => {
      this.handleIncomingMessage({ peerId, data });
    });

    // Handle connection close
    connection.on("close", () => {
      this.connections.delete(peerId);
      this.logger.connection(`Peer ${peerId} disconnected`, {
        totalConnections: this.connections.size,
      });
    });

    // Handle connection errors
    connection.on("error", (err) => {
      this.logger.error(`Connection error with peer ${peerId}:`, { error: err.message });
    });

    // Send welcome message
    this.sendToPeer({ 
      peerId, 
      message: {
        type: "welcome",
        from: this.name,
        message: `Hello from ${this.name}!`,
        timestamp: Date.now(),
      }
    });
  }

  handleIncomingMessage({ peerId, data }) {
    try {
      const message = JSON.parse(data.toString());
      this.messageHistory.push({ ...message, peerId, received: Date.now() });

      this.logger.peer(`Message from ${peerId}:`, message);

      // Handle different message types
      switch (message.type) {
        case "welcome":
          this.logger.success(`Welcome message from ${message.from}`);
          break;
        case "chat":
          this.logger.info(`💬 ${message.from}: ${message.message}`);
          break;
        case "broadcast":
          this.logger.info(`📢 Broadcast from ${message.from}: ${message.message}`);
          break;
        case "ping":
          this.sendToPeer({ 
            peerId, 
            message: {
              type: "pong",
              from: this.name,
              originalTimestamp: message.timestamp,
              timestamp: Date.now(),
            }
          });
          break;
        case "pong":
          const latency = Date.now() - message.originalTimestamp;
          this.logger.success(`🏓 Pong from ${message.from} (${latency}ms latency)`);
          break;
      }
    } catch (err) {
      this.logger.error("Failed to parse incoming message:", { error: err.message });
    }
  }

  sendToPeer({ peerId, message }) {
    const conn = this.connections.get(peerId);
    if (conn) {
      conn.write(JSON.stringify(message));
    }
  }

  broadcast({ message }) {
    const broadcastMsg = {
      type: "broadcast",
      from: this.name,
      message,
      timestamp: Date.now(),
    };

    this.logger.info(`📢 Broadcasting to ${this.connections.size} peers: ${message}`);

    for (const [peerId, conn] of this.connections) {
      try {
        conn.write(JSON.stringify(broadcastMsg));
      } catch (err) {
        this.logger.error(`Failed to broadcast to peer ${peerId}:`, { error: err.message });
      }
    }
  }

  handleUserInput({ input }) {
    if (!input) return;

    const [command, ...args] = input.split(" ");

    switch (command) {
      case "/help":
        this.showHelp();
        break;
      case "/peers":
        this.showPeers();
        break;
      case "/ping":
        this.pingAllPeers();
        break;
      case "/broadcast":
        this.broadcast({ message: args.join(" ") });
        break;
      case "/history":
        this.showMessageHistory();
        break;
      case "/status":
        this.showStatus();
        break;
      case "/topic":
        this.showTopic();
        break;
      case "/quit":
      case "/exit":
        this.shutdown();
        break;
      default:
        if (this.connections.size > 0) {
          this.broadcast({ message: input });
        } else {
          this.logger.warn("No peers connected. Use /help for available commands.");
        }
    }
  }

  pingAllPeers() {
    const pingMsg = {
      type: "ping",
      from: this.name,
      timestamp: Date.now(),
    };

    this.logger.info(`🏓 Pinging ${this.connections.size} peers...`);

    for (const [peerId, conn] of this.connections) {
      try {
        conn.write(JSON.stringify(pingMsg));
      } catch (err) {
        this.logger.error(`Failed to ping peer ${peerId}:`, { error: err.message });
      }
    }
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

  showPeers() {
    this.logger.separator();
    this.logger.info(`Connected peers (${this.connections.size}):`);

    if (this.connections.size === 0) {
      console.log("  No peers connected");
    } else {
      for (const [peerId, conn] of this.connections) {
        console.log(`  • ${peerId} (${conn.remoteAddress})`);
      }
    }
    this.logger.separator();
  }

  showMessageHistory() {
    this.logger.separator();
    this.logger.info(`Message history (${this.messageHistory.length} messages):`);

    this.messageHistory.slice(-10).forEach((msg, index) => {
      const time = new Date(msg.received).toLocaleTimeString();
      console.log(`  [${time}] ${msg.peerId}: ${msg.message || msg.type}`);
    });
    this.logger.separator();
  }

  showStatus() {
    this.logger.separator();
    this.logger.info("Status Information:");
    console.log(`  Mode: ${this.mode}`);
    console.log(`  Name: ${this.name}`);
    console.log(`  Topic: ${this.topic ? b4a.toString(this.topic, "hex").substring(0, 16) + "..." : "none"}`);
    console.log(`  Connected peers: ${this.connections.size}`);
    console.log(`  Messages received: ${this.messageHistory.length}`);
    console.log(`  Uptime: ${Math.floor(process.uptime())}s`);
    this.logger.separator();
  }

  showTopic() {
    this.logger.separator();
    if (this.topic) {
      const topicHex = b4a.toString(this.topic, "hex");
      this.logger.info("Current Topic (copy this to connect other peers):");
      console.log(`  ${topicHex}`);
      console.log("");
      console.log(`To connect peers, use:`);
      console.log(`  node index.js --topic ${topicHex}`);
      console.log(`  npm run peer -- --topic ${topicHex}`);
    } else {
      this.logger.warn("No topic set");
    }
    this.logger.separator();
  }

  async start() {
    this.logger.success(`🚀 Starting Hyperswarm CLI in ${this.mode} mode`);
    this.logger.info(`Peer name: ${this.name}`);

    // Generate or use provided topic
    let topicBuffer;
    if (this.topic) {
      topicBuffer = b4a.from(this.topic, "hex");
      this.logger.info(`Using provided topic: ${this.topic}`);
    } else {
      topicBuffer = crypto.randomBytes(32);
      const topicHex = b4a.toString(topicBuffer, "hex");
      this.logger.info(`Generated topic: ${topicHex}`);
      this.logger.warn(`⚠️  To connect other peers, use: --topic ${topicHex}`);
    }

    // Store the topic for status display
    this.topic = topicBuffer;

    // Join the swarm
    const discovery = this.swarm.join(topicBuffer, {
      client: this.mode !== "server",
      server: this.mode !== "client",
    });

    this.logger.info("Joining swarm...", {
      mode: this.mode,
      client: this.mode !== "server",
      server: this.mode !== "client",
      topicHash: b4a.toString(topicBuffer, "hex").substring(0, 16) + "...",
    });

    // Wait for the topic to be announced
    await discovery.flushed();
    this.logger.success("✅ Successfully joined swarm and announced topic");

    // Log additional swarm info
    this.logger.debug(
      `Swarm info: ${this.swarm.connections.size} connections, ${this.swarm.peers.size} peers`,
    );

    // Start looking for peers
    this.logger.info("🔍 Looking for peers on the network...");

    // Set up a periodic check for peer discovery
    const peerCheckInterval = setInterval(() => {
      if (this.connections.size === 0) {
        this.logger.debug(`Still looking for peers... (${this.swarm.peers.size} peers in DHT)`);
      } else {
        this.clearInterval({ intervalId: peerCheckInterval });
      }
    }, 5000);
    this.intervals.add(peerCheckInterval);

    // Clear interval after 30 seconds to avoid spam
    const cleanupTimeout = setTimeout(() => this.clearInterval({ intervalId: peerCheckInterval }), 30000);
    this.intervals.add(cleanupTimeout);

    if (process.stdin.isTTY) {
      this.logger.info("💡 Type /help for available commands, or just type a message to broadcast");
      process.stdout.write("> ");
    }
  }

  setupGracefulShutdown() {
    const shutdown = () => {
      this.shutdown();
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    process.on("uncaughtException", (err) => {
      this.logger.error("Uncaught exception:", { error: err.message });
      shutdown();
    });
  }

  clearInterval({ intervalId }) {
    if (this.intervals.has(intervalId)) {
      clearInterval(intervalId);
      this.intervals.delete(intervalId);
    }
  }

  async shutdown() {
    this.logger.info("🔄 Shutting down...");

    // Clear all intervals
    for (const intervalId of this.intervals) {
      clearInterval(intervalId);
    }
    this.intervals.clear();

    // Close all connections
    for (const [peerId, conn] of this.connections) {
      try {
        conn.end();
        this.logger.debug(`Closed connection to peer ${peerId}`);
      } catch (err) {
        this.logger.error(`Error closing connection to peer ${peerId}:`, { error: err.message });
      }
    }

    // Destroy the swarm
    try {
      await this.swarm.destroy();
      this.logger.success("✅ Swarm destroyed successfully");
    } catch (err) {
      this.logger.error("Error destroying swarm:", { error: err.message });
    }

    this.logger.success("👋 Goodbye!");
    process.exit(0);
  }
}

// CLI argument parsing
function parseArgs() {
  const args = minimist(process.argv.slice(2), {
    string: ["mode", "topic", "name", "port"],
    boolean: ["help", "version"],
    alias: {
      h: "help",
      v: "version",
      m: "mode",
      t: "topic",
      n: "name",
      p: "port",
    },
    default: {
      mode: "peer",
    },
  });

  return args;
}

function showUsage() {
  console.log(`
🌐 Hyperswarm CLI - Advanced P2P Networking Tool

Usage: node index.js [options]

Options:
  -m, --mode <mode>     Operation mode: peer, server, client (default: peer)
  -t, --topic <topic>   Hex-encoded topic to join (generates random if not provided)
  -n, --name <name>     Peer name (generates random if not provided)
  -p, --port <port>     Port number (for future use)
  -h, --help           Show this help message
  -v, --version        Show version information

Examples:
  node index.js                                    # Start as peer with random topic
  node index.js --mode server --name "server1"     # Start as server
  node index.js --mode client --topic <hex-topic>  # Connect as client to specific topic
  node index.js --name "alice" --topic <hex-topic> # Join specific topic as "alice"

npm scripts:
  npm run peer     # Start as peer
  npm run server   # Start as server
  npm run client   # Start as client
  npm run demo     # Run automated demo with multiple peers
  npm run logs     # Monitor log files
  npm run clean    # Clean log files
`);
}

// Main execution
async function main() {
  const args = parseArgs();

  if (args.help) {
    showUsage();
    return;
  }

  if (args.version) {
    console.log("Hyperswarm CLI v1.0.0");
    return;
  }

  // Override mode based on positional argument for npm scripts
  if (args._[0] && ["peer", "server", "client"].includes(args._[0])) {
    args.mode = args._[0];
  }

  try {
    const cli = new HyperswarmCLI({
      mode: args.mode,
      topic: args.topic,
      name: args.name,
      port: args.port,
    });

    await cli.start();
  } catch (error) {
    console.error("❌ Failed to start application:", error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default HyperswarmCLI;
