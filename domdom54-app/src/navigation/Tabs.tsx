import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from "../styles/colors";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// Screen Components
import Home from '../Home';
import TextPage from '../Text';
import Moments from '../Moments';
import Meditations from '../Meditations';
import Settings from '../Settings';
import Discuss from '../Discuss';
import Message from '../Message';
import type { MessageData } from '../Message';

/**
 * Every route in the tab navigator, including the ones the custom tab bar hides.
 * Exported so App.tsx can type the nested navigate() a push notification makes:
 * navigate('HomeTabs', { screen: 'Messages', params: data }).
 */
export type TabParamList = {
  Wisdom: undefined;
  Moments: undefined;
  Meditations: undefined;
  Messages: Partial<MessageData> | undefined;
  Settings: undefined;
  Home: undefined;
  // Optional, not required: Wisdom always passes a phrase, but Discuss is a
  // registered route in a navigator using backBehavior="initialRoute", so it can
  // be focused in states where nothing passed it params at all. Discuss reads it
  // as `route.params?.discussPhrase` precisely because of that.
  Discuss: { discussPhrase?: string } | undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// Search used to be a tab of its own. It now lives inside Wisdom, which is a
// single phrase display fed by either the random endpoint or a search.
type TabName = 'Wisdom' | 'Meditations' | 'Moments' | 'Messages' | 'Settings';

// Define a more specific type for Material Community Icons
type MaterialCommunityIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// Icon mapping for visible tabs only - with proper typing
const screenIcons: Record<TabName, { focused: MaterialCommunityIconName; unfocused: MaterialCommunityIconName }> = {
  Wisdom: { focused: 'lightbulb-on', unfocused: 'lightbulb-on-outline' },
  Meditations: { focused: 'head-heart', unfocused: 'head-heart-outline' },
  Moments: { focused: 'kettle-steam', unfocused: 'kettle-steam-outline' },
  Messages: { focused: 'hand-heart', unfocused: 'hand-heart-outline' },
  Settings: { focused: 'cog', unfocused: 'cog-outline' },
};

// Tab names that should be visible in the tab bar
const visibleTabs: TabName[] = ['Wisdom', 'Moments', 'Meditations', 'Messages', 'Settings'];

/**
 * Hidden routes that are a continuation of a visible tab rather than a peer of
 * one, and the tab that stays lit while you're on them. Discuss is only ever
 * reached from Wisdom, carrying a Wisdom phrase, so Wisdom is where you still
 * are - without this the bar answers "you are here: nowhere" on a screen you
 * arrived at by tapping a lit tab.
 *
 * Home is deliberately NOT listed. It's hidden too, and it's the initial route,
 * but it belongs to no tab - so nothing lights on it, which is the honest answer.
 */
const parentTab: Partial<Record<string, TabName>> = {
  Discuss: 'Wisdom',
};

// Custom Tab Bar Component
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  
  const visibleRoutes = state.routes.filter(route =>
    visibleTabs.includes(route.name as TabName)
  );

  // Which tab reads as current. Route names are unique within a navigator, so
  // comparing by name is equivalent to the old index comparison for the five
  // real tabs, and it lets a hidden route borrow its parent's highlight.
  const activeName = state.routes[state.index].name;
  const litTab = parentTab[activeName] ?? activeName;

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
        
        // Lit is not the same as current. On Discuss, Wisdom is lit but is NOT
        // the route you're on, and tapping it has to take you back there - so
        // the tap guard tests the real route, not the highlight. Conflating the
        // two would make the lit tab inert and strand you on Discuss.
        const isFocused = route.name === litTab;
        const isCurrentRoute = route.name === activeName;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isCurrentRoute && !event.defaultPrevented) {
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
        // Two oranges, not one. The 34px icon is a graphic and needs 3:1; the 12px label
        // is text and needs 4.5:1. Small type needs more contrast than a large mark to
        // *look* equally weighted, so the darker label reads as the same colour, not a
        // different one.
        const iconColor = isFocused ? colors.accent : colors.textDisabled;
        const labelColor = isFocused ? colors.accentStrong : colors.textSecondary;

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
              color={iconColor}
            />
            <Text
              style={[styles.tabBarLabel, { color: labelColor }]}
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
  const HEADER_CONTENT_HEIGHT = 66;

  const headerStyle = {
    backgroundColor: colors.card,
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
                color={colors.brandStrong}
                style={{ marginTop: 5 }}
              />
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
              <Text style={[styles.headerTitleText, { marginRight: 10 }]}>
                Moments
              </Text>
              <MaterialCommunityIcons 
                name="meteor" 
                size={40} 
                color={colors.brandStrong} 
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
              <Text style={[styles.headerTitleText, { marginRight: 10 }]}>
                Meditations
              </Text>
              <MaterialCommunityIcons
                name="meditation"
                size={40}
                color={colors.brandStrong}
              />
            </View>
          ),
        }}
      />
      
      <Tab.Screen
        name="Messages"
        component={Message}
        options={{
          headerTitleAlign: "center",
          headerStyle,
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitleText, { marginRight: 10 }]}>
                Messages
              </Text>
              <MaterialCommunityIcons
                name="weather-partly-cloudy"
                size={40}
                color={colors.brandStrong}
              />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Settings"
        component={Settings}
        options={{
          headerTitleAlign: "center",
          headerStyle,
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitleText, { marginRight: 10 }]}>
                Settings
              </Text>
              <MaterialCommunityIcons
                name="account-wrench"
                size={40}
                color={colors.brandStrong}
              />
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
                <Text style={[styles.headerTitleText, { marginRight: 10 }]}>
                Discuss
              </Text>
              <MaterialCommunityIcons
                name="chat-plus-outline"
                size={40}
                color={colors.brandStrong}
              />
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
    borderTopWidth: 1.5,
    borderTopColor: colors.brand,
    paddingTop: 5,
    paddingHorizontal: 2,
    backgroundColor: colors.card,
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
    color: colors.brandStrong,
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
    color: colors.brandStrong,
    fontSize: 38,
    fontWeight: "bold",
  },
});