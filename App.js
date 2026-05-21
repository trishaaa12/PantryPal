import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import PantryScreen from './screen/PantryScreen';
import GroceryScreen from './screen/GroceryScreen';
import RecipesScreen from './screen/RecipesScreen';
import RemindersScreen from './screen/RemindersScreen';
import SettingsScreen from './screen/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#639922',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: { paddingBottom: 6, paddingTop: 4, height: 60 },
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { fontWeight: '600', color: '#1a1a1a' },
        }}
      >
        <Tab.Screen name="Pantry"   component={PantryScreen}    options={{ tabBarIcon: ({focused}) => <Text style={{fontSize:20}}>🥫</Text> }} />
        <Tab.Screen name="Grocery"  component={GroceryScreen}   options={{ tabBarIcon: ({focused}) => <Text style={{fontSize:20}}>🛒</Text> }} />
        <Tab.Screen name="Recipes"  component={RecipesScreen}   options={{ tabBarIcon: ({focused}) => <Text style={{fontSize:20}}>🍳</Text> }} />
        <Tab.Screen name="Alerts"   component={RemindersScreen} options={{ tabBarIcon: ({focused}) => <Text style={{fontSize:20}}>🔔</Text> }} />
        <Tab.Screen name="Settings" component={SettingsScreen}  options={{ tabBarIcon: ({focused}) => <Text style={{fontSize:20}}>⚙️</Text> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
