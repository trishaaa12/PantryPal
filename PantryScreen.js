import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, Modal, Alert,
  RefreshControl, ScrollView, ActivityIndicator,
  Animated, PanResponder, Dimensions,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import {
  getPantryItems, updateQuantity, refillItem,
  checkThresholds, addPantryItem, deletePantryItem,
} from '../lib/pantryService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH   = (SCREEN_WIDTH - 48) / 2;

// ─── Category config with colors + icons ───────────────────────
const CATEGORY_CONFIG = {
  Grains:     { color: '#C2873F', bg: '#FDF3E3', icon: '🌾' },
  Vegetables: { color: '#3A7D44', bg: '#E8F5E9', icon: '🥦' },
  Spices:     { color: '#C0392B', bg: '#FDEDEC', icon: '🌶️' },
  Oils:       { color: '#8E6BBE', bg: '#F3EEF9', icon: '🫒' },
  Dairy:      { color: '#2980B9', bg: '#EBF5FB', icon: '🥛' },
  Fruits:     { color: '#E67E22', bg: '#FEF9E7', icon: '🍎' },
  Beverages:  { color: '#16A085', bg: '#E8F8F5', icon: '🥤' },
  Pantry:     { color: '#7F8C8D', bg: '#F2F3F4', icon: '🫙' },
};

const getCategoryConfig = (cat) =>
  CATEGORY_CONFIG[cat] || { color: '#7F8C8D', bg: '#F2F3F4', icon: '🫙' };

// ─── Emoji map ──────────────────────────────────────────────────
const getEmoji = (name, category) => {
  const n = (name || '').toLowerCase();
  if (n.includes('rice'))                              return '🌾';
  if (n.includes('dal') || n.includes('lentil'))      return '🫘';
  if (n.includes('flour') || n.includes('atta'))      return '🌾';
  if (n.includes('besan'))                             return '🟡';
  if (n.includes('sooji') || n.includes('semolina'))  return '🌾';
  if (n.includes('poha'))                              return '🍚';
  if (n.includes('potato'))                            return '🥔';
  if (n.includes('onion'))                             return '🧅';
  if (n.includes('tomato'))                            return '🍅';
  if (n.includes('garlic'))                            return '🧄';
  if (n.includes('ginger'))                            return '🫚';
  if (n.includes('chilli') || n.includes('chili'))    return '🌶️';
  if (n.includes('spinach') || n.includes('palak'))   return '🥬';
  if (n.includes('cauliflower'))                       return '🥦';
  if (n.includes('capsicum'))                          return '🫑';
  if (n.includes('carrot'))                            return '🥕';
  if (n.includes('peas'))                              return '🟢';
  if (n.includes('cabbage'))                           return '🥬';
  if (n.includes('okra') || n.includes('bhindi'))     return '🌿';
  if (n.includes('brinjal') || n.includes('baingan')) return '🍆';
  if (n.includes('milk'))                              return '🥛';
  if (n.includes('curd') || n.includes('dahi'))       return '🥣';
  if (n.includes('paneer'))                            return '🧀';
  if (n.includes('butter'))                            return '🧈';
  if (n.includes('ghee'))                              return '🫙';
  if (n.includes('oil'))                               return '🫒';
  if (n.includes('turmeric') || n.includes('haldi'))  return '🟡';
  if (n.includes('cumin') || n.includes('jeera'))     return '🌿';
  if (n.includes('masala'))                            return '🫙';
  if (n.includes('cardamom'))                          return '🌱';
  if (n.includes('cinnamon'))                          return '🪵';
  if (n.includes('cloves'))                            return '🌸';
  if (n.includes('mustard'))                           return '🌱';
  if (n.includes('banana'))                            return '🍌';
  if (n.includes('mango'))                             return '🥭';
  if (n.includes('lemon'))                             return '🍋';
  if (n.includes('sugar'))                             return '🍬';
  if (n.includes('tea') || n.includes('chai'))        return '🍵';
  if (n.includes('coffee'))                            return '☕';
  return getCategoryConfig(category).icon;
};

