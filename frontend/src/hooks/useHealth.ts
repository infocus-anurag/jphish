import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export const useHealth = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await apiClient.get('/health');
      return response.data;
    },
    staleTime: 60000,
  });
};
