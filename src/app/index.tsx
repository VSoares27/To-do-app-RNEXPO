import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useApp } from '../context/AppContext';
import * as Queries from '../db/queries';
import { useSQLiteContext } from 'expo-sqlite';

import { scheduleTaskNotification } from '../utils/notifications';

export default function TaskListScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { tasks, categories, refreshData } = useApp();
  
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Completed'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const toggleTaskCompletion = async (task: Queries.Task) => {
    const updatedTask = { ...task, completed: !task.completed };
    await Queries.updateTask(db, updatedTask);
    await scheduleTaskNotification(updatedTask);
    await refreshData();
  };

  const filteredTasks = tasks.filter(task => {
    if (statusFilter === 'Pending' && task.completed) return false;
    if (statusFilter === 'Completed' && !task.completed) return false;
    if (categoryFilter && task.categoryId !== categoryFilter) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <View style={styles.statusFilters}>
          {['All', 'Pending', 'Completed'].map(status => (
            <TouchableOpacity 
              key={status} 
              style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
              onPress={() => setStatusFilter(status as any)}
            >
              <Text style={statusFilter === status ? styles.filterChipTextActive : undefined}>{status}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'all', name: 'All Categories' }, ...categories]}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const isActive = (item.id === 'all' && categoryFilter === null) || categoryFilter === item.id;
            return (
              <TouchableOpacity 
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setCategoryFilter(item.id === 'all' ? null : item.id)}
              >
                <Text style={isActive ? styles.filterChipTextActive : undefined}>{item.name}</Text>
              </TouchableOpacity>
            )
          }}
          style={styles.categoryFilters}
        />
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const category = categories.find(c => c.id === item.categoryId);
          return (
            <TouchableOpacity 
              style={styles.taskCard}
              onPress={() => router.push(`/task?id=${item.id}`)}
            >
              <TouchableOpacity 
                style={[styles.checkbox, item.completed && styles.checkboxCompleted]} 
                onPress={() => toggleTaskCompletion(item)}
              >
                {item.completed && <Text style={styles.checkboxTick}>✓</Text>}
              </TouchableOpacity>
              <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, item.completed && styles.taskTitleCompleted]}>
                  {item.title}
                </Text>
                {category && <Text style={styles.taskCategory}>{category.name}</Text>}
                {item.dueDateTime && <Text style={styles.taskDate}>Due: {new Date(item.dueDateTime).toLocaleString()}</Text>}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>No tasks found.</Text>}
      />

      <View style={styles.fabContainer}>
        <Link href="/categories" asChild>
          <TouchableOpacity style={styles.secondaryFab}>
            <Text style={styles.fabText}>📁</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/task" asChild>
          <TouchableOpacity style={styles.fab}>
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  filterBar: { padding: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  statusFilters: { flexDirection: 'row', marginBottom: 10, gap: 8 },
  categoryFilters: { flexDirection: 'row' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#eee', marginRight: 8 },
  filterChipActive: { backgroundColor: '#007AFF' },
  filterChipTextActive: { color: '#fff' },
  taskCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, marginHorizontal: 10, marginTop: 10, borderRadius: 8, alignItems: 'center' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#007AFF', marginRight: 15, alignItems: 'center', justifyContent: 'center' },
  checkboxCompleted: { backgroundColor: '#007AFF' },
  checkboxTick: { color: '#fff', fontWeight: 'bold' },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  taskTitleCompleted: { textDecorationLine: 'line-through', color: '#999' },
  taskCategory: { fontSize: 12, color: '#666', marginTop: 4 },
  taskDate: { fontSize: 12, color: '#d9534f', marginTop: 2 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
  fabContainer: { position: 'absolute', bottom: 20, right: 20, alignItems: 'center', gap: 10 },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  secondaryFab: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#666', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
});
