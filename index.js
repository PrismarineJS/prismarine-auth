if (typeof process !== 'undefined' && parseInt(process.versions.node.split('.')[0]) < 18) {
  console.error('Your node version is currently', process.versions.node)
  console.error('Please update it to a version >= 18.x.x from https://nodejs.org/')
  process.exit(1)
}

const { createFileSystemCache } = require('./src/common/cache/FileCache')

module.exports = {
  Authflow: require('./src/MicrosoftAuthFlow'),
  Titles: require('./src/common/Titles'),
  createFileSystemCache
}
