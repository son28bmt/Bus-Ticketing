import type { 
  CreateNewsData, 
  UpdateNewsData, 
  NewsSearchParams,
  NewsResponse,
  NewsStatsResponse,
  SingleNewsResponse
} from '../types/news';
import api from './http';

class NewsService {
  // Public APIs for users
  async getPublicNews(params: NewsSearchParams = {}): Promise<NewsResponse> {
    const response = await api.get('/news', { params });
    return response.data;
  }

  async getNewsBySlug(slug: string): Promise<SingleNewsResponse> {
    const response = await api.get(`/news/${slug}`);
    return response.data;
  }

  // Admin APIs  
  async getAllNews(params: NewsSearchParams = {}): Promise<NewsResponse> {
    const response = await api.get('/admin/news', { params });
    return response.data;
  }

  async getNewsById(id: number): Promise<SingleNewsResponse> {
    const response = await api.get(`/admin/news/${id}`);
    return response.data;
  }

  async createNews(data: CreateNewsData): Promise<SingleNewsResponse> {
    const response = await api.post('/admin/news', data);
    return response.data;
  }

  async updateNews(id: number, data: UpdateNewsData): Promise<SingleNewsResponse> {
    const response = await api.put(`/admin/news/${id}`, data);
    return response.data;
  }

  async deleteNews(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/admin/news/${id}`);
    return response.data;
  }

  async getNewsStats(): Promise<NewsStatsResponse> {
    const response = await api.get('/admin/news/stats');
    return response.data;
  }

  async toggleHighlight(id: number): Promise<SingleNewsResponse> {
    const response = await api.patch(`/admin/news/${id}/toggle-highlight`);
    return response.data;
  }

  async publishNews(id: number): Promise<SingleNewsResponse> {
    const response = await api.patch(`/admin/news/${id}/publish`);
    return response.data;
  }

  async archiveNews(id: number): Promise<SingleNewsResponse> {
    const response = await api.patch(`/admin/news/${id}/archive`);
    return response.data;
  }

  async uploadImage(file: File): Promise<{ success: boolean; url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await api.post('/admin/news/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Company APIs
  async getCompanyNews(params: NewsSearchParams = {}): Promise<NewsResponse> {
    const response = await api.get('/company/news', { params });
    return response.data;
  }

  async getCompanyNewsById(id: number): Promise<SingleNewsResponse> {
    const response = await api.get(`/company/news/${id}`);
    return response.data;
  }

  async createCompanyNews(data: CreateNewsData): Promise<SingleNewsResponse> {
    const response = await api.post('/company/news', data);
    return response.data;
  }

  async updateCompanyNews(id: number, data: UpdateNewsData): Promise<SingleNewsResponse> {
    const response = await api.put(`/company/news/${id}`, data);
    return response.data;
  }

  async deleteCompanyNews(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/company/news/${id}`);
    return response.data;
  }
}

export default new NewsService();
