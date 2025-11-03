export const storage = {
  get<T = unknown>(key: string, fallback: T | null = null): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch (error) {
      console.warn('[storage] Failed to parse key', key, error);
      return fallback;
    }
  },
  set<T = unknown>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key: string) {
    localStorage.removeItem(key);
  },
};

export default storage;
