import { Task } from '../db/queries';

async function getNotificationsModule() {
  try {
    const Notifications = await import('expo-notifications');
    return Notifications;
  } catch (e) {
    console.warn("expo-notifications not available:", e);
    return null;
  }
}

export async function scheduleTaskNotification(task: Task) {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  try {
    await cancelTaskNotification(task.id);

    if (task.completed) {
      return;
    }

    if (task.dueDateTime) {
      const dueDate = new Date(task.dueDateTime);
      if (dueDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Task Reminder',
            body: `Reminder: ${task.title}`,
            data: { taskId: task.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: dueDate,
          },
          identifier: task.id,
        });
      }
    }
  } catch (e) {
    console.warn("Failed to schedule notification", e);
  }
}

export async function cancelTaskNotification(taskId: string) {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(taskId);
  } catch (e) {
    console.warn("Failed to cancel notification", e);
  }
}
