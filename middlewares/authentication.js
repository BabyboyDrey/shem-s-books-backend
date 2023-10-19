const jwt = require('jsonwebtoken')
const User = require('../models/users')
const catchAsyncErrors = require('./catchAsyncErrors')

exports.isUserAuth = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies

  if (!token) {
    res.status(401).json('Please sign into your account')
  }

  const decodedUser = jwt.verify(token, process.env.JWT_SECRET)
  req.user = await User.findOne({ _id: decodedUser.id }).maxTimeMS(50000)
  next()
})
