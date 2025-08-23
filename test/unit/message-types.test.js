import test from 'brittle'

test('Message Types - welcome message structure', async function (t) {
  t.plan(4)
  
  const welcomeMessage = {
    type: 'welcome',
    from: 'test-peer',
    message: 'Hello from test-peer!',
    timestamp: Date.now()
  }
  
  t.is(welcomeMessage.type, 'welcome', 'should have welcome type')
  t.is(typeof welcomeMessage.from, 'string', 'should have from field as string')
  t.is(typeof welcomeMessage.message, 'string', 'should have message field as string')
  t.is(typeof welcomeMessage.timestamp, 'number', 'should have timestamp as number')
})

test('Message Types - chat message structure', async function (t) {
  t.plan(4)
  
  const chatMessage = {
    type: 'chat',
    from: 'alice',
    message: 'Hello everyone!',
    timestamp: Date.now()
  }
  
  t.is(chatMessage.type, 'chat', 'should have chat type')
  t.is(chatMessage.from, 'alice', 'should have correct sender')
  t.is(chatMessage.message, 'Hello everyone!', 'should have correct message')
  t.ok(chatMessage.timestamp > 0, 'should have valid timestamp')
})

test('Message Types - broadcast message structure', async function (t) {
  t.plan(4)
  
  const broadcastMessage = {
    type: 'broadcast',
    from: 'broadcaster',
    message: 'Important announcement',
    timestamp: Date.now()
  }
  
  t.is(broadcastMessage.type, 'broadcast', 'should have broadcast type')
  t.is(typeof broadcastMessage.from, 'string', 'should have from field')
  t.ok(broadcastMessage.message.length > 0, 'should have non-empty message')
  t.is(typeof broadcastMessage.timestamp, 'number', 'should have timestamp')
})

test('Message Types - ping message structure', async function (t) {
  t.plan(3)
  
  const pingMessage = {
    type: 'ping',
    from: 'pinger',
    timestamp: Date.now()
  }
  
  t.is(pingMessage.type, 'ping', 'should have ping type')
  t.is(typeof pingMessage.from, 'string', 'should have from field')
  t.is(typeof pingMessage.timestamp, 'number', 'should have timestamp')
})

test('Message Types - pong message structure', async function (t) {
  t.plan(4)
  
  const originalPingTime = Date.now() - 100
  const pongMessage = {
    type: 'pong',
    from: 'ponger',
    originalTimestamp: originalPingTime,
    timestamp: Date.now()
  }
  
  t.is(pongMessage.type, 'pong', 'should have pong type')
  t.is(typeof pongMessage.from, 'string', 'should have from field')
  t.is(typeof pongMessage.originalTimestamp, 'number', 'should have original timestamp')
  t.ok(pongMessage.timestamp > pongMessage.originalTimestamp, 'should have later timestamp than original')
})

test('Message Types - JSON serialization and deserialization', async function (t) {
  t.plan(8)
  
  const originalMessage = {
    type: 'broadcast',
    from: 'test-peer',
    message: 'Test message with special chars: 🚀 💬 📡',
    timestamp: Date.now()
  }
  
  // Test serialization
  const serialized = JSON.stringify(originalMessage)
  t.ok(typeof serialized === 'string', 'should serialize to string')
  t.ok(serialized.includes('"type":"broadcast"'), 'should include type in JSON')
  t.ok(serialized.includes('🚀'), 'should preserve emoji characters')
  
  // Test deserialization
  const deserialized = JSON.parse(serialized)
  t.is(deserialized.type, originalMessage.type, 'should preserve type')
  t.is(deserialized.from, originalMessage.from, 'should preserve from field')
  t.is(deserialized.message, originalMessage.message, 'should preserve message with emojis')
  t.is(deserialized.timestamp, originalMessage.timestamp, 'should preserve timestamp')
  t.alike(deserialized, originalMessage, 'should be identical after round-trip')
})

test('Message Types - message validation', async function (t) {
  t.plan(6)
  
  function validateMessage(msg) {
    if (!msg.type) return false
    if (!msg.from) return false
    if (!msg.timestamp || typeof msg.timestamp !== 'number') return false
    
    switch (msg.type) {
      case 'welcome':
      case 'chat':
      case 'broadcast':
        return typeof msg.message === 'string' && msg.message.length > 0
      case 'ping':
        return true
      case 'pong':
        return typeof msg.originalTimestamp === 'number'
      default:
        return false
    }
  }
  
  const validWelcome = { type: 'welcome', from: 'peer', message: 'hello', timestamp: Date.now() }
  const validPing = { type: 'ping', from: 'peer', timestamp: Date.now() }
  const validPong = { type: 'pong', from: 'peer', originalTimestamp: Date.now() - 100, timestamp: Date.now() }
  
  const invalidNoType = { from: 'peer', message: 'hello', timestamp: Date.now() }
  const invalidNoFrom = { type: 'welcome', message: 'hello', timestamp: Date.now() }
  const invalidNoTimestamp = { type: 'welcome', from: 'peer', message: 'hello' }
  
  t.ok(validateMessage(validWelcome), 'should validate welcome message')
  t.ok(validateMessage(validPing), 'should validate ping message')
  t.ok(validateMessage(validPong), 'should validate pong message')
  
  t.absent(validateMessage(invalidNoType), 'should reject message without type')
  t.absent(validateMessage(invalidNoFrom), 'should reject message without from')
  t.absent(validateMessage(invalidNoTimestamp), 'should reject message without timestamp')
})

test('Message Types - edge cases and malformed data', async function (t) {
  t.plan(4)
  
  // Test parsing invalid JSON
  let threwError = false
  try {
    JSON.parse('invalid json')
  } catch (error) {
    threwError = error instanceof SyntaxError
  }
  t.ok(threwError, 'should throw SyntaxError on invalid JSON')
  
  // Test empty message
  const emptyMessage = { type: 'chat', from: 'peer', message: '', timestamp: Date.now() }
  t.is(emptyMessage.message, '', 'should handle empty message string')
  
  // Test very long message  
  const longMessage = { 
    type: 'broadcast', 
    from: 'peer', 
    message: 'x'.repeat(10000), 
    timestamp: Date.now() 
  }
  t.is(longMessage.message.length, 10000, 'should handle long messages')
  
  // Test message with null values
  const nullMessage = { type: 'chat', from: null, message: null, timestamp: null }
  t.not(typeof nullMessage.from, 'string', 'should handle null values in from field')
})