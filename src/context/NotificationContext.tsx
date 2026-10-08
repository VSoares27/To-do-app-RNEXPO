import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Alert, AppState } from 'react-native';

type Reminder = {
  taskId: string;
  taskTitle: string;
  dueDateTime: Date;
  fired: boolean;
};

type NotificationContextType = {
  scheduleReminder: (taskId: string, title: string, dueDateTime: Date | null) => void;
  cancelReminder: (taskId: string) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const reminders = useRef<Map<string, Reminder>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nativeAvailable = useRef<boolean | null>(null);
  const NotificationsModule = useRef<any>(null);

  // Try to load native notifications once
  useEffect(() => {
    (async () => {
      try {
        const mod = await import('expo-notifications');
        NotificationsModule.current = mod;
        nativeAvailable.current = true;

        mod.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        const { status } = await mod.getPermissionsAsync();
        if (status !== 'granted') {
          await mod.requestPermissionsAsync();
        }
        console.log("Native notifications available!");
      } catch (e) {
        nativeAvailable.current = false;
        console.log("Native notifications unavailable, using in-app alerts.");
      }
    })();
  }, []);

  // Check reminders every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const now = new Date();
      reminders.current.forEach((reminder, taskId) => {
        if (!reminder.fired && reminder.dueDateTime <= now) {
          reminder.fired = true;
          Alert.alert(
            '⏰ Task Reminder',
            `Reminder: ${reminder.taskTitle}`,
            [{ text: 'OK' }]
          );
        }
      });
    }, 30000); // every 30s

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const scheduleReminder = useCallback(async (taskId: string, title: string, dueDateTime: Date | null) => {
    // Cancel any existing reminder for this task
    cancelReminder(taskId);

    if (!dueDateTime || dueDateTime <= new Date()) return;

    // In-app reminder
    reminders.current.set(taskId, {
      taskId,
      taskTitle: title,
      dueDateTime,
      fired: false,
    });

    // Also try native notification
    if (nativeAvailable.current && NotificationsModule.current) {
      try {
        const Notifications = NotificationsModule.current;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Task Reminder',
            body: `Reminder: ${title}`,
            data: { taskId },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: dueDateTime,
          },
          identifier: taskId,
        });
      } catch (e) {
        console.warn("Native notification scheduling failed:", e);
      }
    }
  }, []);

  const cancelReminder = useCallback(async (taskId: string) => {
    reminders.current.delete(taskId);

    if (nativeAvailable.current && NotificationsModule.current) {
      try {
        await NotificationsModule.current.cancelScheduledNotificationAsync(taskId);
      } catch (e) {
        // Silently fail
      }
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ scheduleReminder, cancelReminder }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
}

