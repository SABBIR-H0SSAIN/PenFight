export const storage = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem("pfa." + key);
      return value == null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem("pfa." + key, JSON.stringify(value));
    } catch {
      /* The game also works with storage disabled. */
    }
  },
};
