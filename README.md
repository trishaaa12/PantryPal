# PantryPal
PantryPal is a smart kitchen inventory app. Track 50+ groceries across 8 categories, get auto-alerts when stock runs low, scan barcodes to add items instantly, and auto-populate your grocery list. Suggests recipes based on what you have. Built with React Native, Expo, &amp Supabase.
PantryGroceryRecipesAlerts2-column grid by categoryAuto-populated listChat-based suggestionsAlert log

✨ Features

📊 Real-time pantry tracking — Track every item with quantity, max capacity and two threshold levels (low 25%, critical 10%)
🔔 Smart alerts — Automatic notifications when items drop below their threshold, deduplicated so the same alert never fires twice
🛒 Auto grocery list — Items are automatically added to the grocery list when low, and removed when refilled
📷 Barcode scanner — Scan any food packet barcode to auto-fill item details from the Open Food Facts database
🍳 Recipe suggestions — Chat-based recipe engine that uses your actual pantry contents and prioritises low-stock items
📦 Packet tracking — Masalas and sachets tracked as packet counts with their own consume button
📤 WhatsApp sharing — Share your grocery list via WhatsApp or any messaging app with one tap
↕️ Sort & filter — Filter by category, sort by name/stock level/category/last updated, and search
🗑️ Swipe to delete — Swipe any card left to delete it


🗂️ Project Structure
PantryPal/
├── App.js                    # Root — bottom tab navigator
├── app.json                  # Expo config
├── package.json
├── 📁 lib/
│   ├── supabase.js           # Supabase client setup
│   └── pantryService.js      # All database functions
└── 📁 screens/
    ├── PantryScreen.js       # Main pantry grid with scanner
    ├── GroceryScreen.js      # Grocery list with share
    ├── RecipesScreen.js      # Recipe suggestion chat
    ├── RemindersScreen.js    # Alerts log
    └── SettingsScreen.js     # Notification toggles

🛠️ Tech Stack
LayerTechnologyFrameworkReact Native + Expo SDK 54DatabaseSupabase (PostgreSQL)NavigationReact Navigation — bottom tabsCameraexpo-cameraBarcode lookupOpen Food Facts API (free, no key needed)Local storageAsyncStorageSharingReact Native Share API

🚀 Getting Started
Prerequisites

Node.js (v18 or later) — nodejs.org
Expo Go on your phone — App Store / Play Store
A free Supabase account — supabase.com

Installation
1. Clone the repo
bashgit clone https://github.com/yourusername/PantryPal.git
cd PantryPal
2. Install dependencies
bashnpm install
npx expo install expo-camera
3. Set up Supabase
Go to supabase.com, create a new project, then open the SQL Editor and run the following:
sqlcreate extension if not exists "uuid-ossp";

create table pantry_items (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid,
  name               text not null,
  category           text default 'Pantry',
  unit               text default 'pieces',
  quantity           numeric not null default 0,
  max_quantity       numeric not null default 100,
  low_threshold      numeric default 25,
  critical_threshold numeric default 10,
  last_updated       timestamptz default now()
);

create table grocery_items (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid,
  pantry_item_id uuid,
  name           text not null,
  is_checked     boolean default false,
  auto_added     boolean default false,
  added_at       timestamptz default now()
);

create table notifications (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid,
  pantry_item_id uuid,
  type           text,
  message        text not null,
  is_read        boolean default false,
  created_at     timestamptz default now()
);

create table user_settings (
  user_id             uuid primary key,
  notify_low          boolean default true,
  notify_critical     boolean default true,
  auto_add_to_grocery boolean default true,
  updated_at          timestamptz default now()
);

create table recipe_history (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid,
  recipe_title     text not null,
  full_recipe      text,
  suggested_at     timestamptz default now(),
  saved            boolean default false,
  rating           int
);

-- Disable RLS for local development
alter table pantry_items   disable row level security;
alter table grocery_items  disable row level security;
alter table notifications  disable row level security;
alter table user_settings  disable row level security;
alter table recipe_history disable row level security;
4. Add your Supabase keys
Open lib/supabase.js and replace the placeholder values:
jsconst supabaseUrl  = 'https://your-project-id.supabase.co';
const supabaseAnonKey = 'your-anon-key-here'; // starts with sb_publishable_...

