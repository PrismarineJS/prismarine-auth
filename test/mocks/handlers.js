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
  }),

  rest.post(Endpoints.LiveDeviceCodeRequest, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.set('set-cookie', ''),
      ctx.json({
        verification_uri: 'dummy verification uri',
        user_code: 'dummy code',
        expires_in: 100000
      })
    )
  }),

  rest.post(Endpoints.LiveTokenRequest, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({})
    )
  }),

  rest.post(Endpoints.XboxDeviceAuth, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({})
    )
  }),

  rest.post(Endpoints.XboxTitleAuth, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({})
    )
  })
]
