const express = require('express')
const catchAsyncErrors = require('../middlewares/catchAsyncErrors')
const { upload } = require('../multer')
const Shop = require('../models/seller')
const Book = require('../models/book')
const { isUserAuth } = require('../middlewares/authentication')
const { isSellerAuth } = require('../middlewares/sellerAuth.js')
const router = express.Router()
const fs = require('fs')

router.post(
  '/create-book',
  upload.array('images'),
  catchAsyncErrors(async (req, res) => {
    try {
      const bookInfo = req.body
      const shopId = req.body.shopId

      const foundShop = await Shop.findById(shopId).maxTimeMS(70000)

      if (!foundShop) {
        return res.status(400).json('Shop not found')
      }

      const bookData = {
        bookTitle: bookInfo.bookTitle,
        bookDesc: bookInfo.bookDesc,
        bookAuthor: {
          authorName: bookInfo.authorName,
          authorBio: bookInfo.authorBio
        },
        discountPrice: bookInfo.discountPrice,
        currentPrice: bookInfo.currentPrice,
        stock: bookInfo.stock,
        category: bookInfo.category,
        shopId: shopId
      }
      const files = req.files
      const imageUrls = files.map(file => `${file.filename}`)
      bookData.bookImages = imageUrls

      const createdBook = await Book.create(bookData)
      foundShop.shopProducts.push(createdBook)
      foundShop.save()
      res.status(201).json({
        success: true,
        createdBook,
        shop: foundShop
      })
    } catch (err) {
      res.status(500).json(err)
      console.log(err)
    }
  })
)

router.get(
  '/get-specific-shop-book/:id',
  catchAsyncErrors(async (req, res) => {
    try {
      const foundBooks = await Book.findOne({ shopId: req.params.id })
      if (!foundBooks) {
        res.status(400).json("Shop hasn't created a book yet")
      }
      res.status(200).json({
        success: true,
        foundBooks
      })
    } catch (err) {
      res.status(500).json(err.response)
    }
  })
)

router.post(
  '/edit-stock/:bookId',
  isSellerAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      const bookId = req.params.bookId.toString()
      const foundBook = await Book.findById(bookId).maxTimeMS(50000)

      if (!foundBook) {
        return res.status(404).json({ error: 'Book not found' })
      }

      let stock = req.body.stock
      if (stock < 1) {
        stock = 0
      }

      foundBook.stock = stock

      await foundBook.save()

      res.status(200).json({
        success: true,
        foundBook
      })
    } catch (err) {
      console.log({ error: err })
      return res.status(500).json(err)
    }
  })
)

router.get(
  '/get-specific-book/:id',
  catchAsyncErrors(async (req, res) => {
    try {
      const id = req.params.id
      const foundBook = await Book.findById(id)
      if (!foundBook) {
        return res.status(404).json('Book not found')
      }
      res.status(200).json(foundBook)
    } catch (err) {
      res.status(500).json(err)
    }
  })
)

router.get(
  '/get-all-books',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const books = await Book.find().sort({ createdAt: -1 })

      res.status(201).json({
        success: true,
        books
      })
    } catch (error) {
      res.status(500).json(error.response)
    }
  })
)

router.get(
  '/category-linked-books',
  catchAsyncErrors(async (req, res) => {
    try {
      const categoryBooks = await Book.aggregate([
        {
          $group: {
            _id: '$category',
            books: { $push: '$$ROOT' }
          }
        },
        {
          $project: {
            category: '$_id',
            books: 1
          }
        }
      ])
        .option({ maxTimeMS: 5000 })
        .exec()

      res.status(200).json(categoryBooks)
    } catch (err) {
      console.log(err)
      res.status(500).json(err)
    }
  })
)

