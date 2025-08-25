#!/usr/bin/env node

import Hyperswarm from "hyperswarm";
import crypto from "hypercore-crypto";
import b4a from "b4a";
import minimist from "minimist";
import process from "process";
import { delay } from "es-toolkit";
import Logger from "./logger.js";
import EventHandler from "./lib/EventHandler.js";
import MessageHandler from "./lib/MessageHandler.js";
import ConnectionManager from "./lib/ConnectionManager.js";
import UIDisplay from "./lib/UIDisplay.js";

class HyperswarmCLI {
  constructor({ mode = "peer", topic = null, port = null, name = null } = {}) {
    this.mode = mode;
    this.topic = topic;
    this.port = port;
    this.name = name || `peer-${Math.random().toString(36).substr(2, 8)}`;

    this.logger = new Logger({ name: this.name });
    this.swarm = new Hyperswarm();
    this.messageHistory = [];
    this.abortControllers = new Set(); // Track AbortControllers for cleanup

    // Initialize components
    this.messageHandler = new MessageHandler({
      logger: this.logger,
      name: this.name,
      sendToPeer: this.sendToPeer.bind(this),
    });

    this.connectionManager = new ConnectionManager({
      logger: this.logger,
      messageHandler: this.messageHandler,
      messageHistory: this.messageHistory,
    });

    this.eventHandler = new EventHandler({
      logger: this.logger,
    });

    this.uiDisplay = new UIDisplay({
      logger: this.logger,
    });

    this.setupEventHandlers();
    this.setupGracefulShutdown();
  }

  setupEventHandlers() {
    this.eventHandler.setupSwarmEventHandlers({
      swarm: this.swarm,
      connectionManager: this.connectionManager,
    });

    this.eventHandler.setupStdinEventHandlers();
    this.eventHandler.on("userInput", ({ input }) => {
      this.handleUserInput({ input });
    });
  }

  sendToPeer({ peerId, message }) {
    this.connectionManager.sendToPeer({ peerId, message });
  }

  broadcast({ message }) {
    this.connectionManager.broadcast({ message, name: this.name });
  }

  handleUserInput({ input }) {
    if (!input) return;

    const [command, ...args] = input.split(" ");

    switch (command) {
      case "/help":
        this.uiDisplay.showHelp();
        break;
      case "/peers":
        this.uiDisplay.showPeers({ connectionManager: this.connectionManager });
        break;
      case "/ping":
        this.pingAllPeers();
        break;
      case "/broadcast":
        this.broadcast({ message: args.join(" ") });
        break;
      case "/history":
        this.uiDisplay.showMessageHistory({ messageHistory: this.messageHistory });
        break;
      case "/status":
        this.uiDisplay.showStatus({
          mode: this.mode,
          name: this.name,
          topic: this.topic,
          connectionManager: this.connectionManager,
          messageHistory: this.messageHistory,
        });
        break;
      case "/topic":
        this.uiDisplay.showTopic({ topic: this.topic });
        break;
      case "/quit":
      case "/exit":
        this.shutdown();
        break;
      default:
        if (this.connectionManager.getConnectionsSize() > 0) {
          this.broadcast({ message: input });
        } else {
          this.logger.warn("No peers connected. Use /help for available commands.");
        }
    }
  }

  pingAllPeers() {
    this.connectionManager.pingAllPeers({ name: this.name });
  }

  // Expose for testing
  handleIncomingMessage({ peerId, data }) {
    this.messageHandler.handleIncomingMessage({ peerId, data, messageHistory: this.messageHistory });
  }

  handleConnection({ connection, info }) {
    this.connectionManager.handleConnection({ connection, info });
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

    // Set up a periodic check for peer discovery using delay
    this.startPeerDiscoveryCheck();

    if (process.stdin.isTTY) {
      this.logger.info("💡 Type /help for available commands, or just type a message to broadcast");
      process.stdout.write("> ");
    }
  }

  async startPeerDiscoveryCheck() {
    const controller = new AbortController();
    this.abortControllers.add(controller);

    try {
      // Check every 5 seconds for up to 30 seconds
      for (let i = 0; i < 6; i++) {
        await delay(5000, { signal: controller.signal });

        if (this.connectionManager.getConnectionsSize() === 0) {
          this.logger.debug(`Still looking for peers... (${this.swarm.peers.size} peers in DHT)`);
        } else {
          // Found peers, stop checking
          break;
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        this.logger.debug("Peer discovery check was cancelled");
      } else {
        this.logger.error("Error in peer discovery check:", { error: error.message });
      }
    } finally {
      this.abortControllers.delete(controller);
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

  async shutdown() {
    this.logger.info("🔄 Shutting down...");

    // Abort all ongoing delay operations
    for (const controller of this.abortControllers) {
      controller.abort();
    }
    this.abortControllers.clear();

    // Close all connections
    this.connectionManager.closeAllConnections();

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

// Main execution
async function main() {
  const args = parseArgs();

  // Create UIDisplay instance for CLI commands
  const uiDisplay = new UIDisplay({ logger: null });

  if (args.help) {
    uiDisplay.showUsage();
    return;
  }

  if (args.version) {
    uiDisplay.showVersion();
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
