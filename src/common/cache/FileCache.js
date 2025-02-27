const debug = require('debug')('prismarine-auth')
const { createHash } = require('../Util')
const { join } = require('path')
const fs = require('fs')

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000

class FileCache {
  constructor (cacheLocation) {
    this.cacheLocation = cacheLocation
    this.validCheckBufferPeriod = 1000
  }

  static async createForIdentifier (cacheDir, cacheName, identifier) {
    const hash = createHash(identifier)
    const cacheLocationWithHash = join(cacheDir, `./${hash}_${cacheName}.json`)
    return new FileCache(cacheLocationWithHash)
  }

  async reset () {
    const cached = {}
    fs.writeFileSync(this.cacheLocation, JSON.stringify(cached))
    return cached
  }

  async loadInitialValue () {
    try {
      return JSON.parse(fs.readFileSync(this.cacheLocation, 'utf8'))
    } catch (e) {
      return this.reset()
    }
  }

  async getCached () {
    if (this.cache === undefined) {
      this.cache = await this.loadInitialValue()
    }

    return this.cache
  }

  async setCached (cached) {
    this.cache = cached
    fs.writeFileSync(this.cacheLocation, JSON.stringify(this.cache))
  }

  async setCachedPartial (cached) {
    await this.setCached({
      ...this.cache,
      ...cached
    })
  }

  async set (key, value, { obtainedOn, expiresOn } = {}) {
    expiresOn ||= Date.now() + ONE_MONTH_MS
    obtainedOn ||= Date.now()
    await this.setCachedPartial({
      [key]: {
        value,
        obtainedOn,
        expiresOn
      }
    })
  }

  async setPartial (key, value, options) {
    const current = await this.get(key)
    return this.set(key, { ...current, ...value }, options)
  }

  async get (key) {
    const cache = await this.getCached()
    if (!cache || !cache[key]) return
    const { value, expiresOn } = cache[key]
    return {
      value,
      valid: !expiresOn || expiresOn > (Date.now() + this.validCheckBufferPeriod),
      expiresOn
    }
  }

  cleanupExpired () {
    const cache = this.cache
    const now = Date.now()
    const newCache = {}
    for (const key in cache) {
      const entry = cache[key]
      if (entry.expiresOn) {
        if (entry.expiresOn > now) {
          newCache[key] = cache[key]
        }
      } else {
        debug('No expiry date for cache entry', key, 'in', this.cacheLocation, '. Setting to 30 days.')
        newCache[key].expiresOn = now + ONE_MONTH_MS
      }
    }
    this.cache = newCache
    fs.writeFileSync(this.cacheLocation, JSON.stringify(this.cache))
  }

  isEmpty () {
    return Object.keys(this.cache).length === 0
  }
}

function getCaches (cacheDir) {
  return fs.readdirSync(cacheDir)
    .filter(file => file.endsWith('.json'))
    .map(file => new FileCache(`${cacheDir}/${file}`))
}

function createFileSystemCache (cacheDir, validCacheIds) {
  debug(`Using cache path: ${cacheDir}`)

  try {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }
  } catch (e) {
    console.log('Failed to open cache dir', e, ' ... will use current dir')
    cacheDir = __dirname
  }

  return {
    createCache ({ cacheName, username }) {
      if (!validCacheIds.includes(cacheName)) {
        throw new Error(`Cannot instantiate cache for unknown cache: '${cacheName}'`)
      }
      return FileCache.createForIdentifier(cacheDir, cacheName, username)
    },
    hasCache (cacheName, identifier) {
      const hash = createHash(identifier)
      const cacheLocationWithHash = join(cacheDir, `./${hash}_${cacheName}.json`)
      return fs.existsSync(cacheLocationWithHash)
    },
    deleteCache (cacheName, identifier) {
      const hash = createHash(identifier)
      const cacheLocationWithHash = join(cacheDir, `./${hash}_${cacheName}.json`)
      fs.unlinkSync(cacheLocationWithHash)
    },
    deleteCaches (identifier) {
      for (const cacheName of validCacheIds) {
        this.deleteCache(cacheName, identifier)
      }
    },
    cleanup () {
      const caches = getCaches(cacheDir)
      for (const cache of caches) {
        cache.cleanupExpired()
        if (cache.isEmpty()) {
          fs.unlinkSync(cache.cacheLocation)
        }
      }
    }
  }
}

module.exports = { createFileSystemCache }
