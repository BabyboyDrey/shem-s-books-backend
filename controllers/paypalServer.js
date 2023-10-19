const express = require('express')
const fetch = require('cross-fetch')
const path = require('path')
const router = express.Router()

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env
const base = 'https://api-m.sandbox.paypal.com'

const generateAccessToken = async () => {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error('MISSING_API_CREDENTIALS')
    }
    const auth = Buffer.from(
      PAYPAL_CLIENT_ID + ':' + PAYPAL_CLIENT_SECRET
    ).toString('base64')

    const response = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      body: 'grant_type=client_credentials',
      headers: {
        Authorization: `Basic ${auth}`
      }
    })

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('Failed to generate Access Token:', error)
  }
}

const createOrder = async data => {
  console.log(
    'shopping cart information passed from the frontend createOrder() callback:',
    data
  )

  const accessToken = await generateAccessToken()
  const url = `${base}/v2/checkout/orders`
  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: 'USD',
          value: data.totalCost
        }
      }
    ]
  }

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    method: 'POST',
    body: JSON.stringify(payload)
  })

  return handleResponse(response)
}

const captureOrder = async orderID => {
  const accessToken = await generateAccessToken()
  const url = `${base}/v2/checkout/orders/${orderID}/capture`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    }
  })

  return handleResponse(response)
}

async function handleResponse (response) {
  try {
    const jsonResponse = await response.json()
    return {
      jsonResponse,
      httpStatusCode: response.status
    }
  } catch (err) {
    const errorMessage = await response.text()
    throw new Error(errorMessage)
  }
}

router.post('/orders', async (req, res) => {
  try {
    const { orderData } = req.body
    console.log(`orderData in paypal server: ${orderData}`)
    const { jsonResponse, httpStatusCode } = await createOrder(orderData)
    res.status(httpStatusCode).json(jsonResponse)
  } catch (error) {
    console.error('Failed to create order:', error)
    res.status(500).json({ error: 'Failed to create order.' })
  }
})

router.post('/orders/:orderID/capture', async (req, res) => {
  try {
    const { orderID } = req.params
    console.log(`orderID:`, orderID)
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID)
    console.log(`jsonResponse, httpStatusCode:`, jsonResponse, httpStatusCode)
    res.status(httpStatusCode).json(jsonResponse)
  } catch (error) {
    console.error('Failed to create order:', error)
    res.status(500).json({ error: 'Failed to capture order.' })
  }
})

module.exports = router
