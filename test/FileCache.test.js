/* eslint-env mocha */
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai

const { FileCache } = require('../src/common/cache/FileCache')

describe('file cache', async () => {
  it('should load and restore data in memory', async () => {
    const cache = new FileCache('./test-a-cache.json')
    await cache.set('cache', { foo: 'bar' })

    const data = await cache.get('cache')
    expect(data.value).to.deep.equal({ foo: 'bar' })
  })

  it('should load and restore data in file', async () => {
    const cacheSave = new FileCache('./test-b-cache.json')
    await cacheSave.set('hello', { foo: 'bar' })

    const cacheLoad = new FileCache('./test-b-cache.json')
    const data = await cacheLoad.get('hello')
    expect(data.value).to.deep.equal({ foo: 'bar' })
  })
})
