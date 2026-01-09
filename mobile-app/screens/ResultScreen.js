import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    Image,
    Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, shadows, typography, commonStyles } from '../styles/theme';
import storageService from '../services/storageService';
import sheetsService from '../services/sheetsService';

const ResultScreen = ({ navigation, route }) => {
    const { cardData } = route.params;
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState(cardData);

    const handleSave = async () => {
        try {
            await storageService.updateCard(cardData.id, formData);

            // Try to update in Google Sheets if not already synced
            if (!formData.syncedToSheet) {
                const result = await sheetsService.appendToSheet(formData);
                if (result.success) {
                    await storageService.markAsSynced(cardData.id);
                }
            }

            Alert.alert('Success', 'Card information updated successfully!');
            setEditMode(false);
        } catch (error) {
            Alert.alert('Error', 'Failed to save changes');
            console.error(error);
        }
    };

    const handleShare = async () => {
        try {
            const message = `
Contact Information:
${formData.organizationName ? `Organization: ${formData.organizationName}\n` : ''}${formData.pointPerson ? `Name: ${formData.pointPerson}\n` : ''}${formData.department ? `Department: ${formData.department}\n` : ''}${formData.location ? `Location: ${formData.location}\n` : ''}${formData.contactNumber ? `Phone: ${formData.contactNumber}\n` : ''}${formData.contactEmail ? `Email: ${formData.contactEmail}\n` : ''}
      `.trim();

            await Share.share({ message });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const handleDiscard = () => {
        Alert.alert(
            'Discard Card',
            'Are you sure you want to discard this card?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: async () => {
                        await storageService.deleteCard(cardData.id);
                        navigation.navigate('Home');
                    },
                },
            ]
        );
    };

    const renderField = (label, value, key, icon) => {
        if (!value && !editMode) return null;

        return (
            <View style={styles.fieldContainer}>
                <View style={styles.fieldHeader}>
                    <Ionicons name={icon} size={20} color={colors.primary} />
                    <Text style={styles.fieldLabel}>{label}</Text>
                </View>
                {editMode ? (
                    <TextInput
                        style={styles.input}
                        value={formData[key]}
                        onChangeText={(text) => setFormData({ ...formData, [key]: text })}
                        placeholder={`Enter ${label.toLowerCase()}`}
                    />
                ) : (
                    <Text style={styles.fieldValue}>{value || 'Not available'}</Text>
                )}
            </View>
        );
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
                    onPress={() => navigation.navigate('Home')}
                >
                    <Ionicons name="close" size={28} color={colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scanned Card</Text>
                <TouchableOpacity
                    style={styles.shareButton}
                    onPress={handleShare}
                >
                    <Ionicons name="share-outline" size={24} color={colors.textWhite} />
                </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Image Preview */}
                {cardData.imageUri && (
                    <View style={styles.imageContainer}>
                        <Image source={{ uri: cardData.imageUri }} style={styles.image} />
                    </View>
                )}

                {/* Status Badge */}
                <View style={styles.statusContainer}>
                    {formData.syncedToSheet ? (
                        <View style={[styles.badge, styles.successBadge]}>
                            <Ionicons name="cloud-done" size={16} color={colors.textWhite} />
                            <Text style={styles.badgeText}>Synced to Google Sheets</Text>
                        </View>
                    ) : (
                        <View style={[styles.badge, styles.warningBadge]}>
                            <Ionicons name="cloud-offline" size={16} color={colors.textWhite} />
                            <Text style={styles.badgeText}>Saved Locally</Text>
                        </View>
                    )}
                    {formData.channel && (
                        <View style={[styles.badge, styles.channelBadge]}>
                            <Text style={styles.badgeText}>{formData.channel}</Text>
                        </View>
                    )}
                </View>

                {/* Card Information */}
                <View style={styles.card}>
                    {renderField('Organization Name', formData.organizationName, 'organizationName', 'business')}
                    {renderField('Point Person', formData.pointPerson, 'pointPerson', 'person')}
                    {renderField('Department', formData.department, 'department', 'briefcase')}
                    {renderField('Location', formData.location, 'location', 'location')}
                    {renderField('Contact Number', formData.contactNumber, 'contactNumber', 'call')}
                    {renderField('Contact Email', formData.contactEmail, 'contactEmail', 'mail')}
                </View>

                {/* Timestamp */}
                {cardData.scannedAt && (
                    <Text style={styles.timestamp}>
                        Scanned on {new Date(cardData.scannedAt).toLocaleString()}
                    </Text>
                )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
                {editMode ? (
                    <>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.cancelButton]}
                            onPress={() => {
                                setFormData(cardData);
                                setEditMode(false);
                            }}
                        >
                            <Text style={styles.actionButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.saveButton]}
                            onPress={handleSave}
                        >
                            <Ionicons name="checkmark" size={20} color={colors.textWhite} />
                            <Text style={[styles.actionButtonText, { color: colors.textWhite }]}>Save</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.discardButton]}
                            onPress={handleDiscard}
                        >
                            <Ionicons name="trash-outline" size={20} color={colors.error} />
                            <Text style={[styles.actionButtonText, { color: colors.error }]}>Discard</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.editButton]}
                            onPress={() => setEditMode(true)}
                        >
                            <Ionicons name="create-outline" size={20} color={colors.textWhite} />
                            <Text style={[styles.actionButtonText, { color: colors.textWhite }]}>Edit</Text>
                        </TouchableOpacity>
                    </>
                )}
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
        paddingVertical: spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: typography.fontSizes.xl,
        fontWeight: typography.fontWeights.bold,
        color: colors.textWhite,
    },
    shareButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    imageContainer: {
        margin: spacing.lg,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        ...shadows.md,
    },
    image: {
        width: '100%',
        height: 200,
        resizeMode: 'cover',
    },
    statusContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: spacing.md,
        flexWrap: 'wrap',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        marginHorizontal: spacing.xs,
        marginBottom: spacing.xs,
    },
    successBadge: {
        backgroundColor: colors.success,
    },
    warningBadge: {
        backgroundColor: colors.warning,
    },
    channelBadge: {
        backgroundColor: colors.primary,
    },
    badgeText: {
        color: colors.textWhite,
        fontSize: typography.fontSizes.xs,
        fontWeight: typography.fontWeights.semibold,
        marginLeft: spacing.xs,
    },
    card: {
        margin: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        ...shadows.md,
    },
    fieldContainer: {
        marginBottom: spacing.md,
    },
    fieldHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    fieldLabel: {
        fontSize: typography.fontSizes.sm,
        fontWeight: typography.fontWeights.semibold,
        color: colors.textSecondary,
        marginLeft: spacing.sm,
    },
    fieldValue: {
        fontSize: typography.fontSizes.base,
        color: colors.textPrimary,
        marginLeft: 28,
    },
    input: {
        ...commonStyles.input,
        marginLeft: 28,
    },
    timestamp: {
        textAlign: 'center',
        fontSize: typography.fontSizes.xs,
        color: colors.textLight,
        marginBottom: spacing.lg,
    },
    actionContainer: {
        flexDirection: 'row',
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        marginHorizontal: spacing.xs,
    },
    discardButton: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.error,
    },
    editButton: {
        backgroundColor: colors.primary,
    },
    cancelButton: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    saveButton: {
        backgroundColor: colors.success,
    },
    actionButtonText: {
        fontSize: typography.fontSizes.base,
        fontWeight: typography.fontWeights.semibold,
        color: colors.textPrimary,
        marginLeft: spacing.xs,
    },
});

export default ResultScreen;
