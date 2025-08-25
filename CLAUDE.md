# CLAUDE.md - Project Guide for Hyperswarm CLI

## 📋 Project Overview

This is a **comprehensive Node.js CLI application** demonstrating advanced peer-to-peer networking using **Hyperswarm**. The project showcases:

- **Real-time P2P communication** with automatic peer discovery
- **Interactive CLI interface** with rich command system
- **Peer-to-peer operation mode**: direct peer connections
- **Comprehensive logging system** with color-coded output
- **Complete test suite** using Brittle test framework
- **Message broadcasting** and connection management

## 🏗️ Project Structure

```
hyperswarm-cli-hello/
├── 📁 Core Application
│   ├── main.js               # Main HyperswarmCLI class and CLI entry point
│   ├── logger.js             # Comprehensive logging system with file output
│   ├── demo.js               # Interactive demo script (Alice & Bob)
│   └── lib/                  # Modular OOP components
│       ├── EventHandler.js       # Swarm and connection event handling
│       ├── MessageHandler.js     # Message processing and type handlers
│       ├── ConnectionManager.js  # Connection lifecycle management
│       └── UIDisplay.js          # User interface and display functions
│
├── 📁 Tests (Brittle Framework)
│   ├── test/unit/            # Fast, isolated component tests
│   │   ├── cli-args.test.js      # CLI argument parsing tests
│   │   ├── logger.test.js        # Logger functionality tests  
│   │   └── message-types.test.js # Message validation tests
│   ├── test/integration/     # Component interaction tests
│   │   └── hyperswarm-cli.test.js # Core app logic tests
│   └── test/e2e/            # Full application tests
│       └── peer-connections.test.js # Real P2P connection tests
│
├── 📁 Configuration & Documentation
│   ├── package.json          # Dependencies, scripts, project config
│   ├── README.md            # Comprehensive usage guide
│   ├── TEST_SUMMARY.md      # Detailed test documentation
│   └── CLAUDE.md            # This file - project guide
│
└── 📁 Legacy/Development
    └── test.js              # Original test script (now test:old)
```

## 🧪 Test System Guide

### **Test Framework**: [Brittle](https://github.com/holepunchto/brittle)
- **TAP-compliant** test runner built for modern Node.js
- **Async/await support** with comprehensive assertion library
- **Coverage reporting** and timeout management
- **100+ assertions** across 30+ tests

### **How to Run Tests**

```bash
# 🚀 Primary Test Commands
npm test                    # Run unit + integration tests (recommended)
npm run test:unit          # Run only unit tests (fast)
npm run test:integration   # Run only integration tests
npm run test:e2e           # Run end-to-end tests (real networking)

# 📊 Advanced Testing  
npm run test:coverage      # Run tests with coverage reporting
npm run test:old           # Legacy test script (process spawning)

# 🧹 Maintenance
npm run logs               # Monitor all log files in real-time
npm run clean              # Clean log files and coverage reports
```

### **Test Categories & Coverage**

1. **Unit Tests** (`test/unit/`) - 24 tests, 81 assertions
   - CLI argument parsing with all combinations
   - Logger functionality and file I/O
   - Message type validation and serialization
   - Edge cases and error handling

2. **Integration Tests** (`test/integration/`) - 7+ tests, 25+ assertions  
   - HyperswarmCLI class interaction
   - User input processing and commands
   - Connection management and peer handling
   - Broadcasting and message routing

3. **E2E Tests** (`test/e2e/`) - 6 tests, real networking
   - Live peer-to-peer connections
   - Multi-peer mesh networks
   - Process spawning and CLI testing
   - Graceful shutdown and error scenarios

## 🚀 Application Usage

### **Quick Start Commands**

```bash
# Start interactive peer (generates random topic)  
npm run peer
# or: node main.js --name alice

  

# Connect to specific topic
node main.js --name bob --topic <TOPIC_FROM_FIRST_PEER>

# Show help and version
node main.js --help
node main.js --version
```

### **Interactive Commands** (once running)
```
/help      - Show available commands
/peers     - List connected peers  
/ping      - Test connection latency
/status    - Show detailed connection info
/topic     - Display current topic for sharing
/broadcast <msg> - Send message to all peers
/history   - Show recent message history
/quit      - Exit application
<message>  - Broadcast message to all peers
```

