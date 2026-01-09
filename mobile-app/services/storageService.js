import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    SCANNED_CARDS: '@scanned_cards',
    SETTINGS: '@settings',
    PENDING_UPLOADS: '@pending_uploads',
};

class StorageService {
    /**
     * Save a scanned card to local storage
     * @param {Object} cardData - Card data to save
     */
    async saveScannedCard(cardData) {
        try {
            const cards = await this.getScannedCards();
            const newCard = {
                id: Date.now().toString(),
                ...cardData,
                scannedAt: new Date().toISOString(),
                syncedToSheet: false,
            };

            cards.unshift(newCard);
            await AsyncStorage.setItem(STORAGE_KEYS.SCANNED_CARDS, JSON.stringify(cards));
            return newCard;
        } catch (error) {
            console.error('Error saving card:', error);
            throw error;
        }
    }

    /**
     * Get all scanned cards from storage
     * @returns {Promise<Array>} - Array of scanned cards
     */
    async getScannedCards() {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.SCANNED_CARDS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error getting cards:', error);
            return [];
        }
    }

    /**
     * Update a scanned card
     * @param {string} cardId - Card ID
     * @param {Object} updates - Updated data
     */
    async updateCard(cardId, updates) {
        try {
            const cards = await this.getScannedCards();
            const index = cards.findIndex(c => c.id === cardId);

            if (index !== -1) {
                cards[index] = { ...cards[index], ...updates };
                await AsyncStorage.setItem(STORAGE_KEYS.SCANNED_CARDS, JSON.stringify(cards));
                return cards[index];
            }

            throw new Error('Card not found');
        } catch (error) {
            console.error('Error updating card:', error);
            throw error;
        }
    }

    /**
     * Delete a scanned card
     * @param {string} cardId - Card ID
     */
    async deleteCard(cardId) {
        try {
            const cards = await this.getScannedCards();
            const filtered = cards.filter(c => c.id !== cardId);
            await AsyncStorage.setItem(STORAGE_KEYS.SCANNED_CARDS, JSON.stringify(filtered));
        } catch (error) {
            console.error('Error deleting card:', error);
            throw error;
        }
    }

    /**
     * Mark card as synced to Google Sheets
     * @param {string} cardId - Card ID
     */
    async markAsSynced(cardId) {
        return this.updateCard(cardId, { syncedToSheet: true });
    }

    /**
     * Get settings from storage
     * @returns {Promise<Object>} - App settings
     */
    async getSettings() {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
            return data ? JSON.parse(data) : {
                autoSync: true,
                language: 'en',
                theme: 'light',
            };
        } catch (error) {
            console.error('Error getting settings:', error);
            return {};
        }
    }

    /**
     * Save settings to storage
     * @param {Object} settings - Settings to save
     */
    async saveSettings(settings) {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    }

    /**
     * Add card to pending uploads queue
     * @param {Object} cardData - Card data to queue
     */
    async addToPendingUploads(cardData) {
        try {
            const pending = await this.getPendingUploads();
            pending.push(cardData);
            await AsyncStorage.setItem(STORAGE_KEYS.PENDING_UPLOADS, JSON.stringify(pending));
        } catch (error) {
            console.error('Error adding to pending:', error);
            throw error;
        }
    }

    /**
     * Get pending uploads
     * @returns {Promise<Array>} - Pending uploads
     */
    async getPendingUploads() {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_UPLOADS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error getting pending uploads:', error);
            return [];
        }
    }

    /**
     * Clear pending uploads
     */
    async clearPendingUploads() {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.PENDING_UPLOADS, JSON.stringify([]));
        } catch (error) {
            console.error('Error clearing pending:', error);
            throw error;
        }
    }

    /**
     * Clear all data (for testing/reset)
     */
    async clearAll() {
        try {
            await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
        } catch (error) {
            console.error('Error clearing storage:', error);
            throw error;
        }
    }
}

export default new StorageService();
