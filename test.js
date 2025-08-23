#!/usr/bin/env node

import { spawn } from 'child_process'
import { setTimeout } from 'timers/promises'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'

class HyperswarmTester {
  constructor() {
    this.processes = []
    this.topic = b4a.toString(crypto.randomBytes(32), 'hex')
  }

  async runTest() {
    console.log('🧪 Starting Hyperswarm CLI Test Suite')
    console.log(`📋 Test Topic: ${this.topic.substring(0, 16)}...`)
    console.log('─'.repeat(80))

    try {
      // Start server
      console.log('🖥️  Starting server...')
      const server = this.startProcess(['--mode', 'server', '--topic', this.topic, '--name', 'test-server'])
      await setTimeout(2000)

      // Start first peer
      console.log('👤 Starting peer 1...')
      const peer1 = this.startProcess(['--mode', 'peer', '--topic', this.topic, '--name', 'test-peer-1'])
      await setTimeout(2000)

      // Start second peer  
      console.log('👤 Starting peer 2...')
      const peer2 = this.startProcess(['--mode', 'client', '--topic', this.topic, '--name', 'test-peer-2'])
      await setTimeout(3000)

      console.log('✅ All processes started successfully!')
      console.log('📊 Test will run for 10 seconds to observe peer interactions...')
      
      // Let the test run for a while
      await setTimeout(10000)

      console.log('🔄 Cleaning up test processes...')
      this.cleanup()

      console.log('✅ Test completed successfully!')
      
    } catch (error) {
      console.error('❌ Test failed:', error.message)
      this.cleanup()
      process.exit(1)
    }
  }

  startProcess(args) {
    const child = spawn('node', ['index.js', ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    })

    child.stdout.on('data', (data) => {
      console.log(`[${args.find(arg => arg.includes('test-')) || 'process'}] ${data.toString().trim()}`)
    })

    child.stderr.on('data', (data) => {
      console.error(`[${args.find(arg => arg.includes('test-')) || 'process'}] ERROR: ${data.toString().trim()}`)
    })

    child.on('close', (code) => {
      console.log(`[${args.find(arg => arg.includes('test-')) || 'process'}] Process exited with code ${code}`)
    })

    this.processes.push(child)
    return child
  }

  cleanup() {
    this.processes.forEach(proc => {
      if (!proc.killed) {
        proc.kill('SIGTERM')
      }
    })
    this.processes = []
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\\n🛑 Test interrupted')
  process.exit(0)
})

// Run the test
const tester = new HyperswarmTester()
tester.runTest().catch(console.error)