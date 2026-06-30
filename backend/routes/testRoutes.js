const express = require('express');
const { getApiTest } = require('../controllers/testController');

const router = express.Router();

router.get('/test', getApiTest);

module.exports = router;
