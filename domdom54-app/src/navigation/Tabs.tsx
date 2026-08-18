import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// Screen Components
import Home from '../Home';
import TextPage from '../Text';
import Search from '../Search';
import Moments from '../Moments';
import Meditations from '../Meditations';
import Permission from '../Permission';
import Discuss from '../Discuss';

const Tab = createBottomTabNavigator();

type TabName = 'Wisdom' | 'Search' | 'Meditations' | 'Moments' | 'Permission';

// Define a more specific type for Material Community Icons
type MaterialCommunityIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// Icon mapping for visible tabs only - with proper typing
const screenIcons: Record<TabName, { focused: MaterialCommunityIconName; unfocused: MaterialCommunityIconName }> = {
  Wisdom: { focused: 'lightbulb-on', unfocused: 'lightbulb-on-outline' },
  Search: { focused: 'layers-search', unfocused: 'layers-search-outline' },
  Meditations: { focused: 'head-heart', unfocused: 'head-heart-outline' },
  Moments: { focused: 'kettle-steam', unfocused: 'kettle-steam-outline' },
  Permission: { focused: 'cog', unfocused: 'cog-outline' },
};

// Tab names that should be visible in the tab bar
const visibleTabs: TabName[] = ['Wisdom', 'Search', 'Moments', 'Meditations', 'Permission'];

// Custom Tab Bar Component
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  
  const visibleRoutes = state.routes.filter(route => 
    visibleTabs.includes(route.name as TabName)
  );

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
      {visibleRoutes.map((route) => {
        const { options } = descriptors[route.key];
        
        // Better handling of tabBarLabel with proper typing
        let label: string = route.name; // Default fallback
        
        if (options.tabBarLabel) {
          if (typeof options.tabBarLabel === 'string') {
            label = options.tabBarLabel;
          } else if (typeof options.tabBarLabel === 'function') {
            // For function labels, we'll use route name as fallback
            // You could also call the function here if needed: options.tabBarLabel({ focused: isFocused, color: '', position: 'below-icon' })
            label = route.name;
          }
        }
        
        // Find the actual index in the full state
        const routeIndex = state.routes.findIndex(r => r.key === route.key);
        const isFocused = state.index === routeIndex;
        
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // Type guard to ensure we have valid icons
        const routeName = route.name as TabName;
        const icons = screenIcons[routeName];
        
        // Skip rendering if no icons are defined for this route
        if (!icons) {
          return null;
        }

        const iconName = isFocused ? icons.focused : icons.unfocused;
        const color = isFocused ? '#FF4500' : 'gray';

        return (
          <TouchableOpacity
            key={route.key} // Use route.key instead of route.name for better uniqueness
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tabBarItem}
          >
            <MaterialCommunityIcons
              name={iconName}
              size={34}
              color={color}
            />
            <Text
              style={[styles.tabBarLabel, { color }]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Main Tab Navigator with custom tab bar
export default function BottomTabs() {
  const insets = useSafeAreaInsets();

  // React Navigation treats headerStyle.height as the header's TOTAL height, with
  // the status bar inset consumed inside it — so a fixed total leaves less and less
  // room for the title as the status bar grows. Android 16 / Pixel 9 has a taller
  // status bar than the A32, which pushed the 38pt title into the content below.
  //
  // This is the height of the title area ONLY; the status bar is added on top. The
  // old fixed total of 90 already had ~24dp of A32 status bar inside it, so ~66 is
  // the like-for-like equivalent — the A32 header stays the size it always was,
  // while taller status bars grow the header instead of squeezing the title.
  const HEADER_CONTENT_HEIGHT = 66;

  const headerStyle = {
    backgroundColor: "white",
    height: HEADER_CONTENT_HEIGHT + insets.top,
  };

  return (
    <Tab.Navigator
      initialRouteName="Home"
      backBehavior="initialRoute"
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
      }}
    >
      {/* All screens - visible and hidden */}
      <Tab.Screen
        name="Wisdom"
        component={TextPage}
        options={{
          headerTitleAlign: "center",
          headerStyle,
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitleText, { marginRight: 10 }]}>
                Wisdom
              </Text>
              <MaterialCommunityIcons
                name="face-man-shimmer"
                size={34}
                color="#12abef"
                style={{ marginTop: 5 }}
              />
            </View>
          ),
        }}
      />
      
      <Tab.Screen
        name="Search"
        component={Search}
        options={{
          headerTitleAlign: "center",
          headerStyle,
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <MaterialCommunityIcons
                name="cloud-search-outline"
                size={36}
                color="#12abef"
              />
              <Text style={[styles.headerTitleText, { marginLeft: 15 }]}>
                Search
              </Text>
            </View>
          ),
        }}
      />
      
      <Tab.Screen
        name="Moments"
        component={Moments}
        options={{
          headerTitleAlign: "center",
          headerStyle,
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitleText, { marginRight: 15 }]}>
                Moments
              </Text>
              <MaterialCommunityIcons 
                name="thought-bubble-outline" 
                size={36} 
                color="#12abef" 
              />
            </View>
          ),
        }}
      />
      
      <Tab.Screen
        name="Meditations"
        component={Meditations}
        options={{
          headerTitleAlign: "center",
          headerStyle,
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <MaterialCommunityIcons
                name="meditation"
                size={40}
                color="#12abef"
              />
              <Text style={[styles.headerTitleText, { marginLeft: 12 }]}>
                Meditations
              </Text>
            </View>
          ),
        }}
      />
      
      <Tab.Screen
        name="Permission"
        component={Permission}
        options={{
          headerTitleAlign: "center",
          tabBarLabel: "Settings",
          headerStyle,
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <MaterialCommunityIcons
                name="account-settings"
                size={36}
                color="#12abef"
              />
              <Text style={[styles.headerTitleText, { marginLeft: 10 }]}>
                Settings
              </Text>
            </View>
          ),
        }}
      />

      {/* Hidden screens - won't appear in custom tab bar */}
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          headerTitleAlign: "center",
          headerStyle,
          headerTitle: () => (
            <View style={styles.headerHomeContainer}>
              <Text
                style={styles.homeHeaderText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                RanDOM WisDOM
              </Text>
            </View>
          ),
        }}
      />
      
      <Tab.Screen
        name="Discuss"
        component={Discuss}
        options={{
          headerTitleAlign: "center",
          headerStyle,
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <MaterialCommunityIcons
                name="chat-plus-outline"
                size={34}
                color="#12abef"
              />
              <Text style={[styles.headerTitleText, { marginLeft: 15 }]}>
                Discuss
              </Text>
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  // Custom Tab Bar Styles
  tabBarContainer: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: "#000",
    paddingTop: 5,
    paddingHorizontal: 2,
    backgroundColor: 'white',
  },
  tabBarItem: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  
  // Header Styles
  headerHomeContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeHeaderText: {
    color: "#007BFF",
    fontSize: 40,
    fontWeight: "bold",
    textAlign: 'center',
  },
  
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'center',
  },
  headerTitleText: {
    color: "#12abef",
    fontSize: 38,
    fontWeight: "bold",
  },
});