Find these at: Supabase Dashboard → Project Settings → API Keys

5. Add your user ID
Open lib/pantryService.js and set your user ID:
jsconst USER_ID = 'your-uuid-here';

You can generate a UUID at uuidgenerator.net or use any UUID you like.

6. Run the app
bashnpx expo start --clear
Scan the QR code with Expo Go on your phone. Make sure your phone and computer are on the same WiFi network.

If on different networks: Turn on iPhone Personal Hotspot → connect your Mac to it → run npx expo start --clear


🗄️ Database Schema
pantry_items
ColumnTypeDescriptioniduuidPrimary keyuser_iduuidOwner of the itemnametextItem namecategorytextGrains, Vegetables, Spices etc.unittextpieces, packets, g, kg, ml, LquantitynumericCurrent quantitymax_quantitynumericFull/max capacitylow_thresholdnumeric% at which low alert fires (default 25)critical_thresholdnumeric% at which critical alert fires (default 10)last_updatedtimestamptzAuto-updated on edit
grocery_items
ColumnTypeDescriptioniduuidPrimary keyuser_iduuidOwnerpantry_item_iduuidLinks back to pantry_itemsnametextDisplay nameis_checkedbooleanChecked off in storeauto_addedbooleantrue if added by threshold logicadded_attimestamptzWhen it was added

📂 Key Files Explained
lib/pantryService.js
All database interactions in one place. Key functions:
FunctionDescriptiongetPantryItems()Fetch all pantry items for the useraddPantryItem(item)Add a new itemupdateQuantity(id, qty)Update item quantity after consumingrefillItem(id)Set quantity to max, clear grocery + alertsdeletePantryItem(id)Delete item + linked grocery + alertscheckThresholds(item)Fire alerts and auto-add to grocery if below thresholdgetGroceryItems()Fetch grocery listtoggleGroceryItem(id, checked)Check/uncheck a grocery itemgetNotifications()Fetch all alertsmarkNotifRead(id)Dismiss an alert
screens/PantryScreen.js
The main screen. Includes:

2-column category grid with animated cards
Barcode scanner using expo-camera + Open Food Facts API
Smart consume/refill/delete logic
Category tabs, sort modal, search

screens/RecipesScreen.js
Offline recipe engine. Matches pantry contents to a database of 30+ recipes, prioritising low-stock items. No API key or internet required.

🔧 Troubleshooting
ProblemFixBlank screen on startupCheck Supabase URL and anon key in supabase.jsuseCameraPermissions is not a functionRun npx expo install expo-cameraIdentifier already declared errorCheck pantryService.js for duplicate function namesItems duplicatingRun the dedup SQL: DELETE FROM pantry_items WHERE id NOT IN (SELECT MIN(id::text)::uuid FROM pantry_items GROUP BY name, user_id)SDK version mismatchRun npx expo install expo@^54.0.0 --fix then npx expo install --fixCan't connect on phoneEnable iPhone Personal Hotspot, connect Mac to it, restart Expo

🚢 Running on Phone
Expo Go (development)
bashnpx expo start --clear
Scan QR with Expo Go app.
Build for distribution (free)
bashnpm install -g eas-cli
eas login
eas build:configure
eas update --branch preview --message "v1.0"
Share the resulting exp.host/@yourname/pantrypal link — anyone with Expo Go can open it.

🗺️ Roadmap

 Expiry date tracking with warnings
 Real usage history chart (currently uses mock data)
 Monthly shopping report
 Dark mode
 Haptic feedback on consume/refill
 Push notifications (Firebase Cloud Messaging)
 Multi-user / household sharing
 Barcode history cache (offline re-scan)


📄 License
MIT — free to use, modify and distribute.

🙏 Credits

Open Food Facts — free global food product database used for barcode scanning
Supabase — open source Firebase alternative
Expo — React Native toolchain


Built with React Native + Supabase · PantryPal v1.0 · 2026

