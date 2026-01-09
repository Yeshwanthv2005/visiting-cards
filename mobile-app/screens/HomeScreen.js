import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, typography } from '../styles/theme';

const HomeScreen = ({ navigation }) => {
    const menuItems = [
        {
            id: 'camera',
            title: 'Scan Card',
            subtitle: 'Capture a new visiting card',
            icon: 'camera',
            color: colors.primary,
            route: 'Camera',
        },
        {
            id: 'gallery',
            title: 'From Gallery',
            subtitle: 'Select from your photos',
            icon: 'images',
            color: colors.accent,
            route: 'Camera', // Will use gallery mode
            params: { mode: 'gallery' },
        },
        {
            id: 'history',
            title: 'History',
            subtitle: 'View scanned cards',
            icon: 'time',
            color: colors.success,
            route: 'History',
        },
        {
            id: 'settings',
            title: 'Settings',
            subtitle: 'Configure the app',
            icon: 'settings',
            color: colors.textSecondary,
            route: 'Settings',
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <Ionicons name="card" size={48} color={colors.textWhite} />
                    <Text style={styles.title}>Visiting Card Scanner</Text>
                    <Text style={styles.subtitle}>Digitize your professional network</Text>
                </View>
            </LinearGradient>

            <View style={styles.content}>
                {menuItems.map((item, index) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[
                            styles.menuItem,
                            index % 2 === 0 ? styles.menuItemLeft : styles.menuItemRight,
                        ]}
                        onPress={() => navigation.navigate(item.route, item.params)}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                            <Ionicons name={item.icon} size={32} color={colors.textWhite} />
                        </View>
                        <View style={styles.menuTextContainer}>
                            <Text style={styles.menuTitle}>{item.title}</Text>
                            <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={colors.textLight} />
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Powered by Gemini AI</Text>
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
        paddingTop: spacing.xl,
        paddingBottom: spacing['2xl'],
        paddingHorizontal: spacing.lg,
        borderBottomLeftRadius: borderRadius['2xl'],
        borderBottomRightRadius: borderRadius['2xl'],
    },
    headerContent: {
        alignItems: 'center',
    },
    title: {
        fontSize: typography.fontSizes['3xl'],
        fontWeight: typography.fontWeights.bold,
        color: colors.textWhite,
        marginTop: spacing.md,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: typography.fontSizes.base,
        color: colors.textWhite,
        marginTop: spacing.xs,
        opacity: 0.9,
        textAlign: 'center',
    },
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        ...shadows.md,
    },
    menuItemLeft: {
        marginRight: spacing.xs,
    },
    menuItemRight: {
        marginLeft: spacing.xs,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: typography.fontSizes.lg,
        fontWeight: typography.fontWeights.semibold,
        color: colors.textPrimary,
    },
    menuSubtitle: {
        fontSize: typography.fontSizes.sm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    footer: {
        padding: spacing.lg,
        alignItems: 'center',
    },
    footerText: {
        fontSize: typography.fontSizes.sm,
        color: colors.textLight,
    },
});

export default HomeScreen;
