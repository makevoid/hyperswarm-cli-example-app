# 🌐 Hyperswarm CLI - Advanced P2P Networking Tool

A comprehensive Node.js CLI application demonstrating Hyperswarm features implementing a real-time chat application.

## ✨ Features

- 🔗 **Peer-to-Peer Discovery**: Automatic peer discovery using Hyperswarm DHT
- 💬 **Real-time Messaging**: Interactive chat with connected peers  
- 📡 **Broadcasting**: Send messages to all connected peers
- 🏓 **Ping/Pong**: Network latency testing between peers
- 📊 **Connection Management**: Track and manage peer connections
- 📝 **Comprehensive Logging**: Detailed logs with color-coded output
- 🎛️ **Peer-to-Peer Mode**: Direct peer connections with automatic discovery
- ⚡ **Interactive CLI**: Rich command interface with help system

## 🚀 Quick Start

### Installation

```bash
# Clone and install
git clone <your-repo>
cd hyperswarm-cli-example-app
npm install
```

### Basic Usage

```bash
# Start as a peer (generates random topic)
npm run peer


# Run automated demo
npm run demo
```

## 📖 Detailed Usage

### Command Line Options

```bash
node main.js [options]

Options:
  -m, --mode <mode>     Operation mode: peer (default: peer)
  -t, --topic <topic>   Hex-encoded topic to join (generates random if not provided)
  -n, --name <name>     Peer name (generates random if not provided)  
  -p, --port <port>     Port number (for future use)
  -h, --help           Show help message
  -v, --version        Show version information
```

### Interactive Commands

Once running, use these commands in the CLI:

- `/help` - Show available commands
- `/peers` - List connected peers  
- `/ping` - Ping all connected peers
- `/broadcast <message>` - Broadcast message to all peers
- `/history` - Show message history
- `/status` - Show connection status
- `/quit` - Quit the application
- `<message>` - Send message to all peers

### Examples

#### Example 1: Basic Peer Connection

Terminal 1 (First Peer):
```bash
npm run peer
# Note the topic from the output
```

Terminal 2 (Second Peer):
```bash
node main.js --topic <TOPIC_FROM_FIRST_PEER>
```

#### Example 2: Named Peers with Custom Topic

Terminal 1:
```bash
node main.js --name "Alice" --topic "deadbeefcafebabe1234567890abcdef1234567890abcdef1234567890abcdef"
```

Terminal 2:
```bash
node main.js --name "Bob" --topic "deadbeefcafebabe1234567890abcdef1234567890abcdef1234567890abcdef"
```

#### Example 3: Interactive Session

After connecting peers, try these commands:
```
> Hello everyone!
> /ping
> /peers
> /broadcast This is a broadcast message
> /status
> /help
```

## 🛠️ NPM Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the application |
| `npm run peer` | Start as peer mode |
| `npm run demo` | Run automated demo with multiple peers |
| `npm test` | Run test suite |
| `npm run logs` | Monitor log files |
| `npm run clean` | Clean log files |

## 📊 Monitoring and Debugging

### Log Files

Each peer creates its own log file:
- `<peer-name>.log` - Contains detailed logs for each peer
- Use `npm run logs` to monitor all log files in real-time
- Use `npm run clean` to remove old log files

### Log Levels

The application uses color-coded logging:
- 🔵 **INFO** - General information
- 🟢 **SUCCESS** - Successful operations
- 🟡 **WARN** - Warnings
- 🔴 **ERROR** - Errors
- ⚫ **DEBUG** - Debug information
- 🟣 **PEER** - Peer-related events
- 🔷 **CONNECTION** - Connection events

## 🏗️ Architecture

### Core Components

1. **HyperswarmCLI Class** - Main application class
2. **Logger** - Comprehensive logging system
3. **Connection Manager** - Handles peer connections
4. **Message System** - Processes different message types
5. **CLI Interface** - Interactive command system

### Message Types

- `welcome` - Initial greeting between peers
- `chat` - Regular chat messages
- `broadcast` - Messages sent to all peers
- `ping`/`pong` - Network latency testing

### Connection Flow

1. Application starts and joins Hyperswarm topic
2. DHT discovers other peers on the same topic
3. Connections are established automatically
4. Peers can exchange messages interactively
5. Connection events are logged and tracked

## 🧪 Testing

### Automated Testing

```bash
npm test
```

This runs a comprehensive test that:
- Starts multiple peer instances
- Tests peer discovery and connection
- Verifies message exchange
- Monitors for errors
- Cleans up automatically

### Manual Testing

1. **Single Machine Multi-Terminal**:
   ```bash
   # Terminal 1
   npm run peer
   
   # Terminal 2  
   npm run peer
   
   # Terminal 3
   npm run peer
   ```

2. **Network Testing**:
   - Run on different machines using same topic
   - Test NAT traversal and holepunching
   - Monitor connection establishment

## 🔧 Advanced Configuration

### Environment Variables

```bash
# Enable debug mode
DEBUG=hyperswarm* node main.js

# Custom storage location
HYPERSWARM_STORAGE=/custom/path node main.js
```

### Customization

The application is designed to be easily extensible:

- **Add Message Types**: Extend the message handling system
- **Custom Protocols**: Implement additional protocols
- **Storage Integration**: Add persistence capabilities  
- **UI Enhancements**: Improve the CLI interface

## 📁 Project Structure

```
hyperswarm-cli-hello/
├── main.js           # Main application
├── logger.js         # Logging system
├── test.js           # Test suite
├── package.json      # Dependencies and scripts
├── README.md         # This file
└── *.log            # Generated log files
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Related Projects

- [Hyperswarm](https://github.com/hyperswarm/hyperswarm) - The core P2P networking library
- [Hypercore](https://github.com/holepunchto/hypercore) - Distributed append-only log
- [Hyperbee](https://github.com/holepunchto/hyperbee) - Distributed key-value store

## 📞 Support

For questions or issues:
1. Check the logs with `npm run logs`
2. Run tests with `npm test`
3. Enable debug mode for detailed output
4. Create an issue with logs and reproduction steps

---

Made with ❤️ using [Hyperswarm](https://hyperswarm.org) - Readme authored with Claude
