import test from 'brittle'
import { spawn } from 'child_process'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import { setTimeout } from 'timers/promises'

class TestProcess {
  constructor(args, timeout = 10000) {
    this.args = args
    this.timeout = timeout
    this.process = null
    this.output = ''
    this.errorOutput = ''
    this.isRunning = false
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.process = spawn('node', ['index.js', ...this.args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      })

      this.isRunning = true
      
      this.process.stdout.on('data', (data) => {
        this.output += data.toString()
      })

      this.process.stderr.on('data', (data) => {
        this.errorOutput += data.toString()
      })

      this.process.on('close', (code) => {
        this.isRunning = false
      })

      this.process.on('error', (err) => {
        this.isRunning = false
        reject(err)
      })

      // Wait a bit for the process to start
      setTimeout(1000).then(() => {
        if (this.isRunning) {
          resolve(this)
        } else {
          reject(new Error(`Process failed to start: ${this.errorOutput}`))
        }
      })
    })
  }

  async stop() {
    if (this.process && this.isRunning) {
      this.process.kill('SIGTERM')
      await setTimeout(1000)
      if (this.isRunning) {
        this.process.kill('SIGKILL')
      }
    }
  }

  getOutput() {
    return this.output
  }

  getErrorOutput() {
    return this.errorOutput
  }

  hasOutput(text) {
    return this.output.includes(text)
  }
}

test('E2E - single peer startup and shutdown', async function (t) {
  t.plan(3)
  t.timeout(15000)

  const peer = new TestProcess(['--mode', 'peer', '--name', 'test-peer'])
  
  try {
    await peer.start()
    t.ok(peer.isRunning, 'peer should start successfully')
    
    await setTimeout(2000)
    
    t.ok(peer.hasOutput('Starting Hyperswarm CLI in peer mode'), 'should log startup message')
    t.ok(peer.hasOutput('Successfully joined swarm'), 'should join swarm successfully')
    
  } finally {
    await peer.stop()
  }
})

test('E2E - server and client connection', async function (t) {
  t.plan(5)
  t.timeout(20000)

  const topic = b4a.toString(crypto.randomBytes(32), 'hex')
  
  const server = new TestProcess(['--mode', 'server', '--name', 'test-server', '--topic', topic])
  const client = new TestProcess(['--mode', 'client', '--name', 'test-client', '--topic', topic])
  
  try {
    // Start server first
    await server.start()
    t.ok(server.isRunning, 'server should start successfully')
    
    await setTimeout(2000)
    
    // Start client
    await client.start()
    t.ok(client.isRunning, 'client should start successfully')
    
    await setTimeout(3000)
    
    // Check server received connection
    t.ok(server.hasOutput('New connection from peer'), 'server should receive connection')
    t.ok(server.hasOutput('Welcome message from test-client'), 'server should receive welcome message')
    
    // Check client connected
    t.ok(client.hasOutput('got connection'), 'client should establish connection')
    
  } finally {
    await client.stop()
    await server.stop()
  }
})

test('E2E - three peer mesh network', async function (t) {
  t.plan(6)
  t.timeout(25000)

  const topic = b4a.toString(crypto.randomBytes(32), 'hex')
  
  const peer1 = new TestProcess(['--mode', 'peer', '--name', 'peer-1', '--topic', topic])
  const peer2 = new TestProcess(['--mode', 'peer', '--name', 'peer-2', '--topic', topic])  
  const peer3 = new TestProcess(['--mode', 'client', '--name', 'peer-3', '--topic', topic])
  
  try {
    // Start peers sequentially 
    await peer1.start()
    t.ok(peer1.isRunning, 'peer-1 should start successfully')
    
    await setTimeout(2000)
    
    await peer2.start()
    t.ok(peer2.isRunning, 'peer-2 should start successfully')
    
    await setTimeout(2000)
    
    await peer3.start()
    t.ok(peer3.isRunning, 'peer-3 should start successfully')
    
    await setTimeout(4000)
    
    // Check connections were established
    t.ok(peer1.hasOutput('New connection from peer'), 'peer-1 should have connections')
    t.ok(peer2.hasOutput('New connection from peer'), 'peer-2 should have connections')
    t.ok(peer3.hasOutput('got connection'), 'peer-3 should have connections')
    
  } finally {
    await peer3.stop()
    await peer2.stop()
    await peer1.stop()
  }
})

test('E2E - error handling for invalid topic', async function (t) {
  t.plan(2)
  t.timeout(10000)

  const peer = new TestProcess(['--mode', 'client', '--topic', 'invalid-topic'])
  
  try {
    await peer.start()
    t.ok(peer.isRunning, 'peer should start even with invalid topic')
    
    await setTimeout(3000)
    
    // Should still attempt to join swarm (hyperswarm handles invalid topics gracefully)
    t.ok(peer.hasOutput('Joining swarm'), 'should attempt to join swarm')
    
  } finally {
    await peer.stop()
  }
})

test('E2E - graceful shutdown on SIGTERM', async function (t) {
  t.plan(3)
  t.timeout(10000)

  const peer = new TestProcess(['--mode', 'peer', '--name', 'shutdown-test'])
  
  try {
    await peer.start()
    t.ok(peer.isRunning, 'peer should start successfully')
    
    await setTimeout(2000)
    
    // Send SIGTERM
    peer.process.kill('SIGTERM')
    
    await setTimeout(2000)
    
    t.absent(peer.isRunning, 'peer should stop after SIGTERM')
    t.ok(peer.hasOutput('Shutting down'), 'should log shutdown message')
    
  } finally {
    if (peer.isRunning) {
      await peer.stop()
    }
  }
})

test('E2E - help and version commands', async function (t) {
  t.plan(4)
  t.timeout(10000)

  // Test help command
  const helpProcess = spawn('node', ['index.js', '--help'], {
    stdio: ['pipe', 'pipe', 'pipe']
  })
  
  let helpOutput = ''
  helpProcess.stdout.on('data', (data) => {
    helpOutput += data.toString()
  })
  
  await new Promise((resolve) => {
    helpProcess.on('close', resolve)
  })
  
  t.ok(helpOutput.includes('Hyperswarm CLI'), 'help should show application name')
  t.ok(helpOutput.includes('Usage:'), 'help should show usage information')
  
  // Test version command
  const versionProcess = spawn('node', ['index.js', '--version'], {
    stdio: ['pipe', 'pipe', 'pipe']
  })
  
  let versionOutput = ''
  versionProcess.stdout.on('data', (data) => {
    versionOutput += data.toString()
  })
  
  await new Promise((resolve) => {
    versionProcess.on('close', resolve)
  })
  
  t.ok(versionOutput.includes('Hyperswarm CLI'), 'version should show application name')
  t.ok(versionOutput.includes('v1.0.0'), 'version should show version number')
})