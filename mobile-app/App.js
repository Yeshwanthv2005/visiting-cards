import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import ErrorBoundary from './components/ErrorBoundary';

// Screens
import HomeScreen from './screens/HomeScreen';
import CameraScreen from './screens/CameraScreen';
import ProcessingScreen from './screens/ProcessingScreen';
import ResultScreen from './screens/ResultScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createStackNavigator();

export default function App() {
    return (
        <ErrorBoundary>
            <NavigationContainer>
                <StatusBar style="light" />
                <Stack.Navigator
                    initialRouteName="Home"
                    screenOptions={{
                        headerShown: false,
                        cardStyle: { backgroundColor: '#f8fafc' },
                        animationEnabled: true,
                        gestureEnabled: true,
                    }}
                >
                    <Stack.Screen
                        name="Home"
                        component={HomeScreen}
                        options={{ title: 'Visiting Card Scanner' }}
                    />
                    <Stack.Screen
                        name="Camera"
                        component={CameraScreen}
                        options={{
                            title: 'Scan Card',
                            presentation: 'fullScreenModal',
                        }}
                    />
                    <Stack.Screen
                        name="Processing"
                        component={ProcessingScreen}
                        options={{
                            title: 'Processing',
                            gestureEnabled: false,
                        }}
                    />
                    <Stack.Screen
                        name="Result"
                        component={ResultScreen}
                        options={{
                            title: 'Results',
                            gestureEnabled: false,
                        }}
                    />
                    <Stack.Screen
                        name="History"
                        component={HistoryScreen}
                        options={{ title: 'History' }}
                    />
                    <Stack.Screen
                        name="Settings"
                        component={SettingsScreen}
                        options={{ title: 'Settings' }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
