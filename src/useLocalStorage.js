import { useEffect, useState } from 'react';

// stateをローカルストレージと同期するフック（リロードしても保持される）
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 容量超過などで保存できない場合は無視する
    }
  }, [key, value]);

  return [value, setValue];
}