### **Connection Process**
1. **Alice starts**: `node main.js --name alice`  
   - App generates random topic and shows sharing command
   - Logs: `⚠️ To connect other peers, use: --topic <GENERATED_TOPIC>`

2. **Bob connects**: `node main.js --name bob --topic <ALICE_TOPIC>`
   - Both peers discover each other via DHT
   - Automatic connection establishment and welcome exchange

3. **Interactive chat**: Type messages or use `/` commands

## 🔧 Advanced Features

### **Logging System** (`logger.js`)
- **Color-coded output**: Info (blue), Success (green), Error (red), etc.
- **File persistence**: Each peer creates `<name>.log` with structured data
- **JSON data logging**: Structured logging for debugging network events
- **Multiple log levels**: debug, info, success, warn, error, peer, connection

### **Network Architecture**
- **Hyperswarm DHT**: Distributed hash table for peer discovery
- **Holepunching**: NAT traversal for direct peer connections
- **Message types**: welcome, chat, broadcast, ping/pong with validation
- **Connection lifecycle**: Full tracking from discovery to disconnection

### **Modular Architecture**
- **HyperswarmCLI class** (`main.js`): Main orchestrator with dependency injection
- **EventHandler** (`lib/EventHandler.js`): Manages all swarm and connection events
- **MessageHandler** (`lib/MessageHandler.js`): Processes different message types (welcome, chat, broadcast, ping, pong)
- **ConnectionManager** (`lib/ConnectionManager.js`): Handles connection lifecycle, peer management, and broadcasting
- **UIDisplay** (`lib/UIDisplay.js`): All user interface commands and display functions
- **Keyword arguments**: All methods use `{ param1, param2 }` syntax for clarity
- **Resource management**: Automatic tracking and cleanup using AbortSignal
- **Single Responsibility**: Each class has a focused, well-defined purpose
- **Dependency Injection**: Components are injected for testability and modularity

## 🛠️ Development Workflow

### **Adding New Features**
1. **Write tests first** in appropriate test category
2. **Implement feature** following existing patterns
3. **Run test suite**: `npm test` (should pass)
4. **Update documentation** if public API changes

### **Debugging Network Issues**
1. **Enhanced logging**: All network events are logged with details
2. **Connection monitoring**: DHT peer counts and connection states  
3. **Manual testing**: Use `/status`, `/peers`, `/ping` commands
4. **Log analysis**: Check `*.log` files for detailed event history

### **Performance Testing**
```bash
# Run E2E tests for real networking
npm run test:e2e

# Monitor logs in real-time during testing
npm run logs

# Test with multiple peers
node demo.js  # Automated Alice/Bob demo
```

## 📝 Key Implementation Notes

- **ES Modules**: Project uses `"type": "module"` configuration
- **Object-Oriented Design**: Proper OOP with keyword arguments for all methods
- **Keyword Arguments**: All methods use `{ param1, param2 }` destructuring syntax
- **Resource Management**: Automatic tracking and cleanup of intervals/timeouts
- **Dependencies**: Minimal runtime deps (hyperswarm, minimist, chalk, etc.)
- **Error Handling**: Comprehensive error catching with graceful degradation
- **Cross-platform**: Works on macOS, Linux, Windows with Node.js 18+
- **Memory Management**: Proper cleanup using AbortSignal, event handlers, connections
- **Modern JavaScript**: Uses `es-toolkit/delay` instead of `setTimeout` for better async control
- **Parallel Processing**: Optimized test cleanup and command execution using `Promise.all`

## 🤝 Contributing Guidelines

1. **Follow existing patterns** for consistency
2. **Add tests** for all new functionality  
3. **Use descriptive commit messages**
4. **Run full test suite** before submitting changes
5. **Update documentation** for user-facing changes

---

## 🎯 Project Achievements

- ✅ **100+ test assertions** with comprehensive coverage
- ✅ **Real P2P networking** with automatic peer discovery  
- ✅ **Production-ready logging** with structured output
- ✅ **Interactive CLI** with rich command system
- ✅ **Multiple operation modes** for different use cases
- ✅ **Complete documentation** with examples and guides

**This project demonstrates enterprise-level Node.js development practices with modern P2P networking, comprehensive testing, and excellent developer experience.**