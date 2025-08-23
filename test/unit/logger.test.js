import test from 'brittle'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Logger from '../../logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('Logger - constructor and initialization', async function (t) {
  t.plan(4)
  
  const logger = new Logger({ name: 'test-logger' })
  
  t.is(logger.name, 'test-logger', 'should set logger name correctly')
  t.is(logger.logFile, 'log/test-logger.log', 'should set log file name correctly')
  t.ok(typeof logger.colors === 'object', 'should initialize colors object')
  t.ok(Object.keys(logger.colors).length > 0, 'should have color definitions')
})

test('Logger - default name generation', async function (t) {
  t.plan(2)
  
  const logger = new Logger()
  
  t.is(logger.name, 'app', 'should use default name "app"')
  t.is(logger.logFile, 'log/app.log', 'should use default log file name')
})

test('Logger - message formatting', async function (t) {
  t.plan(3)
  
  const logger = new Logger({ name: 'test' })
  const message = logger._formatMessage({ level: 'info', message: 'test message', data: { data: 'value' } })
  
  t.ok(message.includes('[TEST]'), 'should include uppercase logger name')
  t.ok(message.includes('[INFO]'), 'should include uppercase log level')
  t.ok(message.includes('test message'), 'should include the message text')
})

test('Logger - file writing', async function (t) {
  const tmpDir = await t.tmp()
  const testLogFile = path.join(tmpDir, 'test-write.log')
  
  const logger = new Logger({ name: 'test-write' })
  logger.logFile = testLogFile
  
  logger._writeToFile({ message: 'test log message' })
  
  const content = fs.readFileSync(testLogFile, 'utf8')
  t.ok(content.includes('test log message'), 'should write message to file')
  
  t.teardown(() => {
    try { fs.unlinkSync(testLogFile) } catch {}
  })
})

test('Logger - log levels', async function (t) {
  t.plan(7)
  
  const tmpDir = await t.tmp()
  const testLogFile = path.join(tmpDir, 'test-levels.log')
  
  const logger = new Logger({ name: 'test-levels' })
  logger.logFile = testLogFile
  
  // Capture console output
  let consoleOutput = ''
  const originalLog = console.log
  console.log = (msg) => { consoleOutput += msg + '\n' }
  
  logger.info('info message')
  logger.success('success message')
  logger.warn('warn message') 
  logger.error('error message')
  logger.debug('debug message')
  logger.peer('peer message')
  logger.connection('connection message')
  
  console.log = originalLog
  
  // Check console output contains all messages
  t.ok(consoleOutput.includes('info message'), 'should log info to console')
  t.ok(consoleOutput.includes('success message'), 'should log success to console')
  t.ok(consoleOutput.includes('warn message'), 'should log warn to console')
  t.ok(consoleOutput.includes('error message'), 'should log error to console')
  t.ok(consoleOutput.includes('debug message'), 'should log debug to console')
  t.ok(consoleOutput.includes('peer message'), 'should log peer to console')
  t.ok(consoleOutput.includes('connection message'), 'should log connection to console')
  
  t.teardown(() => {
    try { fs.unlinkSync(testLogFile) } catch {}
  })
})

test('Logger - data object logging', async function (t) {
  t.plan(2)
  
  const tmpDir = await t.tmp()
  const testLogFile = path.join(tmpDir, 'test-data.log')
  
  const logger = new Logger({ name: 'test-data' })
  logger.logFile = testLogFile
  
  let consoleOutput = ''
  const originalLog = console.log
  console.log = (msg) => { consoleOutput += msg + '\n' }
  
  logger.info('test with data', { key: 'value', num: 42 })
  
  console.log = originalLog
  
  t.ok(consoleOutput.includes('test with data'), 'should include message text')
  t.ok(consoleOutput.includes('"key":"value"'), 'should include JSON data')
  
  t.teardown(() => {
    try { fs.unlinkSync(testLogFile) } catch {}
  })
})

test('Logger - separator method', async function (t) {
  t.plan(1)
  
  const logger = new Logger({ name: 'test-sep' })
  
  let consoleOutput = ''
  const originalLog = console.log
  console.log = (msg) => { consoleOutput += msg + '\n' }
  
  logger.separator()
  
  console.log = originalLog
  
  t.ok(consoleOutput.includes('─'), 'should output separator line')
})

test('Logger - file write error handling', async function (t) {
  t.plan(1)
  
  const logger = new Logger({ name: 'test-error' })
  logger.logFile = '/invalid/path/test.log' // Invalid path
  
  let errorOutput = ''
  const originalError = console.error
  console.error = (msg) => { errorOutput += msg + '\n' }
  
  logger._writeToFile({ message: 'test message' })
  
  console.error = originalError
  
  t.ok(errorOutput.includes('Failed to write to log file'), 'should handle file write errors gracefully')
})