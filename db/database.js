const mongoose = require('mongoose')
const dotenv = require('dotenv')

dotenv.config()

const connectDb = async () => {
  try {
    await mongoose
      .connect(
        process.env.MONGODB,
        {
          useNewUrlParser: true,
          useUnifiedTopology: true
        },
        { debug: true }
      )
      .then(console.log('mongo-db server started'))
  } catch (err) {
    console.log(err)
  }
}

module.exports = connectDb
