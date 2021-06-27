const test = require('./')

const user = { username: 'not.a.valid.email@cuz.yeah' }

const init = async () => {
  const auth = await test.Authenticate(user)
  console.log(auth)
}

init()
