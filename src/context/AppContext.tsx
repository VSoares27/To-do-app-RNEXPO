import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import * as Queries from '../db/queries';

type AppContextType = {
  tasks: Queries.Task[];
  categories: Queries.Category[];
  refreshData: () => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [tasks, setTasks] = useState<Queries.Task[]>([]);
  const [categories, setCategories] = useState<Queries.Category[]>([]);

  const refreshData = async () => {
    try {
      const fetchedTasks = await Queries.getTasks(db);
      const fetchedCategories = await Queries.getCategories(db);
      setTasks(fetchedTasks);
      setCategories(fetchedCategories);
    } catch (e) {
      console.error('Failed to fetch data', e);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <AppContext.Provider value={{ tasks, categories, refreshData }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

