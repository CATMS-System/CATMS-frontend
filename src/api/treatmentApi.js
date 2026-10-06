import api from './axios';

/**
 * Fetch all treatment categories
 * Target endpoint: GET /api/v1/treatments/categories
 */
export const getCategories = async () => {
  const response = await api.get('/treatments/categories');
  return response.data;
};

/**
 * Fetch treatment catalogue with optional query parameters:
 * - search: string
 * - category_id: number
 * - include_discontinued: boolean
 * - policy_id: number
 * Target endpoint: GET /api/v1/treatments/catalogue
 */
export const getCatalogue = async (params = {}) => {
  const response = await api.get('/treatments/catalogue', { params });
  return response.data;
};

export default {
  getCategories,
  getCatalogue,
};
