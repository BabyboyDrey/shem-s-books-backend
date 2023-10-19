const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const Shop = require('../models/seller')
const catchAsyncErrors = require('../middlewares/catchAsyncErrors')
const sendMail = require('../utils/sendMail')
const shopToken = require('../utils/shopToken')
const { isSellerAuth } = require('../middlewares/sellerAuth')
const fs = require('fs')
const { upload } = require('../multer')
const path = require('path')
const Book = require('../models/book')

const createActivationToken = shop => {
  return jwt.sign(shop, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES
  })
}

router.post(
  '/sign-up',
  catchAsyncErrors(async (req, res) => {
    try {
      const {
        shopName,
        shopEmail,
        shopNumber,
        shopCountry,
        shopZipCode,
        shopStreetAddress,
        shopPassword
      } = req.body

      const foundUser = await Shop.findOne({ email: shopEmail }).maxTimeMS(
        50000
      )
      if (foundUser) {
        res.status(400).json('User exists, please login')
      } else {
        const shop = {
          shopName,
          shopNumber,
          shopEmail,
          shopPassword,
          shopAddresses: {
            shopCountry,
            shopZipCode,
            shopStreetAddress
          }
        }

        const activationToken = createActivationToken(shop)
        const activation_url = `http://localhost:3000/seller/activation/${activationToken}`

        try {
          await sendMail({
            email: shop.shopEmail,
            subject: 'Activate your seller account',
            message: `Please click on the underlining link to activate your seller account. Link - ${activation_url}`
          })
          res.status(200).json({
            success: true,
            message: `Account activation link sent to ${shop.shopEmail}, click on link to activate seller account`
          })
        } catch (err) {
          res.status(500).json({
            error: err,
            message: `error encountered in sending mail to seller `
          })
        }
      }
    } catch (err) {
      res.status(500).json(err)
      console.log(err)
    }
  })
)

router.get(
  '/activation/:activation_token',
  catchAsyncErrors(async (req, res) => {
    try {
      const { activation_token } = req.params
      console.log(`activation_token: ${activation_token}`)
      const verifiedShop = jwt.verify(activation_token, process.env.JWT_SECRET)
      console.log(`shop: ${verifiedShop}`)
      if (!verifiedShop) {
        res.status(500).json('something went wrong with jwt token')
      }

      const salt = await bcrypt.genSalt(12)
      const hashedPass = await bcrypt.hash(verifiedShop.shopPassword, salt)

      const shop = await Shop.create({
        shopName: verifiedShop.shopName,
        shopEmail: verifiedShop.shopEmail,
        shopNumber: verifiedShop.shopNumber,
        shopPassword: hashedPass,
        shopAddresses: [
          {
            shopAddressName: verifiedShop.shopAddressName,
            shopCountry: verifiedShop.shopCountry,
            shopState: verifiedShop.shopState,
            shopZipCode: verifiedShop.shopZipCode,
            shopStreetAddress: verifiedShop.shopStreetAddress
          }
        ]
      })

      await shop.save()
      shopToken(shop, 200, res)
    } catch (err) {
      res.status(500).json(err)
      console.log(err)
    }
  })
)

router.post(
  '/login',
  catchAsyncErrors(async (req, res) => {
    try {
      const { shopEmail, shopPassword } = req.body

      const shop = await Shop.findOne({ shopEmail: shopEmail }).maxTimeMS(70000)

      if (shop) {
        const validated = bcrypt.compare(shopPassword, shop.shopPassword)

        if (!validated) {
          res.status(400).json('Wrong credentials, try again')
        } else {
          shopToken(shop, 200, res)
        }
      } else {
        res.status(400).json('User doesnt exist')
      }
    } catch (err) {
      res.status(500).json(`Err encountered: ${err}`)
    }
  })
)

router.put(
  '/update',
  isSellerAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      const items = req.body

      const foundUser = await Shop.findOne({ _id: req.seller.id }).maxTimeMS(
        50000
      )
      console.log(`foundUser: ${foundUser}`)
      if (foundUser) {
        await Shop.findByIdAndUpdate(
          {
            _id: foundUser._id
          },
          {
            $set: items
          },
          {
            updatedAt: new Date(Date.now())
          },
          {
            new: true
          }
        ).maxTimeMS(50000)

        shopToken(foundUser, 200, res)
      } else {
        res.status(400).json('You can only update your account')
      }
    } catch (err) {
      res.status(500).json(err)
      console.log(err)
    }
  })
)

