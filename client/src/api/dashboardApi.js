import { api } from './client';

export const dashboardApi = {
  getMetrics: async () => {
    return api.get('/dashboard/metrics');
  }
};
