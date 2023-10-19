const Shop = require('../models/seller')

const shopToken = (shop, statusCode, res) => {
  const shopToken = shop.getJwtToken()
  console.log(`token: ${shopToken}`)
  if (!shopToken) {
    res.status(401).json('Please sign into your shop account')
  }

  const options = {
    maxAge: new Date(Date.now(90 * 24 * 60 * 60 * 1000)),
    httpOnly: true,
    sameSite: 'none',
    secure: true
  }

  res.status(statusCode).cookie('shopToken', shopToken, options).json({
    success: true,
    shop,
    shopToken
  })
}

module.exports = shopToken
