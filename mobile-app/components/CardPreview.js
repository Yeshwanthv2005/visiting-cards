import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, typography } from '../styles/theme';

const CardPreview = ({ card, onPress, onDelete }) => {
    const getChannelColor = (channel) => {
        const channelColors = {
            UNIVERSITY: '#3b82f6',
            BUSINESS: '#10b981',
            CONSULTANCY: '#f59e0b',
            NGO: '#ef4444',
            STARTUP: '#8b5cf6',
            GOVERNMENT: '#6366f1',
        };
        return channelColors[channel] || colors.textSecondary;
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={styles.channelContainer}>
                    {card.channel && (
                        <View style={[styles.badge, { backgroundColor: getChannelColor(card.channel) }]}>
                            <Text style={styles.badgeText}>{card.channel}</Text>
                        </View>
                    )}
                    {card.syncedToSheet && (
                        <Ionicons name="cloud-done" size={16} color={colors.success} style={styles.syncIcon} />
                    )}
                </View>
                {onDelete && (
                    <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.content}>
                {card.organizationName ? (
                    <Text style={styles.orgName} numberOfLines={2}>{card.organizationName}</Text>
                ) : null}

                {card.pointPerson ? (
                    <View style={styles.row}>
                        <Ionicons name="person" size={16} color={colors.textSecondary} />
                        <Text style={styles.text}>{card.pointPerson}</Text>
                    </View>
                ) : null}

                {card.department ? (
                    <View style={styles.row}>
                        <Ionicons name="briefcase" size={16} color={colors.textSecondary} />
                        <Text style={styles.text} numberOfLines={1}>{card.department}</Text>
                    </View>
                ) : null}

                {card.location ? (
                    <View style={styles.row}>
                        <Ionicons name="location" size={16} color={colors.textSecondary} />
                        <Text style={styles.text}>{card.location}</Text>
                    </View>
                ) : null}

                {card.contactNumber ? (
                    <View style={styles.row}>
                        <Ionicons name="call" size={16} color={colors.textSecondary} />
                        <Text style={styles.text}>{card.contactNumber}</Text>
                    </View>
                ) : null}

                {card.contactEmail ? (
                    <View style={styles.row}>
                        <Ionicons name="mail" size={16} color={colors.textSecondary} />
                        <Text style={styles.text} numberOfLines={1}>{card.contactEmail}</Text>
                    </View>
                ) : null}
            </View>

            {card.scannedAt && (
                <Text style={styles.timestamp}>
                    Scanned: {new Date(card.scannedAt).toLocaleDateString()}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        ...shadows.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    channelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    badgeText: {
        color: colors.textWhite,
        fontSize: typography.fontSizes.xs,
        fontWeight: typography.fontWeights.semibold,
    },
    syncIcon: {
        marginLeft: spacing.sm,
    },
    deleteButton: {
        padding: spacing.xs,
    },
    content: {
        marginTop: spacing.sm,
    },
    orgName: {
        fontSize: typography.fontSizes.lg,
        fontWeight: typography.fontWeights.bold,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    text: {
        fontSize: typography.fontSizes.sm,
        color: colors.textSecondary,
        marginLeft: spacing.sm,
        flex: 1,
    },
    timestamp: {
        fontSize: typography.fontSizes.xs,
        color: colors.textLight,
        marginTop: spacing.sm,
        textAlign: 'right',
    },
});

export default CardPreview;
