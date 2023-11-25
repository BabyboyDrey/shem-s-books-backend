const express = require('express')
const router = express.Router()
const Event = require('../models/event')
const { upload } = require('../multer.js')
const { isSellerAuth } = require('../middlewares/sellerAuth')
const catchAsyncErrors = require('../middlewares/catchAsyncErrors')
const fs = require('fs')

router.post(
  '/avi',
  upload.array(
    'images',
    catchAsyncErrors(async (req, res) => {
      try {
        const file = req.files.map(file => {
          return file
        })
        res.status(200).json(file)
      } catch (err) {
        res.status(500).json(err)
      }
    })
  )
)

router.post(
  '/create-event',
  isSellerAuth,
  upload.array('images'),
  catchAsyncErrors(async (req, res) => {
    try {
      const foundShop = await Shop.findOne({ _id: req.seller.id }).maxTimeMS(
        50000
      )

      if (!foundShop) {
        return res.status(404).json({ error: 'Shop not found' })
      }

      const eventData = req.body
      const setEventData = {
        eventName: eventData.eventName,
        eventDesc: eventData.eventDesc,
        seller: {
          name: eventData.sellerName,
          shopId: eventData.sellerShopId
        },
        category: eventData.category,
        currentPrice: eventData.currentPrice,
        discountPrice: eventData.discountPrice,
        stock: eventData.stock,
        startDate: eventData.startDate,
        endDate: eventData.endDate
      }

      const files = req.files
      console.log(`req.files`, req.files)
      const imageUrls = files.map(file => `${file.filename}`)

      setEventData.eventImages = imageUrls

      const eventCreated = await Event.create(setEventData)

      res.status(200).json({
        success: true,
        eventCreated
      })
    } catch (err) {
      res.status(500).json(err)
      console.log(err)
    }
  })
)

router.get(
  '/all-events',
  catchAsyncErrors(async (req, res) => {
    try {
      const allEvents = await Event.find()
        .sort({ createdAt: -1 })
        .maxTimeMS(50000)
      res.status(200).json(allEvents)
    } catch (err) {
      res.status(500).json(err)
      console.log(err)
    }
  })
)

router.get(
  '/get-specific-event/:eventId',
  catchAsyncErrors(async (req, res) => {
    try {
      const foundEvent = await Event.findOne({
        _id: req.params.eventId
      }).maxTimeMS(50000)

      if (!foundEvent) {
        return res.status(404).json({ error: 'Event not found' })
      }
      res.status(200).json(foundEvent)
    } catch (err) {
      res.status(500).json(err)
      console.log(err)
    }
  })
)

router.get(
  '/get-shop-events',
  isSellerAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      const allEvents = await Event.find()
        .sort({ createdAt: -1 })
        .maxTimeMS(50000)

      const foundSeller = await Shop.findOne({ _id: req.seller.id })

      if (!foundSeller) {
        return res.status(404).json('Shop not found')
      }

      const shopEvents = allEvents.filter(event => {
        return event.seller.shopId === req.seller.id
      })

      res.status(200).json(shopEvents)
    } catch (err) {
      res.status(500).json(err)
    }
  })
)

router.delete(
  '/delete-event/:eventId',
  catchAsyncErrors(async (req, res) => {
    try {
      const foundEvent = await Event.findOne({ _id: req.params.eventId })
      if (!foundEvent) {
        return res.status(404).json({ error: 'Event not found' })
      } else {
        if (foundEvent.eventImages.length > 0) {
          await Promise.all(
            foundEvent.eventImages.map(async image => {
              try {
                fs.unlinkSync(`uploads/${image}`)
              } catch (unlinkErr) {
                console.error(unlinkErr)
                return res.status(500).json({ error: 'Error deleting images' })
              }
            })
          )
        }
        await Event.findByIdAndDelete(req.params.eventId)
        res.status(200).json('Event successfully deleted')
      }
    } catch (err) {
      res.status(500).json(err)
      console.log(err)
    }
  })
)

module.exports = router
