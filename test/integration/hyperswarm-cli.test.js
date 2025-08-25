import test from 'brittle'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import HyperswarmCLI from '../../main.js'

test('HyperswarmCLI - constructor initialization', async function (t) {
  t.plan(7)
  
  const cli = new HyperswarmCLI({
    mode: 'peer',
    name: 'test-cli',
    topic: 'deadbeef'
  })
  
  t.is(cli.mode, 'peer', 'should set mode correctly')
  t.is(cli.name, 'test-cli', 'should set name correctly')
  t.is(cli.topic, 'deadbeef', 'should set topic correctly')
  t.ok(cli.logger, 'should initialize logger')
  t.ok(cli.swarm, 'should initialize swarm')
  t.ok(cli.connectionManager, 'should initialize connection manager')
  t.ok(cli.connectionManager.getConnections() instanceof Map, 'should initialize connections Map')
  
  t.teardown(async () => {
    await cli.shutdown()
  })
})

test('HyperswarmCLI - default values', async function (t) {
  t.plan(4)
  
  const cli = new HyperswarmCLI()
  
  t.is(cli.mode, 'peer', 'should default to peer mode')
  t.absent(cli.topic, 'should not have default topic')
  t.ok(cli.name.startsWith('peer-'), 'should generate random name')
  t.is(cli.messageHistory.length, 0, 'should initialize empty message history')
  
  t.teardown(async () => {
    await cli.shutdown()
  })
})

test('HyperswarmCLI - message handling', async function (t) {
  t.plan(3)
  
  const cli = new HyperswarmCLI({ name: 'test-handler' })
  
  const mockPeerId = 'testpeer'
  const welcomeMessage = {
    type: 'welcome',
    from: 'remote-peer',
    message: 'Hello!',
    timestamp: Date.now()
  }
  
  // Mock connection
  cli.connectionManager.connections.set(mockPeerId, {
    write: () => {} // Mock write method
  })
  
  const originalLength = cli.messageHistory.length
  cli.handleIncomingMessage({ peerId: mockPeerId, data: Buffer.from(JSON.stringify(welcomeMessage)) })
  
  t.is(cli.messageHistory.length, originalLength + 1, 'should add message to history')
  t.is(cli.messageHistory[cli.messageHistory.length - 1].type, 'welcome', 'should store message type')
  t.is(cli.messageHistory[cli.messageHistory.length - 1].peerId, mockPeerId, 'should store peer ID')
  
  t.teardown(async () => {
    await cli.shutdown()
  })
})

test('HyperswarmCLI - broadcast functionality', async function (t) {
  t.plan(3)
  
  const cli = new HyperswarmCLI({ name: 'test-broadcast' })
  
  let writeCallCount = 0
  let lastMessage = null
  
  // Mock multiple connections
  const mockConn1 = {
    write: (data) => { 
      writeCallCount++
      lastMessage = JSON.parse(data)
    }
  }
  const mockConn2 = {
    write: (data) => { 
      writeCallCount++
      lastMessage = JSON.parse(data)
    }
  }
  
  cli.connectionManager.connections.set('peer1', mockConn1)
  cli.connectionManager.connections.set('peer2', mockConn2)
  
  cli.broadcast('Test broadcast message')
  
  t.is(writeCallCount, 2, 'should send message to all connections')
  t.is(lastMessage.type, 'broadcast', 'should send broadcast type message')
  t.is(lastMessage.message, 'Test broadcast message', 'should include message content')
  
  t.teardown(async () => {
    await cli.shutdown()
  })
})

test('HyperswarmCLI - ping functionality', async function (t) {
  t.plan(2)
  
  const cli = new HyperswarmCLI({ name: 'test-ping' })
  
  let pingCount = 0
  let lastPingMessage = null
  
  // Mock connection
  const mockConn = {
    write: (data) => { 
      pingCount++
      lastPingMessage = JSON.parse(data)
    }
  }
  
  cli.connectionManager.connections.set('peer1', mockConn)
  
  cli.pingAllPeers()
  
  t.is(pingCount, 1, 'should send ping to connection')
  t.is(lastPingMessage.type, 'ping', 'should send ping type message')
  
  t.teardown(async () => {
    await cli.shutdown()
  })
})

