const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const path = require('path')
const connectDb = require('./db/database')
const userRoute = require('./controllers/users')
const shopRoute = require('./controllers/sellers')
const bookRoute = require('./controllers/book')
const eventRoute = require('./controllers/event')
const orderRoute = require('./controllers/paypalServer')
const paymentReceiptsRoute = require('./controllers/paymentReceipt')
const app = express()

app.use(
  cors({
    origin: ['http://localhost:3000', 'https://shems-books-kvky.onrender.com'],
    credentials: true
  })
)
app.use(cookieParser())
app.use(express.json())
app.use('/api/user', userRoute)
app.use('/api/shop', shopRoute)
app.use('/api/book', bookRoute)
app.use('/api/event', eventRoute)
app.use('/api/order', orderRoute)
app.use('/api/receipt', paymentReceiptsRoute)
app.use('/', express.static('uploads'))
app.use(express.static(path.join(__dirname, 'build')))

connectDb()

if (process.env.NODE_ENV !== 'PRODUCTION') {
  require('dotenv').config({
    path: '.env'
  })
}

process.on('uncaughtException', err => {
  console.log(`Error: ${err.message}`)
  console.log('shutting down the server for handling uncaught exception')
})

process.on('unhandledRejection', err => {
  console.log(`Error: ${err.message}`)
  console.log('shutting down the server for handling unhandled exception')

  server.close(() => {
    process.exit(1)
  })
})

app.get('/', (req, res) => {
  res.send(`Server ${process.env.PORT} running!`)
})

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'))
})

const server = app.listen(process.env.PORT, (req, res) => {
  console.log(`Server ${process.env.PORT} started`)
})
