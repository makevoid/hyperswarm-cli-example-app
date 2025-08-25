import test from 'brittle'
import { spawn } from 'child_process'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import { delay } from 'es-toolkit'

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
    return new Promise(async (resolve, reject) => {
      this.process = spawn('node', ['main.js', ...this.args], {
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
      try {
        await delay(1000)
        if (this.isRunning) {
          resolve(this)
        } else {
          reject(new Error(`Process failed to start: ${this.errorOutput}`))
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  async stop() {
    if (this.process && this.isRunning) {
      this.process.kill('SIGTERM')
      await delay(1000)
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
    
    await delay(2000)
    
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
  
  const peer1 = new TestProcess(['--mode', 'peer', '--name', 'test-peer1', '--topic', topic])
  const peer2 = new TestProcess(['--mode', 'peer', '--name', 'test-peer2', '--topic', topic])
  
  try {
    // Start first peer
    await peer1.start()
    t.ok(peer1.isRunning, 'first peer should start successfully')
    
    await delay(2000)
    
    // Start second peer
    await peer2.start()
    t.ok(peer2.isRunning, 'second peer should start successfully')
    
    await delay(3000)
    
    // Check first peer received connection
    t.ok(peer1.hasOutput('New connection from peer'), 'first peer should receive connection')
    t.ok(peer1.hasOutput('Welcome message from test-peer2'), 'first peer should receive welcome message')
    
    // Check second peer connected
    t.ok(peer2.hasOutput('New connection from peer'), 'second peer should establish connection')
    
  } finally {
    await Promise.all([peer2.stop(), peer1.stop()])
  }
})

test('E2E - three peer mesh network', async function (t) {
  t.plan(6)
  t.timeout(25000)

  const topic = b4a.toString(crypto.randomBytes(32), 'hex')
  
  const peer1 = new TestProcess(['--mode', 'peer', '--name', 'peer-1', '--topic', topic])
  const peer2 = new TestProcess(['--mode', 'peer', '--name', 'peer-2', '--topic', topic])  
  const peer3 = new TestProcess(['--mode', 'peer', '--name', 'peer-3', '--topic', topic])
  
  try {
    // Start peers sequentially 
    await peer1.start()
    t.ok(peer1.isRunning, 'peer-1 should start successfully')
    
    await delay(2000)
    
    await peer2.start()
    t.ok(peer2.isRunning, 'peer-2 should start successfully')
    
    await delay(2000)
    
    await peer3.start()
    t.ok(peer3.isRunning, 'peer-3 should start successfully')
    
    await delay(4000)
    
    // Check connections were established
    t.ok(peer1.hasOutput('New connection from peer'), 'peer-1 should have connections')
    t.ok(peer2.hasOutput('New connection from peer'), 'peer-2 should have connections')
    t.ok(peer3.hasOutput('New connection from peer'), 'peer-3 should have connections')
    
  } finally {
    await Promise.all([peer1.stop(), peer2.stop(), peer3.stop()])
  }
})

test('E2E - error handling for invalid topic', async function (t) {
  t.plan(2)
  t.timeout(10000)

  const peer = new TestProcess(['--mode', 'peer', '--topic', 'invalid-topic'])
  
  try {
    await peer.start()
    t.ok(peer.isRunning, 'peer should start even with invalid topic')
    
    await delay(3000)
    
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
    
    await delay(2000)
    
    // Send SIGTERM
    peer.process.kill('SIGTERM')
    
    await delay(2000)
    
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

  // Helper function to run command and capture output
  const runCommand = (args) => {
    return new Promise((resolve) => {
      const process = spawn('node', ['main.js', ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      let output = ''
      process.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      process.on('close', () => {
        resolve(output)
      })
    })
  }

  // Run both commands in parallel
  const [helpOutput, versionOutput] = await Promise.all([
    runCommand(['--help']),
    runCommand(['--version'])
  ])
  
  t.ok(helpOutput.includes('Hyperswarm CLI'), 'help should show application name')
  t.ok(helpOutput.includes('Usage:'), 'help should show usage information')
  t.ok(versionOutput.includes('Hyperswarm CLI'), 'version should show application name')
  t.ok(versionOutput.includes('v1.0.0'), 'version should show version number')
})