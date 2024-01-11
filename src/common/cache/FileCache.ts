const fs = require('fs')

class FileCache {
  cacheLocation: string
  cache?: any | undefined

  constructor (cacheLocation: string) {
    this.cacheLocation = cacheLocation
  }

  async loadInitialValue () {
    try {
      return JSON.parse(fs.readFileSync(this.cacheLocation, 'utf8'))
    } catch (e) {
      const cached = {}
      fs.writeFileSync(this.cacheLocation, JSON.stringify(cached))
      return cached
    }
  }

  async getCached (): Promise<any> {
    if (this.cache === undefined) {
      this.cache = await this.loadInitialValue()
    }

    return this.cache
  }

  async setCached (cached: any) {
    this.cache = cached
    fs.writeFileSync(this.cacheLocation, JSON.stringify(this.cache))
  }

  async setCachedPartial (cached: any) {
    await this.setCached({
      ...this.cache,
      ...cached
    })
  }
}

module.exports = FileCache
