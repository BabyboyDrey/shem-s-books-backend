const multer = require('multer')
const path = require('path')

// path.join(__dirname, './uploads')

const storage = multer.diskStorage({
  destination: function (req, res, cb) {
    cb(null, path.join(__dirname, './uploads'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + Math.floor(Math.random() * 1e9)
    const filename = file.originalname.split('.')[0]
    console.log(`filename:`, filename)
    console.log(`file.originalname:`, file.originalname)
    cb(null, filename + '-' + uniqueSuffix + '.jpg')
  }
})

exports.upload = multer({ storage: storage })
