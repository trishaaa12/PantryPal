import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView,
  Platform, Alert
} from 'react-native';
import { getPantryItems, saveRecipe, getSavedRecipes, rateRecipe } from '../lib/pantryService';

export default function RecipesScreen() {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: "👋 Hi! I'm your kitchen assistant.\n\nI'll suggest recipes based on what's in your pantry — and prioritize items running low so nothing goes to waste.\n\nType anything like \"what can I make?\" or \"quick breakfast ideas\" to get started!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pantry, setPantry] = useState([]);
  const [saved, setSaved] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    getPantryItems().then(setPantry).catch(console.error);
    getSavedRecipes().then(setSaved).catch(console.error);
  }, []);

  const pct = (item) => Math.round((item.quantity / item.max_quantity) * 100);

  // ─── Recipe Database ───────────────────────────────────────────
  const RECIPES = [
    // Breakfast
    { name: "Besan Chilla",        emoji: "🫓", category: "breakfast", needs: ['besan'],                       desc: "Gram flour pancake with chili & onion" },
    { name: "Masala Oats",         emoji: "🥣", category: "breakfast", needs: ['oats'],                        desc: "Savory oats with veggies & spices" },
    { name: "Egg Bhurji",          emoji: "🍳", category: "breakfast", needs: ['egg', 'onion'],                desc: "Scrambled eggs with onion, tomato & spices" },
    { name: "Poha",                emoji: "🍚", category: "breakfast", needs: ['poha', 'onion'],               desc: "Flattened rice with mustard seeds & curry leaves" },
    { name: "Bread Upma",          emoji: "🍞", category: "breakfast", needs: ['bread', 'onion'],              desc: "Bread tossed with onion, mustard seeds & spices" },
    { name: "Banana Smoothie",     emoji: "🍌", category: "breakfast", needs: ['banana', 'milk'],              desc: "Banana blended with milk & honey" },
    { name: "Upma",                emoji: "🫕", category: "breakfast", needs: ['semolina', 'onion'],           desc: "Semolina cooked with veggies & mustard seeds" },

    // Lunch / Dinner
    { name: "Dal Tadka",           emoji: "🍛", category: "lunch",     needs: ['toor dal'],                    desc: "Lentils with turmeric, garlic & ghee tempering" },
    { name: "Masoor Dal",          emoji: "🍛", category: "lunch",     needs: ['lentils', 'tomato'],           desc: "Red lentils with onion, tomato & spices" },
    { name: "Aloo Sabzi",          emoji: "🥘", category: "lunch",     needs: ['potato', 'onion'],             desc: "Spiced potato with onion & cumin" },
    { name: "Aloo Tamatar",        emoji: "🍅", category: "lunch",     needs: ['potato', 'tomato'],            desc: "Potato in tangy tomato gravy" },
    { name: "Jeera Rice",          emoji: "🍚", category: "lunch",     needs: ['rice'],                        desc: "Basmati rice tempered with cumin & ghee" },
    { name: "Veg Pulao",           emoji: "🍚", category: "lunch",     needs: ['rice', 'vegetables'],          desc: "Fragrant rice cooked with mixed vegetables" },
    { name: "Chole",               emoji: "🫘", category: "lunch",     needs: ['chickpeas', 'onion', 'tomato'],desc: "Spiced chickpeas in rich onion-tomato gravy" },
    { name: "Rajma",               emoji: "🫘", category: "lunch",     needs: ['kidney beans', 'onion'],       desc: "Kidney beans in thick tomato-onion gravy" },
    { name: "Paneer Bhurji",       emoji: "🧀", category: "lunch",     needs: ['paneer', 'onion'],             desc: "Crumbled paneer with onion, capsicum & spices" },
    { name: "Paneer Butter Masala",emoji: "🍛", category: "lunch",     needs: ['paneer', 'tomato', 'cream'],   desc: "Paneer in rich buttery tomato gravy" },
    { name: "Matar Paneer",        emoji: "🍛", category: "lunch",     needs: ['paneer', 'peas'],              desc: "Paneer and peas in spiced onion-tomato gravy" },
    { name: "Egg Curry",           emoji: "🥚", category: "lunch",     needs: ['egg', 'tomato', 'onion'],      desc: "Boiled eggs in spicy onion-tomato curry" },
    { name: "Bhindi Masala",       emoji: "🌿", category: "lunch",     needs: ['okra', 'onion'],               desc: "Stir-fried okra with onion & spices" },
    { name: "Palak Dal",           emoji: "🍃", category: "lunch",     needs: ['spinach', 'lentils'],          desc: "Spinach cooked with lentils & spices" },
    { name: "Aloo Palak",          emoji: "🍃", category: "lunch",     needs: ['potato', 'spinach'],           desc: "Potato and spinach cooked with garlic & spices" },
    { name: "Tomato Rice",         emoji: "🍅", category: "lunch",     needs: ['rice', 'tomato'],              desc: "Tangy tomato rice with mustard seeds" },
    { name: "Khichdi",             emoji: "🫕", category: "lunch",     needs: ['rice', 'lentils'],             desc: "Comforting rice and lentil one-pot dish" },

    // Snacks
    { name: "Tomato Onion Salad",  emoji: "🥗", category: "snack",     needs: ['tomato', 'onion'],             desc: "Fresh salad with lemon & chaat masala" },
    { name: "Aloo Chaat",          emoji: "🥔", category: "snack",     needs: ['potato'],                      desc: "Boiled potato with chutney & chaat masala" },
    { name: "Peanut Chaat",        emoji: "🥜", category: "snack",     needs: ['peanuts', 'onion'],            desc: "Roasted peanuts with onion, chili & lemon" },
    { name: "Banana Chips",        emoji: "🍌", category: "snack",     needs: ['banana'],                      desc: "Thinly sliced banana fried till crispy" },

    // Quick / fallback
    { name: "Simple Stir Fry",     emoji: "🍳", category: "quick",     needs: ['onion'],                       desc: "Any vegetables stir-fried with basic spices" },
    { name: "Tadka Rice",          emoji: "🍚", category: "quick",     needs: ['rice'],                        desc: "Plain rice with a simple mustard-cumin tadka" },
  ];

  // ─── Match recipes to what's in pantry ────────────────────────
  const generateRecipes = (userMessage) => {
    if (pantry.length === 0) {
      return "Your pantry appears to be empty! Add some items in the Pantry tab first and I'll suggest recipes for you. 🛒";
    }

    const items = pantry.map(i => i.name.toLowerCase());
    const lowItems = pantry.filter(i => pct(i) <= i.low_threshold);
    const lowNames = lowItems.map(i => i.name.toLowerCase());

    // detect category from user message
    const msg = userMessage.toLowerCase();
    let filterCategory = null;
    if (msg.includes('breakfast') || msg.includes('morning')) filterCategory = 'breakfast';
    else if (msg.includes('snack') || msg.includes('quick bite')) filterCategory = 'snack';
    else if (msg.includes('lunch') || msg.includes('dinner')) filterCategory = 'lunch';
    else if (msg.includes('quick') || msg.includes('fast') || msg.includes('easy')) filterCategory = 'quick';

    // match recipes
    let matched = RECIPES.filter(r =>
      r.needs.every(ingredient =>
        items.some(i => i.includes(ingredient) || ingredient.includes(i))
      )
    );

    // filter by category if detected
    if (filterCategory) {
      const categoryMatched = matched.filter(r => r.category === filterCategory);
      if (categoryMatched.length > 0) matched = categoryMatched;
    }

    // sort — recipes using low stock items come first
    matched.sort((a, b) => {
      const aUsesLow = a.needs.some(n => lowNames.some(l => l.includes(n) || n.includes(l)));
      const bUsesLow = b.needs.some(n => lowNames.some(l => l.includes(n) || n.includes(l)));
      return (bUsesLow ? 1 : 0) - (aUsesLow ? 1 : 0);
    });

    const top = matched.slice(0, 4);

    if (top.length === 0) {
      return `I couldn't find matching recipes for what's in your pantry right now.\n\nTry adding items like:\n• Potato, onion, tomato\n• Rice, lentils, dal\n• Paneer, eggs, besan\n\nto get recipe suggestions! 🥕`;
    }

    const recipeList = top
      .map(r => `${r.emoji} ${r.name}\n   ${r.desc}${lowNames.some(l => r.needs.some(n => l.includes(n) || n.includes(l))) ? ' ⚠️ uses low stock item' : ''}`)
      .join('\n\n');

    const lowNote = lowItems.length > 0
      ? `\n\n⚠️ Running low: ${lowItems.map(i => `${i.name} (${pct(i)}%)`).join(', ')}\nRecipes using these are shown first.`
      : '\n\n✅ All your pantry items are well stocked!';

    const categoryNote = filterCategory
      ? `\nShowing ${filterCategory} ideas:`
      : '\nBased on your pantry:';

    return `Here are some recipes for you!${categoryNote}\n\n${recipeList}${lowNote}`;
  };

  // ─── Send message ─────────────────────────────────────────────
  const send = () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    setTimeout(() => {
      const reply = generateRecipes(userMsg);
      setMessages(prev => [...prev, { role: 'bot', text: reply, saveable: true }]);
      setLoading(false);
    }, 600);
  };

  // ─── Quick suggestion chips ───────────────────────────────────
  const CHIPS = ['What can I make?', 'Breakfast ideas', 'Quick lunch', 'Use low stock'];

  const handleChip = (chip) => {
    setInput(chip);
  };

  // ─── Save recipe ──────────────────────────────────────────────
  const handleSave = async (text) => {
    const title = text
      .split('\n')
      .find(line => line.includes('emoji') || line.trim().length > 0)
      ?.replace(/[#*🍛🥘🫓🍚🍳🫕🧀🥗🥚🫘🌿🍃🍅🍌🥜🥔🍞🫓]/g, '')
      .trim()
      .substring(0, 50) || 'Recipe';

    try {
      await saveRecipe(title, text);
      const updated = await getSavedRecipes();
      setSaved(updated);
      Alert.alert('✅ Saved!', 'Recipe added to your collection.');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // ─── Rate recipe ──────────────────────────────────────────────
  const handleRate = async (id, rating) => {
    try {
      await rateRecipe(id, rating);
      const updated = await getSavedRecipes();
      setSaved(updated);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // ─── UI ───────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Saved recipes toggle */}
      {saved.length > 0 && (
        <TouchableOpacity style={styles.savedToggle} onPress={() => setShowSaved(!showSaved)}>
          <Text style={styles.savedToggleTxt}>
            {showSaved ? '💬 Back to chat' : `📖 Saved recipes (${saved.length})`}
          </Text>
        </TouchableOpacity>
      )}

      {showSaved ? (
        // ── Saved recipes view ──
        <ScrollView style={styles.chat} contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.sectionTitle}>YOUR SAVED RECIPES</Text>
          {saved.map(r => (
            <View key={r.id} style={styles.savedCard}>
              <Text style={styles.savedTitle}>{r.recipe_title}</Text>
              <Text style={styles.savedBody} numberOfLines={4}>{r.full_recipe}</Text>
              <View style={styles.stars}>
                {[1,2,3,4,5].map(s => (
                  <TouchableOpacity key={s} onPress={() => handleRate(r.id, s)}>
                    <Text style={{ fontSize: 22, color: s <= (r.rating || 0) ? '#BA7517' : '#ddd' }}>★</Text>
                  </TouchableOpacity>
                ))}
                <Text style={styles.ratingTxt}>
                  {r.rating ? `${r.rating}/5` : 'Tap to rate'}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        // ── Chat view ──
        <>
          <ScrollView
            ref={scrollRef}
            style={styles.chat}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            contentContainerStyle={{ padding: 16, gap: 10 }}
          >
            {messages.map((m, i) => (
              <View key={i}>
                {m.role === 'bot' && (
                  <Text style={styles.botLabel}>🍽️ Kitchen Assistant</Text>
                )}
                <View style={[styles.bubble, m.role === 'bot' ? styles.botBubble : styles.userBubble]}>
                  <Text style={m.role === 'bot' ? styles.botTxt : styles.userTxt}>{m.text}</Text>
                </View>
                {m.saveable && (
                  <TouchableOpacity style={styles.saveBtn} onPress={() => handleSave(m.text)}>
                    <Text style={styles.saveBtnTxt}>+ Save these recipes</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {loading && (
              <View>
                <Text style={styles.botLabel}>🍽️ Kitchen Assistant</Text>
                <View style={styles.botBubble}>
                  <Text style={styles.botTxt}>Checking your pantry... 🔍</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Quick chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}
          >
            {CHIPS.map(chip => (
              <TouchableOpacity key={chip} style={styles.chip} onPress={() => handleChip(chip)}>
                <Text style={styles.chipTxt}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Input row */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask for recipe ideas..."
              placeholderTextColor="#aaa"
              onSubmitEditing={send}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
              onPress={send}
              disabled={!input.trim() || loading}
            >
              <Text style={styles.sendTxt}>Send</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  chat: { flex: 1, backgroundColor: '#f8f8f6' },

  // saved toggle bar
  savedToggle: {
    backgroundColor: '#EAF3DE',
    padding: 10,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#c5dba0',
  },
  savedToggleTxt: { color: '#27500A', fontSize: 13, fontWeight: '600' },

  // chat bubbles
  botLabel: { fontSize: 11, color: '#aaa', marginBottom: 4, marginLeft: 2 },
  bubble: { borderRadius: 14, padding: 12, maxWidth: '85%' },
  botBubble: { backgroundColor: '#E1F5EE', alignSelf: 'flex-start', borderRadius: 14, padding: 12, maxWidth: '85%' },
  userBubble: { backgroundColor: '#fff', alignSelf: 'flex-end', borderWidth: 0.5, borderColor: '#e5e5e5' },
  botTxt: { color: '#085041', fontSize: 14, lineHeight: 22 },
  userTxt: { color: '#1a1a1a', fontSize: 14, lineHeight: 22 },

  // save button
  saveBtn: {
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: '#fff', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 0.5, borderColor: '#639922',
  },
  saveBtnTxt: { color: '#639922', fontSize: 13, fontWeight: '500' },

  // chips
  chipsRow: { maxHeight: 50, borderTopWidth: 0.5, borderTopColor: '#eee', backgroundColor: '#fff' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: '#f0f7e6', borderRadius: 20,
    borderWidth: 0.5, borderColor: '#a8d06a',
  },
  chipTxt: { fontSize: 13, color: '#27500A', fontWeight: '500' },

  // input
  inputRow: {
    flexDirection: 'row', padding: 12, gap: 8,
    borderTopWidth: 0.5, borderColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1, borderWidth: 0.5, borderColor: '#ddd',
    borderRadius: 10, padding: 10, fontSize: 14, color: '#1a1a1a',
  },
  sendBtn: {
    backgroundColor: '#1D9E75', borderRadius: 10,
    paddingHorizontal: 18, justifyContent: 'center',
  },
  sendTxt: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // saved recipes view
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 0.5, marginBottom: 12 },
  savedCard: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderWidth: 0.5, borderColor: '#e5e5e5',
  },
  savedTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 6 },
  savedBody: { fontSize: 13, color: '#666', lineHeight: 20, marginBottom: 10 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingTxt: { fontSize: 12, color: '#aaa', marginLeft: 6 },
});