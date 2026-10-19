// Usage: node tools/make-manifest.js client > client/manifest.json
// Le dossier client contient mods/, kubejs/, config/, etc. (ce que les joueurs doivent avoir).
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const root = path.resolve(process.argv[2] || 'client')
const settings = fs.existsSync(path.join(root, '..', 'launcher-settings.json'))
  ? JSON.parse(fs.readFileSync(path.join(root, '..', 'launcher-settings.json'), 'utf8')) : {}
function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name)
    return e.isDirectory() ? walk(p) : [p]
  })
}
const files = walk(root).filter((p) => path.basename(p) !== 'manifest.json' || path.dirname(p) !== root).map((p) => {
  const rel = path.relative(root, p).split(path.sep).join('/')
  const buf = fs.readFileSync(p)
  return {
    path: rel,
    sha1: crypto.createHash('sha1').update(buf).digest('hex'),
    size: buf.length,
    ...(rel.startsWith('config/') && settings.configOnce !== false ? { once: true } : {}),
  }
}).sort((a, b) => a.path.localeCompare(b.path))
console.log(JSON.stringify({
  version: new Date().toISOString(),
  minecraft: settings.minecraft || '1.21.1',
  neoforge: settings.neoforge || '21.1.259',
  managed: settings.managed || ['mods', 'kubejs', 'shaderpacks', 'resourcepacks'],
  server: settings.server || '',
  files,
}, null, 1))
