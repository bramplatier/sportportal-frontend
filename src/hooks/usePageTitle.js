import { useEffect } from 'react';

/**
 * Custom hook to set the page title dynamically
 * @param {string} title - The title to set
 */
export const usePageTitle = (title) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} - SportPortal` : 'SportPortal';

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
};
