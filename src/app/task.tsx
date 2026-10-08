import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Switch, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useApp } from '../context/AppContext';
import * as Queries from '../db/queries';
import DateTimePicker from '@react-native-community/datetimepicker';
import { scheduleTaskNotification, cancelTaskNotification } from '../utils/notifications';

export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const { tasks, categories, refreshData } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  
  const [dueDateTime, setDueDateTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (id) {
      const task = tasks.find(t => t.id === id);
      if (task) {
        setTitle(task.title);
        setDescription(task.description || '');
        setCategoryId(task.categoryId);
        setCompleted(task.completed);
        if (task.dueDateTime) setDueDateTime(new Date(task.dueDateTime));
      }
    }
  }, [id, tasks]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    const task: Queries.Task = {
      id: id || (Date.now().toString() + Math.random().toString(36).substring(7)),
      title: title.trim(),
      description: description.trim() || null,
      completed,
      categoryId,
      dueDateTime: dueDateTime ? dueDateTime.toISOString() : null,
      createdAt: id ? (tasks.find(t => t.id === id)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    };

    if (id) {
      await Queries.updateTask(db, task);
    } else {
      await Queries.addTask(db, task);
    }

    await scheduleTaskNotification(task);
    await refreshData();
    router.back();
  };

  const handleDelete = async () => {
    if (id) {
      Alert.alert('Confirm', 'Are you sure you want to delete this task?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await Queries.deleteTask(db, id);
            await cancelTaskNotification(id);
            await refreshData();
            router.back();
          },
        },
      ]);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const currentDate = dueDateTime || new Date();
      currentDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setDueDateTime(new Date(currentDate));
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const currentDate = dueDateTime || new Date();
      currentDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0);
      setDueDateTime(new Date(currentDate));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Task title"
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Task description"
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryContainer}>
        <TouchableOpacity 
          style={[styles.categoryChip, categoryId === null && styles.categoryChipActive]}
          onPress={() => setCategoryId(null)}
        >
          <Text style={categoryId === null ? styles.categoryTextActive : styles.categoryText}>None</Text>
        </TouchableOpacity>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryChip, categoryId === cat.id && styles.categoryChipActive]}
            onPress={() => setCategoryId(cat.id)}
          >
            <Text style={categoryId === cat.id ? styles.categoryTextActive : styles.categoryText}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Due Date & Time</Text>
      <View style={styles.dateRow}>
        <Button title={dueDateTime ? dueDateTime.toLocaleDateString() : 'Set Date'} onPress={() => setShowDatePicker(true)} />
        <Button title={dueDateTime ? dueDateTime.toLocaleTimeString() : 'Set Time'} onPress={() => setShowTimePicker(true)} />
        {dueDateTime && <Button title="Clear" color="red" onPress={() => setDueDateTime(null)} />}
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={dueDateTime || new Date()}
          mode="date"
          onChange={handleDateChange}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={dueDateTime || new Date()}
          mode="time"
          onChange={handleTimeChange}
        />
      )}

      <View style={styles.switchRow}>
        <Text style={styles.label}>Completed</Text>
        <Switch value={completed} onValueChange={setCompleted} />
      </View>

      <View style={styles.actions}>
        <Button title="Save" onPress={handleSave} />
        <Button title="Cancel" onPress={() => router.back()} color="#999" />
        {id && <Button title="Delete" onPress={handleDelete} color="red" />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 50 },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 15, marginBottom: 5, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff' },
  textArea: { height: 100, textAlignVertical: 'top' },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { borderWidth: 1, borderColor: '#007AFF', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' },
  categoryChipActive: { backgroundColor: '#007AFF' },
  categoryText: { color: '#007AFF' },
  categoryTextActive: { color: '#fff' },
  dateRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginVertical: 10 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, marginBottom: 30 },
  actions: { gap: 15 },
});

