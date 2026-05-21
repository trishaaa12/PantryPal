import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, TextInput, RefreshControl, Share,
} from 'react-native';
import {
  getGroceryItems, toggleGroceryItem,
  clearCheckedGrocery, addGroceryItem,
} from '../lib/pantryService';
 
export default function GroceryScreen() {
  const [items, setItems]           = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [newItem, setNewItem]       = useState('');
  const [search, setSearch]         = useState('');
 
  // ✅ Force all boolean fields to real booleans
  // Supabase sometimes returns "true"/"false" as strings on mobile
  const normalizeItem = (item) => ({
    ...item,
    is_checked: item.is_checked === true  || item.is_checked === 'true'  || item.is_checked === 1,
    auto_added: item.auto_added === true  || item.auto_added === 'true'  || item.auto_added === 1,
  });
 
  const load = useCallback(async () => {
    try {
      const data = await getGroceryItems();
      setItems(data.map(normalizeItem));
    } catch (e) { Alert.alert('Error', e.message); }
  }, []);
 
  useEffect(() => { load(); }, [load]);
 
  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };
 
  const handleToggle = async (item) => {
    try {
      // ✅ make sure we pass a real boolean
      const current = item.is_checked === true;
      await toggleGroceryItem(item.id, !current);
      await load();
    } catch (e) { Alert.alert('Error', e.message); }
  };
 
  const handleAdd = async () => {
    if (!newItem.trim()) return;
    try {
      await addGroceryItem(newItem.trim());
      setNewItem('');
      await load();
    } catch (e) { Alert.alert('Error', e.message); }
  };
 
  const handleClear = async () => {
    try { await clearCheckedGrocery(); await load(); }
    catch (e) { Alert.alert('Error', e.message); }
  };
 
  // ─── Share grocery list ───────────────────────────────────────
  const handleShare = async () => {
    const uncheckedItems = items.filter(i => !i.is_checked);
    if (uncheckedItems.length === 0) {
      Alert.alert('Nothing to share', 'All items are already checked off!');
      return;
    }
    const lines = uncheckedItems.map(i =>
      `${i.auto_added ? '🔴' : '⬜'} ${i.name}`
    );
    const message =
      `🛒 *Grocery List* (${uncheckedItems.length} items)\n\n` +
      lines.join('\n') +
      `\n\n_Shared from PantryPal_ 🫙`;
    try {
      await Share.share({ message });
    } catch (e) { Alert.alert('Error', e.message); }
  };
 
  // ─── Filter by search ─────────────────────────────────────────
  const filtered  = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );
  const unchecked = filtered.filter(i => !i.is_checked);
  const checked   = filtered.filter(i => i.is_checked);
 
  // ─── Render each grocery item ─────────────────────────────────
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.item, item.is_checked && styles.itemChecked]}
      onPress={() => handleToggle(item)}
    >
      <View style={[styles.checkbox, item.is_checked && styles.checkboxDone]}>
        {item.is_checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemName, item.is_checked && styles.itemNameDone]}>
          {item.name}
        </Text>
        <Text style={styles.itemSub}>
          {item.auto_added ? '🤖 auto-added' : '✏️ manual'}
        </Text>
      </View>
    </TouchableOpacity>
  );
 
  // ─── UI ───────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
 
      {/* Add row */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Add item manually..."
          placeholderTextColor="#aaa"
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={styles.addBtnTxt}>Add</Text>
        </TouchableOpacity>
      </View>
 
      {/* Search */}
      <TextInput
        style={styles.search}
        placeholder="Search grocery list..."
        placeholderTextColor="#aaa"
        value={search}
        onChangeText={setSearch}
      />
 
      {/* Summary + actions */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryTxt}>
          {unchecked.length} remaining · {checked.length} done
        </Text>
        <View style={styles.summaryActions}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnTxt}>📤 Share</Text>
          </TouchableOpacity>
          {checked.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <Text style={styles.clearTxt}>Clear done</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
 
      {/* List */}
      <FlatList
        data={[...unchecked, ...checked]}
        keyExtractor={i => i.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyTxt}>
              {search ? 'No items match your search' : 'Grocery list is empty'}
            </Text>
            <Text style={styles.emptySub}>
              Items auto-appear when pantry stock is low
            </Text>
          </View>
        }
      />
    </View>
  );
}
 
const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f8f8f6' },
  addRow:         { flexDirection: 'row', padding: 16, paddingBottom: 8, gap: 10 },
  input:          { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, fontSize: 14, borderWidth: 0.5, borderColor: '#e5e5e5', color: '#1a1a1a' },
  addBtn:         { backgroundColor: '#639922', borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  addBtnTxt:      { color: '#fff', fontWeight: '600', fontSize: 14 },
  search:         { marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e5e5e5', fontSize: 14, color: '#1a1a1a' },
  summaryRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 4 },
  summaryTxt:     { fontSize: 13, color: '#888' },
  summaryActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shareBtn:       { backgroundColor: '#EAF3DE', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 0.5, borderColor: '#639922' },
  shareBtnTxt:    { color: '#27500A', fontSize: 13, fontWeight: '500' },
  clearTxt:       { fontSize: 13, color: '#E24B4A', fontWeight: '500' },
  item:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 0.5, borderColor: '#e5e5e5', gap: 12 },
  itemChecked:    { opacity: 0.5 },
  checkbox:       { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  checkboxDone:   { backgroundColor: '#1D9E75', borderColor: '#1D9E75' },
  checkmark:      { color: '#fff', fontSize: 13, fontWeight: '700' },
  itemName:       { fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
  itemNameDone:   { textDecorationLine: 'line-through', color: '#aaa' },
  itemSub:        { fontSize: 12, color: '#aaa', marginTop: 2 },
  empty:          { alignItems: 'center', paddingTop: 60 },
  emptyIcon:      { fontSize: 48, marginBottom: 12 },
  emptyTxt:       { fontSize: 16, color: '#888', fontWeight: '500' },
  emptySub:       { fontSize: 13, color: '#bbb', marginTop: 6, textAlign: 'center' },
});
 