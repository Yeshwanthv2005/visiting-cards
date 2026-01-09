import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import CardPreview from '../components/CardPreview';
import storageService from '../services/storageService';
import { colors, spacing, borderRadius, typography } from '../styles/theme';

const HistoryScreen = ({ navigation }) => {
    const [cards, setCards] = useState([]);
    const [filteredCards, setFilteredCards] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadCards();
        }, [])
    );

    const loadCards = async () => {
        try {
            const savedCards = await storageService.getScannedCards();
            setCards(savedCards);
            setFilteredCards(savedCards);
        } catch (error) {
            console.error('Error loading cards:', error);
            Alert.alert('Error', 'Failed to load scanned cards');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setFilteredCards(cards);
            return;
        }

        const lowercaseQuery = query.toLowerCase();
        const filtered = cards.filter(
            (card) =>
                card.organizationName?.toLowerCase().includes(lowercaseQuery) ||
                card.pointPerson?.toLowerCase().includes(lowercaseQuery) ||
                card.department?.toLowerCase().includes(lowercaseQuery) ||
                card.location?.toLowerCase().includes(lowercaseQuery) ||
                card.contactNumber?.includes(query) ||
                card.contactEmail?.toLowerCase().includes(lowercaseQuery)
        );
        setFilteredCards(filtered);
    };

    const handleDelete = async (cardId) => {
        Alert.alert(
            'Delete Card',
            'Are you sure you want to delete this card?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await storageService.deleteCard(cardId);
                        loadCards();
                    },
                },
            ]
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-outline" size={80} color={colors.textLight} />
            <Text style={styles.emptyTitle}>No Cards Yet</Text>
            <Text style={styles.emptyText}>
                Start scanning visiting cards to build your digital collection
            </Text>
            <TouchableOpacity
                style={styles.scanButton}
                onPress={() => navigation.navigate('Camera')}
            >
                <Ionicons name="camera" size={20} color={colors.textWhite} />
                <Text style={styles.scanButtonText}>Scan First Card</Text>
            </TouchableOpacity>
        </View>
    );

    const renderCard = ({ item }) => (
        <CardPreview
            card={item}
            onPress={() => navigation.navigate('Result', { cardData: item })}
            onDelete={() => handleDelete(item.id)}
        />
    );

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
                <Text style={styles.headerTitle}>History</Text>
                <View style={styles.placeholder} />
            </LinearGradient>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search cards..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                    placeholderTextColor={colors.textLight}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearch('')}>
                        <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{cards.length}</Text>
                    <Text style={styles.statLabel}>Total Cards</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                        {cards.filter((c) => c.syncedToSheet).length}
                    </Text>
                    <Text style={styles.statLabel}>Synced</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                        {cards.filter((c) => !c.syncedToSheet).length}
                    </Text>
                    <Text style={styles.statLabel}>Local Only</Text>
                </View>
            </View>

            {/* Cards List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading cards...</Text>
                </View>
            ) : filteredCards.length === 0 ? (
                renderEmptyState()
            ) : (
                <FlatList
                    data={filteredCards}
                    renderItem={renderCard}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        margin: spacing.lg,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        paddingVertical: spacing.md,
        fontSize: typography.fontSizes.base,
        color: colors.textPrimary,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: typography.fontSizes['2xl'],
        fontWeight: typography.fontWeights.bold,
        color: colors.primary,
    },
    statLabel: {
        fontSize: typography.fontSizes.xs,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    listContent: {
        padding: spacing.lg,
        paddingTop: 0,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    emptyTitle: {
        fontSize: typography.fontSizes['2xl'],
        fontWeight: typography.fontWeights.bold,
        color: colors.textPrimary,
        marginTop: spacing.lg,
    },
    emptyText: {
        fontSize: typography.fontSizes.base,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.xl,
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.lg,
    },
    scanButtonText: {
        color: colors.textWhite,
        fontSize: typography.fontSizes.base,
        fontWeight: typography.fontWeights.semibold,
        marginLeft: spacing.sm,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: typography.fontSizes.base,
        color: colors.textSecondary,
    },
});

export default HistoryScreen;
