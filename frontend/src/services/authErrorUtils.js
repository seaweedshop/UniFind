export const getAuthErrorMessages = (error, fallbackMessage) => {
  const responseData = error?.response?.data;

  if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
    return responseData.errors.map((item) => item.msg).filter(Boolean);
  }

  if (responseData?.message) {
    return [responseData.message];
  }

  return [fallbackMessage];
};
