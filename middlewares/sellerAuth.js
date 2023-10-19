const jwt = require('jsonwebtoken')
const Shop = require('../models/seller')
const catchAsyncErrors = require('./catchAsyncErrors')

exports.isSellerAuth = catchAsyncErrors(async (req, res, next) => {
  const { shopToken } = req.cookies

  if (!shopToken) {
    res.status(401).json('Please sign into your account')
  }

  const decodedUser = jwt.verify(shopToken, process.env.JWT_SECRET)
  req.seller = await Shop.findById(decodedUser.id).maxTimeMS(90000)
  next()
})
