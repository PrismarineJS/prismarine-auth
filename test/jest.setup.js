/* eslint-env jest */
const { server } = require('./mocks/server.js')
const { readdir, rm } = require('fs/promises')
const { resolve } = require('path')

const cacheFolder = __dirname

const removeCacheFiles = async () => {
  const files = await readdir(cacheFolder)
  const rmOps = []
  for (const file of files) {
    if (file.endsWith('-cache.json')) {
      rmOps.push(rm(resolve(cacheFolder, file)))
    }
  }
  await Promise.all(rmOps)
}

beforeAll(() => {
  server.listen()
})

afterEach(async () => {
  server.resetHandlers()
  await removeCacheFiles()
})

afterAll(async () => {
  server.close()
})
