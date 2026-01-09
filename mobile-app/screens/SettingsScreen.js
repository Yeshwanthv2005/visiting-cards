import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    Switch,
    Alert,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import storageService from '../services/storageService';
import sheetsService from '../services/sheetsService';
import { colors, spacing, borderRadius, typography, commonStyles } from '../styles/theme';
import { GOOGLE_SHEET_ID } from '../config';

const SettingsScreen = ({ navigation }) => {
    const [settings, setSettings] = useState({
        autoSync: true,
        webAppUrl: '',
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const savedSettings = await storageService.getSettings();
        setSettings(savedSettings);
        if (savedSettings.webAppUrl) {
            sheetsService.setWebAppUrl(savedSettings.webAppUrl);
        }
    };

    const handleSaveSettings = async () => {
        try {
            await storageService.saveSettings(settings);
            if (settings.webAppUrl) {
                sheetsService.setWebAppUrl(settings.webAppUrl);
            }
            Alert.alert('Success', 'Settings saved successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to save settings');
            console.error(error);
        }
    };

    const handleClearData = () => {
        Alert.alert(
            'Clear All Data',
            'This will delete all scanned cards from your device. This action cannot be undone. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        await storageService.clearAll();
                        Alert.alert('Success', 'All data has been cleared');
                    },
                },
            ]
        );
    };

    const openGoogleSheet = () => {
        const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}`;
        Linking.openURL(url);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={styles.placeholder} />
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Google Sheets Configuration */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Google Sheets Integration</Text>

                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle" size={24} color={colors.info} />
                        <Text style={styles.infoText}>
                            To enable Google Sheets sync, you need to deploy a Google Apps Script Web App.
                            See the documentation for instructions.
                        </Text>
                    </View>

                    <Text style={styles.label}>Google Apps Script Web App URL</Text>
                    <TextInput
                        style={styles.input}
                        value={settings.webAppUrl}
                        onChangeText={(text) => setSettings({ ...settings, webAppUrl: text })}
                        placeholder="https://script.google.com/macros/s/..."
                        placeholderTextColor={colors.textLight}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    <TouchableOpacity style={styles.linkButton} onPress={openGoogleSheet}>
                        <Ionicons name="open-outline" size={20} color={colors.primary} />
                        <Text style={styles.linkButtonText}>Open Google Sheet</Text>
                    </TouchableOpacity>
                </View>

                {/* App Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App Settings</Text>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Auto-Sync</Text>
                            <Text style={styles.settingDescription}>
                                Automatically sync to Google Sheets after scanning
                            </Text>
                        </View>
                        <Switch
                            value={settings.autoSync}
                            onValueChange={(value) => setSettings({ ...settings, autoSync: value })}
                            trackColor={{ false: colors.border, true: colors.primaryLight }}
                            thumbColor={settings.autoSync ? colors.primary : colors.textLight}
                        />
                    </View>
                </View>

                {/* Data Management */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Data Management</Text>

                    <TouchableOpacity style={styles.dangerButton} onPress={handleClearData}>
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                        <Text style={styles.dangerButtonText}>Clear All Data</Text>
                    </TouchableOpacity>
                </View>

                {/* About */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>

                    <View style={styles.aboutCard}>
                        <Text style={styles.aboutTitle}>Visiting Card Scanner</Text>
                        <Text style={styles.aboutVersion}>Version 1.0.0</Text>
                        <Text style={styles.aboutDescription}>
                            Powered by Google Gemini AI for intelligent text extraction from visiting cards.
                        </Text>
                    </View>
                </View>

                {/* Setup Instructions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Setup Instructions</Text>

                    <View style={styles.instructionsCard}>
                        <Text style={styles.instructionsTitle}>Google Apps Script Setup:</Text>
                        <Text style={styles.instructionsStep}>
                            1. Open your Google Sheet
                        </Text>
                        <Text style={styles.instructionsStep}>
                            2. Go to Extensions → Apps Script
                        </Text>
                        <Text style={styles.instructionsStep}>
                            3. Copy the Apps Script code from sheetsService.js
                        </Text>
                        <Text style={styles.instructionsStep}>
                            4. Deploy as Web App (Execute as "Me", accessible by "Anyone")
                        </Text>
                        <Text style={styles.instructionsStep}>
                            5. Copy the Web App URL and paste above
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Save Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
                    <Text style={styles.saveButtonText}>Save Settings</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.lg,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: typography.fontSizes['2xl'],
        fontWeight: typography.fontWeights.bold,
        color: colors.textWhite,
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    section: {
        padding: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.fontSizes.lg,
        fontWeight: typography.fontWeights.bold,
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: colors.info + '15',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
    },
    infoText: {
        flex: 1,
        marginLeft: spacing.md,
        fontSize: typography.fontSizes.sm,
        color: colors.textSecondary,
        lineHeight: typography.lineHeights.relaxed * typography.fontSizes.sm,
    },
    label: {
        ...commonStyles.label,
        marginBottom: spacing.sm,
    },
    input: {
        ...commonStyles.input,
        marginBottom: spacing.md,
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    linkButtonText: {
        color: colors.primary,
        fontSize: typography.fontSizes.base,
        marginLeft: spacing.sm,
        fontWeight: typography.fontWeights.medium,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
    },
    settingInfo: {
        flex: 1,
        marginRight: spacing.md,
    },
    settingLabel: {
        fontSize: typography.fontSizes.base,
        fontWeight: typography.fontWeights.medium,
        color: colors.textPrimary,
    },
    settingDescription: {
        fontSize: typography.fontSizes.sm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.error,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
    },
    dangerButtonText: {
        color: colors.error,
        fontSize: typography.fontSizes.base,
        fontWeight: typography.fontWeights.semibold,
        marginLeft: spacing.sm,
    },
    aboutCard: {
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    aboutTitle: {
        fontSize: typography.fontSizes.xl,
        fontWeight: typography.fontWeights.bold,
        color: colors.textPrimary,
    },
    aboutVersion: {
        fontSize: typography.fontSizes.sm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    aboutDescription: {
        fontSize: typography.fontSizes.sm,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.md,
        lineHeight: typography.lineHeights.relaxed * typography.fontSizes.sm,
    },
    instructionsCard: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
    },
    instructionsTitle: {
        fontSize: typography.fontSizes.base,
        fontWeight: typography.fontWeights.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    instructionsStep: {
        fontSize: typography.fontSizes.sm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
        lineHeight: typography.lineHeights.relaxed * typography.fontSizes.sm,
    },
    footer: {
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
    },
    saveButton: {
        ...commonStyles.button,
    },
    saveButtonText: {
        ...commonStyles.buttonText,
    },
});

export default SettingsScreen;