// ─── Units ──────────────────────────────────────────────────────
const UNITS = ['pieces', 'packets', 'g', 'kg', 'ml', 'L', 'cups'];

// ─── Sort options ────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: 'name',     label: 'A → Z' },
  { key: 'low',      label: 'Lowest stock first' },
  { key: 'category', label: 'Category' },
  { key: 'updated',  label: 'Last updated' },
];

// ─── Animated card component ────────────────────────────────────
function AnimatedCard({ children, index }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 300,
        delay: index * 60, useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration: 300,
        delay: index * 60, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────
export default function PantryScreen() {
  const [items, setItems]                   = useState([]);
  const [search, setSearch]                 = useState('');
  const [sort, setSort]                     = useState('name');
  const [sortVisible, setSortVisible]       = useState(false);
  const [refreshing, setRefreshing]         = useState(false);
  const [modalVisible, setModalVisible]     = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [lookingUp, setLookingUp]           = useState(false);
  const [adding, setAdding]                 = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [permission, setPermission]         = useState(null);
  const [form, setForm] = useState({
    name: '', category: 'Vegetables', unit: 'pieces', quantity: '', max_quantity: '',
  });

  const load = useCallback(async () => {
    try { const data = await getPantryItems(); setItems(data); }
    catch (e) { Alert.alert('Error', e.message); }
  }, []);

  useEffect(() => {
    load();
    Camera.getCameraPermissionsAsync().then(({ status }) => {
      setPermission({ granted: status === 'granted' });
    });
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const requestPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setPermission({ granted: status === 'granted' });
    return { granted: status === 'granted' };
  };

  // ─── Status helpers ────────────────────────────────────────
  const pct    = (item) => Math.round((item.quantity / item.max_quantity) * 100);
  const status = (item) => {
    const p = pct(item);
    if (p < item.critical_threshold) return 'critical';
    if (p <= item.low_threshold)     return 'low';
    return 'ok';
  };

  // ─── Consume helpers ────────────────────────────────────────
  const getConsumeAmount = (item) => {
    const unit = (item.unit || '').toLowerCase();
    const cat  = (item.category || '').toLowerCase();
    if (unit === 'g')       return cat === 'spices' ? 5 : 100;
    if (unit === 'kg')      return 0.1;
    if (unit === 'ml')      return 50;
    if (unit === 'l')       return 0.05;
    if (unit === 'packets') return 1;
    if (unit === 'pieces')  return 1;
    return 1;
  };

  const getConsumeLabel = (item) => {
    const unit = (item.unit || '').toLowerCase();
    const cat  = (item.category || '').toLowerCase();
    if (unit === 'g')       return cat === 'spices' ? '-5g' : '-100g';
    if (unit === 'kg')      return '-100g';
    if (unit === 'ml')      return '-50ml';
    if (unit === 'l')       return '-50ml';
    if (unit === 'packets') return '-1 pkt';
    if (unit === 'pieces')  return '-1';
    return '-1';
  };

  const handleConsume = async (item) => {
    const amount = getConsumeAmount(item);
    const newQty = Math.max(0, parseFloat((item.quantity - amount).toFixed(2)));
    try {
      const updated = await updateQuantity(item.id, newQty);
      await checkThresholds(updated);
      await load();
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const handleCustomConsume = (item) => {
    Alert.prompt(
      `Use ${item.name}`,
      `Current: ${item.quantity} ${item.unit}\nEnter amount used:`,
      async (value) => {
        const amount = parseFloat(value);
        if (isNaN(amount) || amount <= 0) return;
        if (amount > item.quantity) {
          Alert.alert('Too much', `Only ${item.quantity} ${item.unit} left.`);
          return;
        }
        const newQty = Math.max(0, parseFloat((item.quantity - amount).toFixed(2)));
        try {
          const updated = await updateQuantity(item.id, newQty);
          await checkThresholds(updated);
          await load();
        } catch (e) { Alert.alert('Error', e.message); }
      },
      'plain-text', '', 'numeric'
    );
  };

  const handleRefill = async (item) => {
    try { await refillItem(item.id); await load(); }
    catch (e) { Alert.alert('Error', e.message); }
  };

  const handleDelete = (item) => {
    Alert.alert(
      `Delete ${item.name}?`,
      'Removes it from pantry, grocery list and alerts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try { await deletePantryItem(item.id); await load(); }
            catch (e) { Alert.alert('Error', e.message); }
          }
        }
      ]
    );
  };

  // ─── Scanner ────────────────────────────────────────────────
  const openScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera Permission', 'Please allow camera access.');
        return;
      }
    }
    setScannerVisible(true);
  };

  const handleBarcodeScan = async ({ data }) => {
    if (lookingUp) return;
    setLookingUp(true);
    try {
      const res  = await fetch(`https://world.openfoodfacts.org/api/v0/product/${data}.json`);
      const json = await res.json();
      if (json.status === 1 && json.product) {
        const product = json.product;
        const name    = product.product_name || product.product_name_en || '';
        const cat     = mapCategory(product.categories_tags || []);
        const { unit, maxQty } = parseQuantity(product.quantity || '');
        setScannerVisible(false);
        setForm({ name, category: cat, unit, quantity: maxQty, max_quantity: maxQty });
        setModalVisible(true);
        if (name) Alert.alert('✅ Found!', `${name}\nCheck details and tap Add.`);
      } else {
        Alert.alert('❌ Not found', 'Add manually.');
        setScannerVisible(false);
        setModalVisible(true);
      }
    } catch {
      Alert.alert('Error', 'Could not look up product.');
      setScannerVisible(false);
    } finally { setLookingUp(false); }
  };

  const parseQuantity = (str) => {
    if (!str) return { unit: 'pieces', maxQty: '1' };
    const match = str.match(/(\d+\.?\d*)\s*(g|kg|ml|l|L|pieces|pcs|packets)?/i);
    if (!match) return { unit: 'pieces', maxQty: '1' };
    let unit = (match[2] || 'g').toLowerCase();
    let maxQty = match[1];
    if (unit === 'l')   { unit = 'ml'; maxQty = String(parseFloat(maxQty) * 1000); }
    if (unit === 'kg')  { unit = 'g';  maxQty = String(parseFloat(maxQty) * 1000); }
    if (unit === 'pcs') { unit = 'pieces'; }
    return { unit, maxQty };
  };

  const mapCategory = (tags) => {
    const t = tags.join(' ').toLowerCase();
    if (t.includes('vegetable'))                          return 'Vegetables';
    if (t.includes('fruit'))                              return 'Fruits';
    if (t.includes('dairy') || t.includes('milk'))       return 'Dairy';
    if (t.includes('grain') || t.includes('cereal') ||
        t.includes('rice')  || t.includes('flour'))      return 'Grains';
    if (t.includes('oil')   || t.includes('fat'))        return 'Oils';
    if (t.includes('spice') || t.includes('condiment'))  return 'Spices';
    if (t.includes('beverage') || t.includes('drink'))   return 'Beverages';
    return 'Pantry';
  };

  // ─── Add item ───────────────────────────────────────────────
  const handleAdd = async () => {
    if (adding) return;
    if (!form.name || !form.quantity || !form.max_quantity) {
      Alert.alert('Missing fields', 'Please fill in name, quantity and max quantity.');
      return;
    }
    setAdding(true);
    try {
      await addPantryItem({
        name: form.name, category: form.category, unit: form.unit,
        quantity: parseFloat(form.quantity), max_quantity: parseFloat(form.max_quantity),
        low_threshold: 25, critical_threshold: 10,
      });
      setModalVisible(false);
      setForm({ name: '', category: 'Vegetables', unit: 'pieces', quantity: '', max_quantity: '' });
      await load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally { setAdding(false); }
  };

  // ─── Filtered + sorted items ─────────────────────────────────
  const sortLabel = SORT_OPTIONS.find(s => s.key === sort)?.label || 'Sort';

  const filtered = items
    .filter(i => {
      const matchCat    = activeCategory === 'All' || i.category === activeCategory;
      const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (sort === 'name')     return a.name.localeCompare(b.name);
      if (sort === 'low')      return pct(a) - pct(b);
      if (sort === 'category') return (a.category || '').localeCompare(b.category || '');
      if (sort === 'updated')  return new Date(b.last_updated || 0) - new Date(a.last_updated || 0);
      return 0;
    });

  // Group by category
  const grouped = filtered.reduce((acc, item) => {
    const cat = item.category || 'Pantry';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const counts = {
    total:    items.length,
    ok:       items.filter(i => status(i) === 'ok').length,
    low:      items.filter(i => status(i) === 'low').length,
    critical: items.filter(i => status(i) === 'critical').length,
  };

  // ─── Render 2-column card ────────────────────────────────────
  const renderCard = (item, index) => {
    const p      = pct(item);
    const s      = status(item);
    const cfg    = getCategoryConfig(item.category);
    const emoji  = getEmoji(item.name, item.category);
    const isPacket = (item.unit || '').toLowerCase() === 'packets';

    const barColor = s === 'critical' ? '#E24B4A' : s === 'low' ? '#F39C12' : cfg.color;

    return (
      <AnimatedCard key={item.id} index={index}>
        <TouchableOpacity
          style={[
            styles.card,
            s === 'critical' && { borderColor: '#E24B4A', borderWidth: 1.5 },
            s === 'low'      && { borderColor: '#F39C12', borderWidth: 1 },
          ]}
          onLongPress={() => handleCustomConsume(item)}
          activeOpacity={0.85}
        >
          {/* Status dot */}
          {s !== 'ok' && (
            <View style={[styles.statusDot, { backgroundColor: barColor }]} />
          )}

          {/* Emoji + name */}
          <Text style={styles.cardEmoji}>{emoji}</Text>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>

          {/* Quantity */}
          <Text style={[styles.cardQty, { color: cfg.color }]}>
            {isPacket
              ? `${item.quantity} pkts`
              : `${item.quantity}${item.unit}`
            }
          </Text>

          {/* Progress bar */}
          <View style={styles.cardBarBg}>
            <View style={[
              styles.cardBarFill,
              { width: `${Math.min(p, 100)}%`, backgroundColor: barColor }
            ]} />
          </View>

          {/* Percent */}
          <Text style={[styles.cardPct, { color: barColor }]}>
            {isPacket ? `${item.quantity}/${item.max_quantity}` : `${p}%`}
          </Text>

          {/* Action buttons */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.cardBtn, { backgroundColor: cfg.bg, borderColor: cfg.color }]}
              onPress={() => handleConsume(item)}
            >
              <Text style={[styles.cardBtnTxt, { color: cfg.color }]}>
                {getConsumeLabel(item)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cardBtnRefill, { backgroundColor: cfg.color }]}
              onPress={() => handleRefill(item)}
            >
              <Text style={styles.cardBtnRefillTxt}>↑</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cardBtnDelete}
              onPress={() => handleDelete(item)}
            >
              <Text style={styles.cardBtnDeleteTxt}>✕</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </AnimatedCard>
    );
  };

  // ─── Render category section ─────────────────────────────────
  const renderCategory = (catName, catItems) => {
    const cfg  = getCategoryConfig(catName);
    const rows = [];
    for (let i = 0; i < catItems.length; i += 2) {
      rows.push(catItems.slice(i, i + 2));
    }
    return (
      <View key={catName} style={styles.categorySection}>
        {/* Category header */}
        <View style={[styles.categoryHeader, { backgroundColor: cfg.bg }]}>
          <Text style={styles.categoryHeaderIcon}>{cfg.icon}</Text>
          <Text style={[styles.categoryHeaderText, { color: cfg.color }]}>{catName}</Text>
          <View style={[styles.categoryCount, { backgroundColor: cfg.color }]}>
            <Text style={styles.categoryCountTxt}>{catItems.length}</Text>
          </View>
        </View>

        {/* 2-column grid */}
        {rows.map((row, i) => (
          <View key={i} style={styles.row}>
            {row.map((item, j) => (
              <View key={item.id} style={styles.col}>
                {renderCard(item, i * 2 + j)}
              </View>
            ))}
            {/* Empty filler if odd number */}
            {row.length === 1 && <View style={styles.col} />}
          </View>
        ))}
      </View>
    );
  };

  // ─── Category tabs ────────────────────────────────────────────
  const allCategories = ['All', ...Object.keys(grouped)];

  // ─── UI ─────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* Header stats */}
      <View style={styles.header}>
        <View style={styles.statsRow}>
          {[
            { label: 'Total',    val: counts.total,    color: '#2C3E50' },
            { label: 'Good',     val: counts.ok,       color: '#27AE60' },
            { label: 'Low',      val: counts.low,      color: '#F39C12' },
            { label: 'Critical', val: counts.critical, color: '#E24B4A' },
          ].map(s => (
            <View key={s.label} style={styles.statPill}>
              <Text style={[styles.statNum, { color: s.color }]}>{s.val}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Search + Sort */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search pantry..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#bbb"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setSortVisible(true)}>
          <Text style={styles.sortBtnTxt}>⇅</Text>
        </TouchableOpacity>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.tabRow}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}
      >
        {allCategories.map(cat => {
          const cfg    = getCategoryConfig(cat);
          const active = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[
                styles.tab,
                active && { backgroundColor: cat === 'All' ? '#2C3E50' : cfg.color }
              ]}
            >
              {cat !== 'All' && <Text style={styles.tabIcon}>{cfg.icon}</Text>}
              <Text style={[styles.tabTxt, active && styles.tabTxtActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Main content */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🫙</Text>
            <Text style={styles.emptyTxt}>No items found</Text>
            <Text style={styles.emptySub}>Try a different filter or add items</Text>
          </View>
        ) : activeCategory === 'All' ? (
          // Show all categories grouped
          Object.entries(grouped).map(([cat, catItems]) =>
            renderCategory(cat, catItems)
          )
        ) : (
          // Show single category
          renderCategory(activeCategory, filtered)
        )}
      </ScrollView>

      {/* FAB */}
      <View style={styles.fabRow}>
        <TouchableOpacity style={[styles.fab, styles.fabScan]} onPress={openScanner}>
          <Text style={styles.fabTxt}>📷</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fab, styles.fabAdd]} onPress={() => setModalVisible(true)}>
          <Text style={styles.fabTxt}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* ── SORT MODAL ── */}
      <Modal visible={sortVisible} animationType="fade" transparent>
        <TouchableOpacity style={styles.overlay} onPress={() => setSortVisible(false)}>
          <View style={styles.sortModal}>
            <Text style={styles.sortTitle}>Sort by</Text>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.sortOption, sort === opt.key && styles.sortOptionActive]}
                onPress={() => { setSort(opt.key); setSortVisible(false); }}
              >
                <Text style={[styles.sortOptionTxt, sort === opt.key && { color: '#639922', fontWeight: '700' }]}>
                  {sort === opt.key ? '✓  ' : '    '}{opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── SCANNER MODAL ── */}
      <Modal visible={scannerVisible} animationType="slide">
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>📷 Scan Barcode</Text>
            <TouchableOpacity onPress={() => setScannerVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={lookingUp ? undefined : handleBarcodeScan}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128', 'code39'],
            }}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
            {lookingUp ? (
              <View style={styles.lookingUp}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.lookingUpTxt}>Looking up product...</Text>
              </View>
            ) : (
              <Text style={styles.scannerHint}>Point at the barcode on the packet</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.manualBtn}
            onPress={() => { setScannerVisible(false); setModalVisible(true); }}
          >
            <Text style={styles.manualBtnTxt}>✏️ Add manually instead</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── ADD ITEM MODAL ── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>✨ Add to Pantry</Text>

            {[
              ['Item name',           'name',         'e.g. Chaat Masala'],
              ['Current quantity',    'quantity',     'e.g. 2'],
              ['Max / full capacity', 'max_quantity', 'e.g. 5'],
            ].map(([label, key, ph]) => (
              <View key={key} style={styles.formGroup}>
                <Text style={styles.formLabel}>{label}</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={ph}
                  placeholderTextColor="#ccc"
                  value={form[key]}
                  onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
                  keyboardType={key !== 'name' ? 'numeric' : 'default'}
                />
              </View>
            ))}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Unit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {UNITS.map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.chip, form.unit === u && styles.chipActive]}
                    onPress={() => setForm(f => ({ ...f, unit: u }))}
                  >
                    <Text style={[styles.chipTxt, form.unit === u && styles.chipTxtActive]}>
                      {u === 'packets' ? '📦 packets' : u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {Object.entries(CATEGORY_CONFIG).map(([cat, cfg]) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, form.category === cat && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                    onPress={() => setForm(f => ({ ...f, category: cat }))}
                  >
                    <Text style={[styles.chipTxt, form.category === cat && { color: '#fff' }]}>
                      {cfg.icon} {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[styles.addItemBtn, adding && { opacity: 0.5 }]}
              onPress={handleAdd}
              disabled={adding}
            >
              <Text style={styles.addItemBtnTxt}>{adding ? 'Adding...' : '+ Add to Pantry'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelWrap}>
              <Text style={styles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F7F7F5' },

  // Header
  header:          { backgroundColor: '#fff', paddingTop: 8, paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  statsRow:        { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  statPill:        { flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 0.5, borderColor: '#eee' },
  statNum:         { fontSize: 20, fontWeight: '700' },
  statLbl:         { fontSize: 10, color: '#aaa', marginTop: 1 },

  // Search
  searchRow:       { flexDirection: 'row', padding: 12, gap: 8 },
  searchWrap:      { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, borderWidth: 0.5, borderColor: '#eee' },
  searchIcon:      { fontSize: 14, marginRight: 6 },
  searchInput:     { flex: 1, fontSize: 14, color: '#1a1a1a', paddingVertical: 10 },
  searchClear:     { fontSize: 12, color: '#bbb', padding: 4 },
  sortBtn:         { backgroundColor: '#fff', borderRadius: 14, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#eee' },
  sortBtnTxt:      { fontSize: 18, color: '#444' },

  // Tabs
  tabRow:          { maxHeight: 52, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  tab:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F0F0EE', gap: 4 },
  tabIcon:         { fontSize: 13 },
  tabTxt:          { fontSize: 13, color: '#666', fontWeight: '500' },
  tabTxtActive:    { color: '#fff', fontWeight: '700' },

  // Category section
  categorySection: { marginBottom: 16, marginTop: 12 },
  categoryHeader:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, marginBottom: 10, gap: 8 },
  categoryHeaderIcon: { fontSize: 18 },
  categoryHeaderText: { fontSize: 15, fontWeight: '700', flex: 1 },
  categoryCount:   { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  categoryCountTxt:{ color: '#fff', fontSize: 12, fontWeight: '700' },

  // Grid
  row:             { flexDirection: 'row', gap: 12, marginBottom: 12 },
  col:             { flex: 1 },

  // Card
  card:            {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 0.5,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 160,
  },
  statusDot:       { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4 },
  cardEmoji:       { fontSize: 28, marginBottom: 6 },
  cardName:        { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 4, lineHeight: 18 },
  cardQty:         { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  cardBarBg:       { height: 5, backgroundColor: '#F0F0EE', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  cardBarFill:     { height: '100%', borderRadius: 3 },
  cardPct:         { fontSize: 11, fontWeight: '600', marginBottom: 8 },
  cardActions:     { flexDirection: 'row', gap: 5, alignItems: 'center' },
  cardBtn:         { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  cardBtnTxt:      { fontSize: 11, fontWeight: '700' },
  cardBtnRefill:   { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardBtnRefillTxt:{ color: '#fff', fontSize: 16, fontWeight: '700' },
  cardBtnDelete:   { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE' },
  cardBtnDeleteTxt:{ color: '#E24B4A', fontSize: 11, fontWeight: '700' },

  // Empty
  emptyWrap:       { alignItems: 'center', paddingTop: 80 },
  emptyIcon:       { fontSize: 56, marginBottom: 12 },
  emptyTxt:        { fontSize: 18, color: '#888', fontWeight: '600' },
  emptySub:        { fontSize: 13, color: '#bbb', marginTop: 6 },

  // FAB
  fabRow:          { position: 'absolute', bottom: 28, right: 20, gap: 12 },
  fab:             { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  fabScan:         { backgroundColor: '#2980B9' },
  fabAdd:          { backgroundColor: '#27AE60' },
  fabTxt:          { fontSize: 22, color: '#fff' },

  // Modals
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  sortModal:       { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: 260 },
  sortTitle:       { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 14 },
  sortOption:      { paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  sortOptionActive:{ backgroundColor: '#F8FFF4' },
  sortOptionTxt:   { fontSize: 15, color: '#444' },

  // Scanner
  scannerContainer:{ flex: 1, backgroundColor: '#000' },
  scannerHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 56, backgroundColor: '#000' },
  scannerTitle:    { color: '#fff', fontSize: 18, fontWeight: '700' },
  closeBtn:        { backgroundColor: '#333', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  closeBtnTxt:     { color: '#fff', fontSize: 15 },
  camera:          { flex: 1 },
  scannerOverlay:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  scannerFrame:    { width: 260, height: 160, borderWidth: 2.5, borderColor: '#27AE60', borderRadius: 16, marginBottom: 24 },
  lookingUp:       { alignItems: 'center', gap: 12 },
  lookingUpTxt:    { color: '#fff', fontSize: 16, fontWeight: '600' },
  scannerHint:     { color: '#fff', fontSize: 14, textAlign: 'center', paddingHorizontal: 32, backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 12 },
  manualBtn:       { backgroundColor: '#111', padding: 18, alignItems: 'center' },
  manualBtnTxt:    { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Add modal
  modalBg:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal:           { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44 },
  modalTitle:      { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 18 },
  formGroup:       { marginBottom: 16 },
  formLabel:       { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 7, letterSpacing: 0.3 },
  formInput:       { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, fontSize: 15, color: '#1a1a1a', backgroundColor: '#FAFAFA' },
  chip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f8f8f8' },
  chipActive:      { backgroundColor: '#27AE60', borderColor: '#27AE60' },
  chipTxt:         { fontSize: 13, color: '#555', fontWeight: '500' },
  chipTxtActive:   { color: '#fff', fontWeight: '700' },
  addItemBtn:      { backgroundColor: '#27AE60', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 6 },
  addItemBtnTxt:   { color: '#fff', fontSize: 16, fontWeight: '800' },
  cancelWrap:      { alignItems: 'center', marginTop: 12 },
  cancelTxt:       { color: '#aaa', fontSize: 14 },
});