const getApiTest = (req, res) => {
  // Simple health/test endpoint for API validation
  res.status(200).json({
    message: 'Backend server running successfully',
  });
};

module.exports = {
  getApiTest,
};
