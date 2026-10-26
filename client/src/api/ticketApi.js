import { api } from './client';

export const ticketApi = {
  getTickets: async (queryParams = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    const queryString = searchParams.toString();
    const endpoint = queryString ? `/tickets?${queryString}` : '/tickets';
    return api.get(endpoint);
  },

  getTicketById: async (id) => {
    return api.get(`/tickets/${id}`);
  },

  createTicket: async ({ title, description, category, priority }) => {
    return api.post('/tickets', { title, description, category, priority });
  },

  updateStatus: async (id, status) => {
    return api.patch(`/tickets/${id}/status`, { status });
  },

  updatePriority: async (id, priority) => {
    return api.patch(`/tickets/${id}/priority`, { priority });
  },

  assignTicket: async (id, assignedTo) => {
    return api.patch(`/tickets/${id}/assign`, { assignedTo });
  },

  getComments: async (ticketId) => {
    return api.get(`/tickets/${ticketId}/comments`);
  },

  createComment: async (ticketId, { message, isInternal }) => {
    return api.post(`/tickets/${ticketId}/comments`, { message, isInternal });
  },

  getActivity: async (ticketId) => {
    return api.get(`/tickets/${ticketId}/activity`);
  }
};