router.put(
  '/update-passwords',
  isSellerAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      const foundUser = await Shop.findOne({ _id: req.seller.id }).maxTimeMS(
        50000
      )

      const { oldPassword, newPassword, confirmNewPassword } = req.body

      if (foundUser) {
        const foundUserOldPassword = foundUser.shopPassword

        const validated = bcrypt.compare(oldPassword, foundUserOldPassword)

        if (!validated) {
          res.status(400).json('Old password mismatch')
        } else {
          const validatedNewPass = newPassword !== oldPassword

          if (validatedNewPass) {
            const validatedConfirmNewPass = newPassword === confirmNewPassword

            if (validatedConfirmNewPass) {
              try {
                const salt = await bcrypt.genSalt(12)
                const hashedPass = await bcrypt.hash(confirmNewPassword, salt)
                foundUser.updatedAt = Date.now()
                foundUser.shopPassword = hashedPass
                console.log(foundUser.shopPassword)
                console.log(`hasdedPass: ${hashedPass}`)
                await foundUser.save()
                shopToken(foundUser, 200, res)
              } catch (err) {
                console.log(err)
                res.status(500).json(err)
              }
            } else {
              res.status(400).json('New password and confirm password mismatch')
            }
          } else {
            res
              .status(400)
              .json('New password and old password must be different')
          }
        }
      } else {
        res.status(400).json('User not found')
      }
    } catch (err) {
      res.status(500).json(err)
    }
  })
)

router.post(
  '/update-avatar',
  isSellerAuth,
  upload.single('avatar'),
  catchAsyncErrors(async (req, res) => {
    try {
      const foundUser = await Shop.findOne({ _id: req.seller.id }).maxTimeMS(
        50000
      )
      console.log(foundUser)
      const fileName = req.file.filename
      console.log(fileName)
      const fileUrl = path.join(fileName)

      if (foundUser) {
        try {
          if (fileName) {
            foundUser.avatar = fileUrl
            foundUser.updatedAt = Date.now()
            console.log(foundUser.avatar)
            await foundUser.save()
            res
              .status(201)
              .json(`Avatar set and foundUser.avatar is ${foundUser.avatar}`)
          }
        } catch (err) {
          res.status(400).json(`File not found and ${err}`)
        }
      } else {
        res.status(400).json('User not found')

        fs.unlinkSync(`uploads/${fileName}`, unlinkErr => {
          if (unlinkErr) {
            console.error(unlinkErr)
          }
        })
      }
    } catch (err) {
      res.status(500).json(err)
      const fileName = req.file.filename
      fs.unlinkSync(`uploads/${fileName}`, unlinkErr => {
        if (unlinkErr) {
          console.error(unlinkErr)
        }
      })
      console.log(err)
    }
  })
)

router.get(
  '/getSeller',
  isSellerAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      const user = await Shop.findOne({ _id: req.seller.id }).maxTimeMS(50000)

      if (user) {
        res.status(200).json(user)
      } else {
        res.status(400).json('User not found')
      }
    } catch (err) {
      res.status(500).json(err)
    }
  })
)

router.put(
  '/update-address',
  isSellerAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      const {
        shopAddressName,
        shopCountry,
        shopState,
        shopZipCode,
        shopStreetAddress
      } = req.body
      const foundUser = await Shop.findOne({ _id: req.seller.id }).maxTimeMS(
        70000
      )
      if (!foundUser) {
        res.status(400).json('Seller does not exist')
      }
      foundUser.shopAddress = {
        shopAddressName,
        shopCountry,
        shopState,
        shopZipCode,
        shopStreetAddress
      }
      foundUser.save()
      shopToken(foundUser, 200, res)
    } catch (err) {
      res.status(500).json(err)
    }
  })
)

router.get(
  '/logout',
  catchAsyncErrors(async (req, res) => {
    try {
      res.clearCookie('shopToken', {
        httpOnly: true
      })
      res.status(200).json('Seller logged out')
      console.log('Seller logging out')
    } catch (err) {
      res.status(500).json(err.response)
    }
  })
)

router.delete(
  '/delete',
  isSellerAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      const foundUser = await Shop.findOne({
        _id: req.seller.id
      }).maxTimeMS(50000)

      console.log(`foundUser: ${foundUser}`)
      if (foundUser) {
        await Shop.findByIdAndDelete(req.seller.id)
        res.clearCookie('shopToken', {
          httpOnly: true
        })

        res.status(200).json(`Seller and cookie deleted`)
      } else {
        res.status(400).json('Seller not found')
      }
    } catch (err) {
      res.status(500).json(err.response)
    }
  })
)

router.get(
  '/all-shop-products',
  isSellerAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      const shopId = req.seller.id.toString()
      const allBooks = await Book.find()
        .sort({ createdAt: -1 })
        .maxTimeMS(50000)
      const foundShopBooks = allBooks.filter(book => {
        return book.shopId.toString() === shopId
      })
      res.status(200).json(foundShopBooks)
    } catch (err) {
      res.status(500).json(err)
    }
  })
)

router.get(
  '/getSellerNames/:id',
  catchAsyncErrors(async (req, res) => {
    try {
      const foundShop = await Shop.findOne({ _id: req.params.id }).maxTimeMS(
        50000
      )
      if (!foundShop) {
        res.status(404).json('Shop Not found')
      }

      res.status(200).json(foundShop.shopName)
    } catch (err) {
      res.status(500).json(err)
    }
  })
)

module.exports = router
