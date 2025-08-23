import test from 'brittle'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import HyperswarmCLI from '../../index.js'

test('HyperswarmCLI - constructor initialization', async function (t) {
  t.plan(6)
  
  const cli = new HyperswarmCLI({
    mode: 'server',
    name: 'test-cli',
    topic: 'deadbeef'
  })
  
  t.is(cli.mode, 'server', 'should set mode correctly')
  t.is(cli.name, 'test-cli', 'should set name correctly')
  t.is(cli.topic, 'deadbeef', 'should set topic correctly')
  t.ok(cli.logger, 'should initialize logger')
  t.ok(cli.swarm, 'should initialize swarm')
  t.ok(cli.connections instanceof Map, 'should initialize connections Map')
  
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
  cli.connections.set(mockPeerId, {
    write: () => {} // Mock write method
  })
  
  const originalLength = cli.messageHistory.length
  cli.handleIncomingMessage(mockPeerId, Buffer.from(JSON.stringify(welcomeMessage)))
  
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
  
  cli.connections.set('peer1', mockConn1)
  cli.connections.set('peer2', mockConn2)
  
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
  
  cli.connections.set('peer1', mockConn)
  
  cli.pingAllPeers()
  
  t.is(pingCount, 1, 'should send ping to connection')
  t.is(lastPingMessage.type, 'ping', 'should send ping type message')
  
  t.teardown(async () => {
    await cli.shutdown()
  })
})

test('HyperswarmCLI - user input handling', async function (t) {
  t.plan(6)
  
  const cli = new HyperswarmCLI({ name: 'test-input' })
  
  let broadcastCalled = false
  let pingCalled = false
  let statusShown = false
  let peersShown = false
  let helpShown = false
  
  // Override methods to track calls
  cli.broadcast = () => { broadcastCalled = true }
  cli.pingAllPeers = () => { pingCalled = true }
  cli.showStatus = () => { statusShown = true }
  cli.showPeers = () => { peersShown = true }
  cli.showHelp = () => { helpShown = true }
  
  cli.handleUserInput('/ping')
  cli.handleUserInput('/status')
  cli.handleUserInput('/peers')
  cli.handleUserInput('/help')
  cli.handleUserInput('/broadcast test message')
  cli.handleUserInput('') // Should do nothing
  
  t.ok(pingCalled, 'should handle ping command')
  t.ok(statusShown, 'should handle status command')
  t.ok(peersShown, 'should handle peers command')
  t.ok(helpShown, 'should handle help command')
  t.ok(broadcastCalled, 'should handle broadcast command')
  
  // Test regular message
  broadcastCalled = false
  cli.connections.set('test', { write: () => {} })
  cli.handleUserInput('regular message')
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
  
  cli.handleConnection(mockConn, mockInfo)
  
  t.is(cli.connections.size, 1, 'should add connection to connections map')
  
  const peerId = b4a.toString(mockConn.remotePublicKey, 'hex').substring(0, 8)
  t.ok(cli.connections.has(peerId), 'should use correct peer ID as key')
  t.is(cli.connections.get(peerId), mockConn, 'should store connection object')
  
  t.teardown(async () => {
    await cli.shutdown()
  })
})