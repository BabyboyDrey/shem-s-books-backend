const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const User = require('../models/users')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
const sendMail = require('../utils/sendMail')
const userToken = require('../utils/userToken')
const path = require('path')
const { upload } = require('../multer')
const fs = require('fs')
const { isUserAuth } = require('../middlewares/authentication')
const catchAsyncErrors = require('../middlewares/catchAsyncErrors')

dotenv.config()

const createActivationToken = user => {
  return jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES
  })
}

router.post('/sign-up', async (req, res) => {
  try {
    const { email, firstName, lastName, password } = req.body

    const foundUser = await User.findOne({ email: email }).maxTimeMS(30000)

    if (!foundUser) {
      const salt = await bcrypt.genSalt(12)
      const hashedPass = await bcrypt.hash(req.body.password, salt)

      const user = {
        email: email,
        firstName: firstName,
        lastName: lastName,
        password: hashedPass
      }

      const activationToken = createActivationToken(user)
      const activationUrl = `http://localhost:3000/activation/${activationToken}`

      try {
        await sendMail({
          email: user.email,
          subject: 'Activate your account',
          message: `Hello ${user.firstName}, please click ${activationUrl} to activate your account`
        })
        res.status(201).json({
          success: true,
          message: `please check your email:- ${user.email} to activate your account`
        })
      } catch (err) {
        res.status(500).json(err)
      }
    } else {
      res.status(400).json('User already exists')
    }
  } catch (err) {
    res.status(500).json(`Error message encountered: ${err}`)
    console.log(err)
  }
})

router.get('/activation/:activation_token', async (req, res) => {
  try {
    const activation_token = req.params.activation_token
    const verifiedUser = jwt.verify(activation_token, process.env.JWT_SECRET)

    const { email, firstName, lastName, password } = verifiedUser

    const user = await User.create({
      email: email,
      firstName: firstName,
      lastName: lastName,
      password: password
    })

    userToken(user, 201, res)
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err,
      message: 'Something went wrong'
    })
    console.log(`Activation err: ${err}`)
  }
})

router.post(
  '/login',
  catchAsyncErrors(async (req, res) => {
    try {
      const userEmail = req.body.email

      const foundUser = await User.findOne({ email: userEmail })

      if (foundUser) {
        const validated = await bcrypt.compare(
          req.body.password,
          foundUser.password
        )

        if (!validated) {
          res.status(400).json('Wrong credentials, try again')
        } else {
          userToken(foundUser, 200, res)
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
  '/update-addresses',
  isUserAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      const foundUser = await User.findOne({ _id: req.user.id }).maxTimeMS(
        50000
      )
      const addressesItems = req.body

      console.log(`addressesItems: ${addressesItems}`)
      if (foundUser) {
        try {
          const newAddress = addressesItems.addressType
          console.log(`newAddress: ${newAddress}`)
          const existingAddressIndex = foundUser.addresses.findIndex(
            address => address.addressType === newAddress
          )

          if (existingAddressIndex !== -1) {
            // If matching address found, update it
            foundUser.addresses[existingAddressIndex] = addressesItems
            foundUser.addresses[existingAddressIndex].updatedAt = Date.now()
          } else {
            // If matching address not found, push new address
            foundUser.addresses.push(addressesItems)
          }

          await foundUser.save()
          console.log(foundUser)
          userToken(foundUser, 200, res)
        } catch (err) {
          console.log(err)
          res.status(500).json(err)
        }
      } else {
        res.status(400).json('You can only update your account')
      }
    } catch (err) {
      console.log(err)
      res.status(500).json(err)
    }
  })
)

router.put(
  '/update',
  isUserAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      const foundUser = await User.findOne({ _id: req.user.id }).maxTimeMS(
        50000
      )
      const updateItems = req.body

      if (updateItems.email === '' || null || false)
        updateItems.email = req.user.email

      console.log(updateItems)
      if (foundUser) {
        const user = await User.findOneAndUpdate(
          {
            _id: foundUser._id
          },
          {
            $set: updateItems
          },
          {
            new: true
          },
          {
            updatedAt: Date.now()
          }
        ).maxTimeMS(50000)

        userToken(user, 200, res)
      } else {
        res.status(400).json('You can only update your account')
      }
    } catch (err) {
      console.log(err)
      res.status(500).json(err)
    }
  })
)

router.delete(
  '/delete',
  isUserAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      await User.deleteOne({ _id: req.user.id })

      res.cookie('token', null, {
        expires: new Date(Date.now()),
        httpOnly: true
      })
      res.status(201).json({
        success: true,
        message: 'User successfully deleted!'
      })
    } catch (err) {
      console.log(err)
      res.status(500).json(err)
    }
  })
)
router.get(
  '/getUser',
  isUserAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      console.log(`req user: ${req.user.id}`)
      const user = await User.findOne({ _id: req.user.id }).maxTimeMS(70000)
      if (user) {
        res.status(200).json(user)
      } else {
        res.status(400).json('User not found')
      }
    } catch (err) {
      res.status(500).json(err)
      console.log(`Err in getUser route: ${err}`)
    }
  })
)

router.put(
  '/update-avatar',
  isUserAuth,
  upload.single('avatar'),
  catchAsyncErrors(async (req, res) => {
    try {
      const foundUser = await User.findOne({ _id: req.user.id }).maxTimeMS(
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
    }
  })
)

router.put(
  '/update-password',
  isUserAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      const foundUser = await User.findOne({ _id: req.user.id })

      const { oldPassword, newPassword, confirmNewPassword } = req.body

      if (foundUser) {
        const foundUserOldPassword = foundUser.password

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
                foundUser.password = hashedPass
                console.log(foundUser.password)
                console.log(`hasdedPass: ${hashedPass}`)
                await foundUser.save()
                userToken(foundUser, 200, res)
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

router.get(
  '/logout',
  catchAsyncErrors(async (req, res) => {
    try {
      res.cookie('token', null, {
        expires: new Date(Date.now()),
        httpOnly: true
      })
      res.status(200).json('User logged out')
      console.log('User logging out')
    } catch (err) {
      res.status(500).json(err.response)
    }
  })
)

router.delete(
  '/delete/:userId',
  isUserAuth,
  catchAsyncErrors(async (req, res) => {
    try {
      const foundUser = await User.findOne({
        _id: req.params.userId
      }).maxTimeMS(50000)
      const user = await User.findOne({ _id: req.user.id }).maxTimeMS(50000)
      console.log(`user: ${user}`)
      console.log(`req.user.id: ${req.user.id}`)
      console.log(`req params: ${req.params.userId}`)
      console.log(`foundUser: ${foundUser}`)
      if (foundUser) {
        await User.findByIdAndDelete(req.user.id)
        console.log(`foundUser id: ${foundUser._id}`)
        res.cookie('token', null, {
          expires: new Date(Date.now()),
          httpOnly: true
        })

        res.status(200).json(`User and cookie deleted`)
      } else {
        res.status(400).json('User not found')
      }
    } catch (err) {
      res.status(500).json(err.response)
    }
  })
)

router.get('/getUsers', async (req, res) => {
  try {
    const foundUsers = await User.find().maxTimeMS(50000)
    if (!foundUsers) {
      res.status(404).json('No user found')
    }
    res.status(200).json(foundUsers)
    console.log(foundUsers)
  } catch (err) {
    res.status(500).json(err)
    console.log(err)
  }
})
module.exports = router
