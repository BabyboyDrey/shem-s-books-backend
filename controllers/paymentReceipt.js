const express = require('express')
const PaymentReceipt = require('../models/paymentReceipt')
const { isUserAuth } = require('../middlewares/authentication')
const catchAsyncErrors = require('../middlewares/catchAsyncErrors')
const router = express.Router()

router.post(
  '/create-receipt',
  isUserAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      const paymentReceiptData = req.body
      const savedReceipt = await PaymentReceipt.create(paymentReceiptData)

      res.status(200).json(savedReceipt)
    } catch (err) {
      res.status(500).json(`Err: ${err}`)
    }
  })
)

module.exports = router
