import b4a from "b4a";
import { EventEmitter } from "events";

class EventHandler extends EventEmitter {
  constructor({ logger }) {
    super();
    this.logger = logger;
  }

  setupSwarmEventHandlers({ swarm, connectionManager }) {
    swarm.on("connection", (conn, info) => {
      connectionManager.handleConnection({ connection: conn, info });
    });

    swarm.on("update", () => {
      this.onSwarmUpdate({ swarm });
    });

    swarm.on("peer-add", (peer) => {
      this.onPeerAdd({ peer });
    });

    swarm.on("peer-remove", (peer) => {
      this.onPeerRemove({ peer });
    });

    swarm.on("connect", (socket, info) => {
      this.onSwarmConnect({ socket, info });
    });

    swarm.on("disconnect", (socket, info) => {
      this.onSwarmDisconnect({ socket, info });
    });
  }

  setupStdinEventHandlers() {
    if (process.stdin.isTTY) {
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (data) => {
        this.emit("userInput", { input: data.toString().trim() });
      });
    }
  }

  onSwarmUpdate({ swarm }) {
    this.logger.debug(`Swarm updated. Connected to ${swarm.connections.size} peers`);
  }

  onPeerAdd({ peer }) {
    this.logger.peer(`Peer added to swarm: ${b4a.toString(peer.publicKey, "hex").substring(0, 8)}`, {
      address: `${peer.host}:${peer.port}`,
      topics: peer.topics ? peer.topics.length : 0,
    });
  }

  onPeerRemove({ peer }) {
    this.logger.peer(`Peer removed from swarm: ${b4a.toString(peer.publicKey, "hex").substring(0, 8)}`);
  }

  onSwarmConnect({ socket, info }) {
    this.logger.connection(`Swarm connecting to peer`, {
      host: info.host,
      port: info.port,
      client: info.client,
    });
  }

  onSwarmDisconnect({ socket, info }) {
    this.logger.connection(`Swarm disconnecting from peer`, {
      host: info.host,
      port: info.port,
    });
  }
}

export default EventHandler;
