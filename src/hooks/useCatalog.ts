import { useMemo } from 'react';
import type { Catalog } from '../types';
import catalogData from '../../news-sources/catalog.json';

export const useCatalog = (): Catalog => {
  return useMemo(() => catalogData as Catalog, []);
};
