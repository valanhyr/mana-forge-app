import apiClient from "../apiClient";

export const dbService = {
  getHero: async (locale) => {
    const { data } = await apiClient.get(`/api/hero/${locale}`);
    return data;
  },
};