test('HyperswarmCLI - user input handling', async function (t) {
  t.plan(7)
  
  const cli = new HyperswarmCLI({ name: 'test-input' })
  
  let broadcastCalled = false
  let pingCalled = false
  let statusShown = false
  let peersShown = false
  let helpShown = false
  let topicShown = false
  
  // Override methods to track calls
  cli.broadcast = () => { broadcastCalled = true }
  cli.pingAllPeers = () => { pingCalled = true }
  cli.showStatus = () => { statusShown = true }
  cli.showPeers = () => { peersShown = true }
  cli.showHelp = () => { helpShown = true }
  cli.showTopic = () => { topicShown = true }
  
  cli.handleUserInput({ input: '/ping' })
  cli.handleUserInput({ input: '/status' })
  cli.handleUserInput({ input: '/peers' })
  cli.handleUserInput({ input: '/help' })
  cli.handleUserInput({ input: '/topic' })
  cli.handleUserInput({ input: '/broadcast test message' })
  cli.handleUserInput({ input: '' }) // Should do nothing
  
  t.ok(pingCalled, 'should handle ping command')
  t.ok(statusShown, 'should handle status command')
  t.ok(peersShown, 'should handle peers command')
  t.ok(helpShown, 'should handle help command')
  t.ok(topicShown, 'should handle topic command')
  t.ok(broadcastCalled, 'should handle broadcast command')
  
  // Test regular message
  broadcastCalled = false
  cli.connectionManager.connections.set('test', { write: () => {} })
  cli.handleUserInput({ input: 'regular message' })
  t.ok(broadcastCalled, 'should broadcast regular messages when peers connected')
  
  t.teardown(async () => {
    await cli.shutdown()
  })
})

test('HyperswarmCLI - connection management', async function (t) {
  t.plan(3)
  
  const cli = new HyperswarmCLI({ name: 'test-connections' })
  
  // Simulate connection event
  const mockConn = {
    remotePublicKey: crypto.randomBytes(32),
    remoteAddress: '127.0.0.1:12345',
    on: () => {},
    write: () => {}
  }
  
  const mockInfo = { client: true }
  
  cli.handleConnection({ connection: mockConn, info: mockInfo })
  
  t.is(cli.connectionManager.getConnectionsSize(), 1, 'should add connection to connections map')
  
  const peerId = b4a.toString(mockConn.remotePublicKey, 'hex').substring(0, 8)
  const connections = cli.connectionManager.getConnections()
  t.ok(connections.has(peerId), 'should use correct peer ID as key')
  t.is(connections.get(peerId), mockConn, 'should store connection object')
  
  t.teardown(async () => {
    await cli.shutdown()
  })
})

test('HyperswarmCLI - showTopic method', async function (t) {
  t.plan(2)
  
  const cli = new HyperswarmCLI({ name: 'test-topic' })
  
  // Mock console.log to capture output
  let logOutput = ''
  const originalLog = console.log
  console.log = (msg) => { logOutput += msg + '\n' }
  
  // Test with no topic set
  cli.showTopic()
  t.ok(logOutput === '', 'should not log when no topic is set')
  
  // Test with topic set
  cli.topic = b4a.from('deadbeefcafebabe1234567890abcdef1234567890abcdef1234567890abcdef', 'hex')
  logOutput = ''
  cli.showTopic()
  t.ok(logOutput.includes('deadbeefcafebabe1234567890abcdef'), 'should display topic when set')
  
  console.log = originalLog
  
  t.teardown(async () => {
    await cli.shutdown()
  })
})

test('HyperswarmCLI - EventHandler stdin integration', async function (t) {
  t.plan(4)
  
  const cli = new HyperswarmCLI({ name: 'test-stdin' })
  
  let helpCalled = false
  let broadcastCalled = false
  let pingCalled = false
  
  // Override methods to track calls
  cli.uiDisplay.showHelp = () => { helpCalled = true }
  cli.broadcast = () => { broadcastCalled = true }
  cli.pingAllPeers = () => { pingCalled = true }
  
  // Add a mock connection for broadcast test
  cli.connectionManager.connections.set('test-peer', { write: () => {} })
  
  // Test that EventHandler emits userInput events and CLI handles them
  cli.eventHandler.emit('userInput', { input: '/help' })
  cli.eventHandler.emit('userInput', { input: '/ping' })
  cli.eventHandler.emit('userInput', { input: 'hello world' })
  cli.eventHandler.emit('userInput', { input: '' }) // Should do nothing
  
  t.ok(helpCalled, 'should handle /help command via EventEmitter')
  t.ok(pingCalled, 'should handle /ping command via EventEmitter')
  t.ok(broadcastCalled, 'should handle regular messages via EventEmitter')
  
  // Test that the event listener is properly set up
  t.ok(cli.eventHandler.listenerCount('userInput') > 0, 'should have userInput event listener registered')
  
  t.teardown(async () => {
    await cli.shutdown()
  })
})