const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  firstName: {
    type: String
  },
  lastName: {
    type: String
  },
  password: {
    type: String,
    required: true
  },
  addresses: [
    {
      addressType: {
        type: String
      },
      country: {
        type: String
      },
      state: {
        type: String
      },
      streetName: {
        type: String
      },
      houseNumber: {
        type: Number
      },
      zipCode: {
        type: Number
      },
      createdAt: {
        type: Date,
        default: Date.now()
      },
      updatedAt: {
        type: Date,
        default: Date.now()
      }
    }
  ],
  avatar: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
  updatedAt: {
    type: Date,
    default: Date.now()
  },
  role: {
    type: String,
    default: 'user'
  }
})

userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES
  })
}

userSchema.pre('save', function (next) {
  this.updatedAt = Date()
  next()
})

module.exports = Users = mongoose.model('Users', userSchema)
