const mongoose = require('mongoose')

const eventSchema = new mongoose.Schema({
  eventImages: [
    {
      type: String
    }
  ],
  eventName: {
    type: String
  },
  eventDesc: {
    type: String
  },
  seller: {
    name: {
      type: String
    },
    shopId: {
      type: String
    }
  },
  category: {
    type: String
  },
  currentPrice: {
    type: Number
  },
  discountPrice: {
    type: Number
  },
  stock: {
    type: Number
  },
  sold_out: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now()
  }
})

module.exports = Event = mongoose.model('Event', eventSchema)
