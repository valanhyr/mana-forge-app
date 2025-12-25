import apiClient from "../apiClient";

export const cmsService = {
  getHero: async (locale) => {
    const { data } = await apiClient.get(`/content-service/hero/${locale}`);
    return data;
  },
  getFooter: async (locale) => {
    const { data } = await apiClient.get(`/content/footer/${locale}`);
    return data;
  },
};
