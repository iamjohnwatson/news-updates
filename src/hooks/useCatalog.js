import { useMemo } from 'react';
import catalogData from '../../news-sources/catalog.json';
export const useCatalog = () => {
    return useMemo(() => catalogData, []);
};