router.put(
  '/create-review',
  isUserAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      const { user, rating, comment, bookId, orderId } = req.body
      const book = await Book.findById(bookId)

      const review = {
        user,
        rating,
        comment,
        bookId
      }

      const isReviewed = book.reviews.find(rev => rev.user._id === req.user._id)

      if (isReviewed) {
        book.reviews.forEach(rev => {
          ;(rev.rating = rating), (rev.comment = comment), (rev.user = user)
        })
      } else {
        book.reviews.push(review)
      }

      let avg = 0

      book.reviews.forEach(rev => {
        avg += rev.ratings
      })

      book.ratings = avg / book.reviews.length
      await book.save({ validateBeforeSave: false })

      //   await Order.findByIdAndUpdate(
      //     orderId,
      //     {
      //       $set: { 'cart.$[elem].isReviewed': true }
      //     },
      //     { arrayFilters: [{ 'elem._id': bookId }], new: true }
      //   )

      res.status(200).json({
        success: true,
        message: 'Book reviewed successfully'
      })
    } catch (err) {
      res.status(500).json(err.response)
    }
  })
)

router.delete(
  '/delete-product/:bookId',
  isSellerAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      const foundSeller = await Shop.findOne({ _id: req.seller.id }).maxTimeMS(
        50000
      )

      if (!foundSeller) {
        return res.status(404).json({ error: 'Seller doesnt exist' })
      }
      await Book.findByIdAndDelete(req.params.bookId)
      const bookIdToDelete = req.params.bookId.toString()

      const foundBook = foundSeller.shopProducts.find(
        product => product._id.toString() === bookIdToDelete
      )

      if (!foundBook) {
        return res.status(404).json({ error: 'Book doesnt exist' })
      }
      if (foundBook.bookImages.length > 0) {
        await Promise.all(
          foundBook.bookImages.map(async image => {
            try {
              fs.unlinkSync(`uploads/${image}`)
            } catch (unlinkErr) {
              console.error(unlinkErr)
              return res.status(500).json({ error: 'Error deleting images' })
            }
          })
        )
      }

      foundSeller.shopProducts = foundSeller.shopProducts.filter(
        book => book._id.toString() !== bookIdToDelete
      )
      foundSeller.save()
      res.status(200).json({
        success: true,
        foundSeller,
        removedProduct: foundBook
      })
    } catch (err) {
      res.status(500).json(err)
      console.log(err)
    }
  })
)

router.put(
  '/create-review',
  isUserAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      const reviewData = req.body
      const product = await Book.findOne({ _id: reviewData.bookId })
      if (!product) {
        return res.status(404).json('Book not found')
      }

      const isReviewed = product.reviews.find(rev => {
        return rev.user._id === req.user.id
      })
      if (isReviewed) {
        const userRevIndex = product.reviews.findIndex(rev => {
          return rev.user._id === req.user.id
        })
        product.reviews[userRevIndex] = {
          rating: reviewData.rating,
          comment: reviewData.comment,
          bookId: reviewData.bookId,
          user: reviewData.user
        }
      } else {
        product.reviews.push(reviewData)
      }

      let avg = 0
      product.reviews.map(rev => (avg += rev.rating))
      product.ratings = avg / product.reviews.length

      product.save()
      res.status(200).json(product)
    } catch (err) {
      res.status(500).json(err)
    }
  })
)

router.post(
  '/add-sold-out',
  isUserAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      const addition = req.body
      console.log(`addition: ${JSON.stringify(addition)}`)
      const foundBooks = await Promise.all(
        addition.map(async a => {
          try {
            const foundBook = await Book.findOne({ _id: a._id }).maxTimeMS(
              50000
            )
            return foundBook
          } catch (err) {
            console.log(`Error finding book: ${err}`)
            return null
          }
        })
      )

      if (!foundBooks) {
        return res.status(404).json('Book not found')
      }
      await Promise.all(
        foundBooks.map(async b => {
          b.sold_out += 1
          b.stock -= 1
          await b.save()
        })
      )

      res.status(200).json(foundBooks)
    } catch (err) {
      res.status(500).json(err)
      console.log(`Err: ${err}`)
    }
  })
)

module.exports = router
