import React, { useState, useEffect } from 'react';
import { View, Text, Switch, ScrollView, Alert } from 'react-native';
import { getSettings, updateSettings } from '../lib/pantryService';
 
export default function SettingsScreen() {
  const [lowAlerts,   setLowAlerts]   = useState(true);
  const [critAlerts,  setCritAlerts]  = useState(true);
  const [autoGrocery, setAutoGrocery] = useState(true);
 
  useEffect(() => {
    getSettings()
      .then(data => {
        if (data) {
          // ✅ force real booleans — fixes crash on mobile
          setLowAlerts(data.notify_low === true || data.notify_low === 'true' || data.notify_low === 1);
          setCritAlerts(data.notify_critical === true || data.notify_critical === 'true' || data.notify_critical === 1);
          setAutoGrocery(data.auto_add_to_grocery === true || data.auto_add_to_grocery === 'true' || data.auto_add_to_grocery === 1);
        }
      })
      .catch(() => {}); // use defaults if settings not found
  }, []);
 
  const toggle = async (key, value, setter) => {
    setter(value);
    try { await updateSettings({ [key]: value }); }
    catch (e) { Alert.alert('Error', e.message); }
  };
 
  const rows = [
    { label: 'Low stock alerts',    key: 'notify_low',          value: lowAlerts,   setter: setLowAlerts },
    { label: 'Critical alerts',     key: 'notify_critical',     value: critAlerts,  setter: setCritAlerts },
    { label: 'Auto-add to grocery', key: 'auto_add_to_grocery', value: autoGrocery, setter: setAutoGrocery },
  ];
 
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8f8f6', padding: 16 }}>
 
      <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
 
      {rows.map(row => (
        <View key={row.key} style={styles.row}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Switch
            value={Boolean(row.value)}
            onValueChange={v => toggle(row.key, v, row.setter)}
            trackColor={{ false: '#eee', true: '#639922' }}
            thumbColor="#fff"
          />
        </View>
      ))}
 
      <Text style={styles.version}>PantryPal v1.0 · Built with ❤️</Text>
 
    </ScrollView>
  );
}
 
const styles = {
  sectionLabel: { fontSize: 13, color: '#aaa', fontWeight: '600', marginBottom: 12, letterSpacing: 0.5 },
  row:          { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e5e5' },
  rowLabel:     { flex: 1, fontSize: 15, color: '#1a1a1a' },
  version:      { fontSize: 11, color: '#bbb', marginTop: 24, textAlign: 'center' },
};
 