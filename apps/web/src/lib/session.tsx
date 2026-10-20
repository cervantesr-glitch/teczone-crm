'use client';

import { createContext, useContext } from 'react';
import type { SessionUser } from './types';

export const SessionContext = createContext<SessionUser | null>(null);
export const useSession = () => useContext(SessionContext);
