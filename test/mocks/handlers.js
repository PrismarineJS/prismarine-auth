const { rest } = require('msw')
const { Endpoints } = require('../../src/common/Constants.js')

exports.handlers = [
  rest.post(Endpoints.BedrockAuth, (req, res, ctx) => {
    const response = {
      extraData: {
        titleId: 'dummy titleId'
      }
    }
    return res(
      ctx.status(200),
      ctx.json({
        chain: [
          '',
          '.' + Buffer.from(JSON.stringify(response)).toString('base64')
        ]
      })
    )
  })
]
