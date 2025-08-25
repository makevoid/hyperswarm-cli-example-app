import test from 'brittle'
import minimist from 'minimist'

function parseArgs(argv) {
  const args = minimist(argv, {
    string: ['mode', 'topic', 'name', 'port'],
    boolean: ['help', 'version'],
    alias: {
      h: 'help',
      v: 'version',
      m: 'mode',
      t: 'topic',
      n: 'name',
      p: 'port'
    },
    default: {
      mode: 'peer'
    }
  })

  return args
}

test('CLI Args - default values', async function (t) {
  t.plan(2)
  
  const args = parseArgs([])
  
  t.is(args.mode, 'peer', 'should default to peer mode')
  t.absent(args.topic, 'should not have default topic')
})

test('CLI Args - mode parsing', async function (t) {
  t.plan(3)
  
  const peerArgs1 = parseArgs(['--mode', 'peer'])
  const peerArgs2 = parseArgs(['-m', 'peer'])
  const peerArgs3 = parseArgs(['peer'])
  
  t.is(peerArgs1.mode, 'peer', 'should parse peer mode with --mode')
  t.is(peerArgs2.mode, 'peer', 'should parse peer mode with -m alias')
  t.is(peerArgs3._[0], 'peer', 'should capture positional mode argument')
})

test('CLI Args - topic parsing', async function (t) {
  t.plan(2)
  
  const topicArgs = parseArgs(['--topic', 'deadbeef'])
  const topicAliasArgs = parseArgs(['-t', 'cafebabe'])
  
  t.is(topicArgs.topic, 'deadbeef', 'should parse topic with --topic')
  t.is(topicAliasArgs.topic, 'cafebabe', 'should parse topic with -t alias')
})

test('CLI Args - name parsing', async function (t) {
  t.plan(2)
  
  const nameArgs = parseArgs(['--name', 'test-peer'])
  const nameAliasArgs = parseArgs(['-n', 'alice'])
  
  t.is(nameArgs.name, 'test-peer', 'should parse name with --name')
  t.is(nameAliasArgs.name, 'alice', 'should parse name with -n alias')
})

test('CLI Args - boolean flags', async function (t) {
  t.plan(4)
  
  const helpArgs = parseArgs(['--help'])
  const helpAliasArgs = parseArgs(['-h'])
  const versionArgs = parseArgs(['--version'])
  const versionAliasArgs = parseArgs(['-v'])
  
  t.ok(helpArgs.help, 'should parse --help flag')
  t.ok(helpAliasArgs.help, 'should parse -h alias')
  t.ok(versionArgs.version, 'should parse --version flag')
  t.ok(versionAliasArgs.version, 'should parse -v alias')
})

test('CLI Args - complex argument combinations', async function (t) {
  t.plan(4)
  
  const complexArgs = parseArgs([
    '--mode', 'peer',
    '--name', 'test-peer',
    '--topic', 'deadbeefcafebabe1234567890abcdef',
    '--port', '3000'
  ])
  
  t.is(complexArgs.mode, 'peer', 'should parse mode in complex args')
  t.is(complexArgs.name, 'test-peer', 'should parse name in complex args')
  t.is(complexArgs.topic, 'deadbeefcafebabe1234567890abcdef', 'should parse topic in complex args')
  t.is(complexArgs.port, '3000', 'should parse port in complex args')
})

test('CLI Args - positional arguments', async function (t) {
  t.plan(3)
  
  const positionalArgs = parseArgs(['peer', 'extra', 'args'])
  
  t.is(positionalArgs._[0], 'peer', 'should capture first positional arg')
  t.is(positionalArgs._[1], 'extra', 'should capture second positional arg')
  t.is(positionalArgs._[2], 'args', 'should capture third positional arg')
})

test('CLI Args - mixed positional and named args', async function (t) {
  t.plan(3)
  
  const mixedArgs = parseArgs(['peer', '--name', 'test-peer', 'extra'])
  
  t.is(mixedArgs._[0], 'peer', 'should capture positional arg')
  t.is(mixedArgs.name, 'test-peer', 'should parse named arg')
  t.is(mixedArgs._[1], 'extra', 'should capture extra positional arg')
})