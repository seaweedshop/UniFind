const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const {
  submitClaim,
  getIncomingClaims,
  getMyClaims,
  getClaimDetail,
  acceptClaim,
  rejectClaim,
  getClaimSummary,
} = require('../controllers/claimController');

const router = express.Router();

const claimValidation = [
  body('item_id').isInt({ min: 1 }).withMessage('Item is required.'),
  body('proof_description')
    .trim()
    .isLength({ min: 20 })
    .withMessage('Proof description must be at least 20 characters long.'),
  body('contact_note').optional({ nullable: true, checkFalsy: true }).trim(),
];

const claimIdValidation = [param('id').isInt({ min: 1 }).withMessage('Claim id must be a valid number.')];

router.get('/summary', authMiddleware, getClaimSummary);
router.get('/incoming', authMiddleware, getIncomingClaims);
router.get('/my', authMiddleware, getMyClaims);
router.get('/:id', authMiddleware, claimIdValidation, getClaimDetail);
router.post('/', authMiddleware, claimValidation, submitClaim);
router.put('/:id/accept', authMiddleware, claimIdValidation, acceptClaim);
router.put('/:id/reject', authMiddleware, claimIdValidation, rejectClaim);

module.exports = router;