'use client';

import { useEffect, useState } from 'react';
import { api } from './api';
import type { Ref } from './leads';

export function useCatalog(path: 'lead-sources' | 'disqualification-reasons' | 'sellers') {
  const [items, setItems] = useState<Ref[]>([]);
  useEffect(() => {
    api<Ref[]>(`/catalogs/${path}`).then(setItems).catch(() => setItems([]));
  }, [path]);
  return items;
}
