import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { getNotifications, markNotifRead } from '../lib/pantryService';

export default function RemindersScreen() {
  const [notifs, setNotifs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const data = await getNotifications(); setNotifs(data); }
    catch (e) { Alert.alert('Error', e.message); }
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleRead = async (id) => {
    try { await markNotifRead(id); await load(); }
    catch (e) { Alert.alert('Error', e.message); }
  };

  const renderItem = ({ item }) => {
    const isCritical = item.type === 'critical';
    return (
      <TouchableOpacity
        style={[styles.card, isCritical ? styles.cardCritical : styles.cardLow, !item.is_read && styles.cardUnread]}
        onPress={() => !item.is_read && handleRead(item.id)}
      >
        <View style={styles.cardTop}>
          <View style={[styles.typeBadge, { backgroundColor: isCritical ? '#FCEBEB' : '#FAEEDA' }]}>
            <Text style={[styles.typeText, { color: isCritical ? '#791F1F' : '#633806' }]}>
              {isCritical ? '🔴 Critical' : '🟡 Low stock'}
            </Text>
          </View>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}{item.is_read ? ' · read' : ' · tap to dismiss'}</Text>
      </TouchableOpacity>
    );
  };

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <View style={styles.container}>
      {unread > 0 && (
        <View style={styles.banner}>
          <Text style={styles.bannerTxt}>⚠ {unread} unread alert{unread > 1 ? 's' : ''} — tap to dismiss</Text>
        </View>
      )}
      <FlatList
        data={notifs}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTxt}>No alerts yet</Text>
            <Text style={styles.emptySub}>Alerts appear when items drop below thresholds</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f6' },
  banner: { backgroundColor: '#FAEEDA', padding: 12, margin: 16, marginBottom: 0, borderRadius: 10 },
  bannerTxt: { color: '#633806', fontSize: 13, fontWeight: '500', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: '#e5e5e5' },
  cardCritical: { borderLeftWidth: 4, borderLeftColor: '#E24B4A', borderRadius: 0, borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  cardLow: { borderLeftWidth: 4, borderLeftColor: '#BA7517', borderRadius: 0, borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  cardUnread: { backgroundColor: '#FFFEF8' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  typeText: { fontSize: 12, fontWeight: '600' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E24B4A' },
  message: { fontSize: 14, color: '#1a1a1a', lineHeight: 20, marginBottom: 6 },
  time: { fontSize: 11, color: '#aaa' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTxt: { fontSize: 16, color: '#888', fontWeight: '500' },
  emptySub: { fontSize: 13, color: '#bbb', marginTop: 6, textAlign: 'center' },
});

