import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing } from '../styles/theme';

const LoadingSpinner = ({ message = 'Loading...', showGradient = true }) => {
    if (showGradient) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.primary, colors.primaryDark, colors.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradient}
                >
                    <View style={styles.content}>
                        <View style={styles.spinnerContainer}>
                            <ActivityIndicator size="large" color={colors.textWhite} />
                        </View>
                        <Text style={styles.message}>{message}</Text>
                    </View>
                </LinearGradient>
            </View>
        );
    }

    return (
        <View style={styles.simpleContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.simpleMessage}>{message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
    },
    spinnerContainer: {
        marginBottom: spacing.lg,
    },
    message: {
        color: colors.textWhite,
        fontSize: typography.fontSizes.lg,
        fontWeight: typography.fontWeights.medium,
        textAlign: 'center',
    },
    simpleContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    simpleMessage: {
        marginTop: spacing.md,
        color: colors.textSecondary,
        fontSize: typography.fontSizes.base,
    },
});

export default LoadingSpinner;
