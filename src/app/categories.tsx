import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useApp } from '../context/AppContext';
import * as Queries from '../db/queries';

export default function CategoriesScreen() {
  const db = useSQLiteContext();
  const { categories, refreshData } = useApp();
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newId = Date.now().toString() + Math.random().toString(36).substring(7);
    await Queries.addCategory(db, newId, newCategoryName.trim());
    setNewCategoryName('');
    await refreshData();
  };

  const handleSaveEdit = async () => {
    if (editingId && editingName.trim()) {
      await Queries.renameCategory(db, editingId, editingName.trim());
      setEditingId(null);
      setEditingName('');
      await refreshData();
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Category',
      'Are you sure? Tasks in this category will become uncategorized.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await Queries.deleteCategory(db, id);
            await refreshData();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.addSection}>
        <TextInput
          style={styles.input}
          value={newCategoryName}
          onChangeText={setNewCategoryName}
          placeholder="New category name"
        />
        <Button title="Add" onPress={handleAddCategory} disabled={!newCategoryName.trim()} />
      </View>

      <FlatList
        data={categories}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.categoryItem}>
            {editingId === item.id ? (
              <View style={styles.editRow}>
                <TextInput
                  style={[styles.input, styles.editInput]}
                  value={editingName}
                  onChangeText={setEditingName}
                  autoFocus
                />
                <Button title="Save" onPress={handleSaveEdit} />
                <Button title="Cancel" onPress={() => setEditingId(null)} color="#999" />
              </View>
            ) : (
              <View style={styles.viewRow}>
                <Text style={styles.categoryName}>{item.name}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => { setEditingId(item.id); setEditingName(item.name); }}>
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No categories yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  addSection: { flexDirection: 'row', marginBottom: 20, gap: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, backgroundColor: '#fff' },
  categoryItem: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10 },
  viewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryName: { fontSize: 16, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 15 },
  actionText: { color: '#007AFF', fontWeight: 'bold' },
  deleteText: { color: 'red' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editInput: { flex: 1, padding: 8 },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#999' },
});

