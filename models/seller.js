const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')

const shopSchema = new mongoose.Schema({
  shopName: {
    type: String
  },
  shopNumber: {
    type: Number
  },
  shopEmail: {
    type: String
  },
  shopPassword: {
    type: String
  },
  avatar: {
    type: String
  },
  shopAddress: {
    shopAddressName: {
      type: String
    },
    shopCountry: {
      type: String
    },
    shopState: {
      type: String
    },
    shopZipCode: {
      type: Number
    },
    shopStreetAddress: {
      type: String
    }
  },
  role: {
    type: String,
    default: 'Seller'
  },
  createdAt: {
    type: Date,
    default: new Date()
  },
  updatedAt: {
    type: Date
  }
})

shopSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES
  })
}

shopSchema.pre('save', function (next) {
  this.updatedAt = Date()
  next()
})

module.exports = Shop = mongoose.model('Shop', shopSchema)
