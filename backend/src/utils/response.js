const success = (res, data, message = 'Success', status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

const error = (res, message, err = null, status = 500) => {
  return res.status(status).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' && err ? (err.message || err) : undefined,
  });
};

module.exports = {
  success,
  error,
};
