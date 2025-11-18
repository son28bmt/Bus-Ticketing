export interface News {
  id: number;
  title: string;
  slug: string;
  content: string;
  summary?: string;
  category: NewsCategory;
  status: NewsStatus;
  featuredImage?: string;
  publishedAt?: string;
  viewCount: number;
  tags: string[];
  isHighlighted: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    name: string;
    email?: string;
  };
  company?: {
    id: number;
    name: string;
    code?: string | null;
  } | null;
}

export type NewsCategory = 'TRAFFIC' | 'COMPANY' | 'PROMOTION' | 'ANNOUNCEMENT' | 'OTHER';

export type NewsStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface CreateNewsData {
  title: string;
  content: string;
  summary?: string;
  category?: NewsCategory;
  status?: NewsStatus;
  featuredImage?: string;
  tags?: string[];
  isHighlighted?: boolean;
  publishNow?: boolean;
  companyId?: number;
}

export interface UpdateNewsData {
  title?: string;
  content?: string;
  summary?: string;
  category?: NewsCategory;
  status?: NewsStatus;
  featuredImage?: string;
  tags?: string[];
  isHighlighted?: boolean;
  publishNow?: boolean;
  companyId?: number | null;
}

export interface NewsSearchParams {
  page?: number;
  limit?: number;
  category?: NewsCategory;
  status?: NewsStatus;
  search?: string;
  highlighted?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface NewsResponse {
  success: boolean;
  data: {
    news: News[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  };
}

export interface NewsStatsResponse {
  success: boolean;
  stats: {
    total: number;
    published: number;
    draft: number;
    highlighted: number;
    byCategory: Record<NewsCategory, Record<NewsStatus, number>>;
  };
}

export interface SingleNewsResponse {
  success: boolean;
  news: News;
}

export const NEWS_CATEGORIES = {
  TRAFFIC: 'Giao thông',
  COMPANY: 'Nhà xe', 
  PROMOTION: 'Khuyến mãi',
  ANNOUNCEMENT: 'Thông báo',
  OTHER: 'Khác'
} as const;

export const NEWS_STATUS = {
  DRAFT: 'Bản nháp',
  PUBLISHED: 'xuất bản', 
  ARCHIVED: 'Lưu trữ'
} as const;
