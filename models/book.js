const mongoose = require('mongoose')

const bookSchema = new mongoose.Schema({
  bookTitle: {
    type: String
  },
  bookDesc: {
    type: String
  },
  bookAuthor: {
    authorName: {
      type: String
    },
    authorBio: {
      type: String
    }
  },
  discountPrice: {
    type: Number
  },
  currentPrice: {
    type: Number
  },
  stock: {
    type: Number
  },
  bookImages: [
    {
      type: String
    }
  ],
  category: {
    type: String
  },
  reviews: [
    {
      user: {
        type: Object
      },
      rating: {
        type: Number
      },
      comment: {
        type: String
      },
      bookId: {
        type: String
      },
      createdAt: {
        type: Date,
        default: Date.now()
      }
    }
  ],
  ratings: {
    type: Number,
    default: 0
  },
  shopId: {
    type: String
  },
  sold_out: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now()
  }
})

module.exports = Book = mongoose.model('Book', bookSchema)
