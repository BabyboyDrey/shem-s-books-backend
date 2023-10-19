const User = require('../models/users')

const userToken = (user, statusCode, res) => {
  const token = user.getJwtToken()

  const options = {
    maxAge: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: 'none',
    secure: true
  }

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    user,
    token
  })
}

module.exports = userToken
