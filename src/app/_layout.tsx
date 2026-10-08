import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { AppProvider } from '../context/AppContext';
import { initializeDb } from '../db/database';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        const Notifications = await import('expo-notifications');

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      } catch (e) {
        console.warn("Notifications not available in this environment:", e);
      }
    };
    setupNotifications();
  }, []);

  return (
    <SQLiteProvider databaseName="todoapp.db" onInit={initializeDb}>
      <AppProvider>
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Tasks' }} />
          <Stack.Screen name="task" options={{ title: 'Task Details', presentation: 'modal' }} />
          <Stack.Screen name="categories" options={{ title: 'Categories' }} />
        </Stack>
      </AppProvider>
    </SQLiteProvider>
  );
}
