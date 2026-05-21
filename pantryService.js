import { supabase } from './supabase';

const USER_ID = 'f6ca0583-c7d9-496c-91ad-5fc22203c40a';

export async function getPantryItems() {
  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('user_id', USER_ID)
    .order('name');
  if (error) throw error;
  return data;
}

export async function addPantryItem(item) {
  const { data, error } = await supabase
    .from('pantry_items')
    .insert({ ...item, user_id: USER_ID })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateQuantity(id, newQty) {
  const { data, error } = await supabase
    .from('pantry_items')
    .update({ quantity: newQty })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function refillItem(id) {
  const { data: item } = await supabase
    .from('pantry_items')
    .select('max_quantity')
    .eq('id', id)
    .single();

  await supabase
    .from('pantry_items')
    .update({ quantity: item.max_quantity })
    .eq('id', id);

  // ✅ Clear grocery + notifications on refill
  await supabase.from('grocery_items').delete().eq('pantry_item_id', id);
  await supabase.from('notifications').delete().eq('pantry_item_id', id);
}

export async function checkThresholds(item) {
  const pct = (item.quantity / item.max_quantity) * 100;
  const type = pct < item.critical_threshold ? 'critical' : pct <= item.low_threshold ? 'low' : null;

  // If above both thresholds, do nothing
  if (!type) return;

  // ✅ FIX: Only insert notification if one doesn't already exist (no duplicates)
  const { data: existingNotif } = await supabase
    .from('notifications')
    .select('id')
    .eq('pantry_item_id', item.id)
    .eq('type', type)
    .eq('is_read', false);

  if (!existingNotif?.length) {
    const message =
      type === 'critical'
        ? `${item.name} needs refill! Only ${Math.round(pct)}% remaining.`
        : `${item.name} is running low — ${Math.round(pct)}% remaining.`;

    await supabase.from('notifications').insert({
      user_id: USER_ID,
      pantry_item_id: item.id,
      type,
      message,
    });
  }

  // ✅ FIX: Only auto-add to grocery if not already in list
  const { data: inList } = await supabase
    .from('grocery_items')
    .select('id')
    .eq('pantry_item_id', item.id);

  if (!inList?.length) {
    await supabase.from('grocery_items').insert({
      user_id: USER_ID,
      pantry_item_id: item.id,
      name: item.name,
      auto_added: true,
    });
  }
}


export async function deletePantryItem(id) {
  await supabase.from('grocery_items').delete().eq('pantry_item_id', id);
  await supabase.from('notifications').delete().eq('pantry_item_id', id);
  const { error } = await supabase.from('pantry_items').delete().eq('id', id);
  if (error) throw error;
}

export async function getGroceryItems() {
  const { data, error } = await supabase
    .from('grocery_items')
    .select('*')
    .eq('user_id', USER_ID)
    .order('added_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function toggleGroceryItem(id, checked) {
  await supabase
    .from('grocery_items')
    .update({ is_checked: checked })
    .eq('id', id);
}

export async function addGroceryItem(name) {
  const { data, error } = await supabase
    .from('grocery_items')
    .insert({ user_id: USER_ID, name, auto_added: false })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function clearCheckedGrocery() {
  await supabase
    .from('grocery_items')
    .delete()
    .eq('user_id', USER_ID)
    .eq('is_checked', true);
}

export async function getNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', USER_ID)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function markNotifRead(id) {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

export async function getSettings() {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', USER_ID)
    .single();
  if (error) throw error;
  return data;
}

export async function updateSettings(updates) {
  await supabase.from('user_settings').update(updates).eq('user_id', USER_ID);
}

export async function saveRecipe(title, fullRecipe) {
  const { data, error } = await supabase
    .from('recipe_history')
    .insert({
      user_id: USER_ID,
      recipe_title: title,
      full_recipe: fullRecipe,
      saved: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSavedRecipes() {
  const { data, error } = await supabase
    .from('recipe_history')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('saved', true)
    .order('suggested_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function rateRecipe(id, rating) {
  await supabase.from('recipe_history').update({ rating }).eq('id', id);
}

