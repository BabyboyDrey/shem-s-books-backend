const mongoose = require('mongoose')

const paymentReceiptSchema = new mongoose.Schema({
  productBought: [
    {
      type: Object
    }
  ],
  totalCost: {
    type: Number
  },
  paymentMethod: {
    type: String
  },
  additionalDetails: {
    type: Object
  },
  purchaserId: {
    type: String
  },
  deliveryAddress: {
    type: Object
  },
  createdAt: {
    type: Date,
    default: Date.now()
  }
})

module.exports = PaymentReceipt = mongoose.model(
  'PaymentReceipt',
  paymentReceiptSchema
)
