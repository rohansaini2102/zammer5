const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
  getUserReviews
} = require('../controllers/reviewController');
const { protectUser } = require('../middleware/authMiddleware');

// Create a review
router.post(
  '/',
  protectUser,
  [
    body('product').notEmpty().withMessage('Product ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review').notEmpty().withMessage('Review text is required')
  ],
  createReview
);

// Get all reviews for a product
router.get('/product/:productId', getProductReviews);

// Get all reviews by the logged-in user
router.get('/user', protectUser, getUserReviews);

// Update a review
router.put(
  '/:id',
  protectUser,
  [
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review').optional().notEmpty().withMessage('Review text is required')
  ],
  updateReview
);

// Delete a review
router.delete('/:id', protectUser, deleteReview);

module.exports = router;