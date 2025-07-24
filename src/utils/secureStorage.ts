// Secure localStorage wrapper with validation
export const secureStorage = {
  getItem<T>(key: string, validator?: (data: any) => data is T): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      
      // If validator is provided, use it
      if (validator && !validator(parsed)) {
        console.error(`Invalid data structure for key: ${key}`);
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error(`Error reading from localStorage:`, error);
      return null;
    }
  },
  
  setItem(key: string, value: any): boolean {
    try {
      // Sanitize data before storing
      const sanitized = JSON.parse(JSON.stringify(value));
      localStorage.setItem(key, JSON.stringify(sanitized));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage:`, error);
      return false;
    }
  },
  
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from localStorage:`, error);
    }
  }
};

// Validators for common data structures
export const validators = {
  savedEquipment: (data: any): data is Array<{id: string, savedDate: string}> => {
    return Array.isArray(data) && data.every(item => 
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.savedDate === 'string'
    );
  }
};