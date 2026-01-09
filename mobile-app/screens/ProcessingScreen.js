import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import LoadingSpinner from '../components/LoadingSpinner';
import geminiService from '../services/geminiService';
import sheetsService from '../services/sheetsService';
import storageService from '../services/storageService';
import { colors } from '../styles/theme';

const ProcessingScreen = ({ navigation, route }) => {
    const { imageUri } = route.params;
    const [status, setStatus] = useState('Analyzing image...');

    useEffect(() => {
        processImage();
    }, []);

    const processImage = async () => {
        try {
            // Step 1: Convert image to base64
            setStatus('Preparing image...');
            const base64 = await FileSystem.readAsStringAsync(imageUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Step 2: Extract data using Gemini
            setStatus('Extracting information with AI...');
            const extractionResult = await geminiService.extractCardData(base64);

            if (!extractionResult.success) {
                throw new Error(extractionResult.error || 'Failed to extract data');
            }

            const cardData = extractionResult.data;

            // Step 3: Save to local storage
            setStatus('Saving to local storage...');
            const savedCard = await storageService.saveScannedCard({
                ...cardData,
                imageUri,
            });

            // Step 4: Try to sync with Google Sheets
            setStatus('Syncing with Google Sheets...');
            try {
                const sheetResult = await sheetsService.appendToSheet(cardData);

                if (sheetResult.success) {
                    await storageService.markAsSynced(savedCard.id);
                    savedCard.syncedToSheet = true;
                } else if (sheetResult.isDuplicate) {
                    Alert.alert(
                        'Duplicate Entry',
                        'This card appears to already exist in your database.',
                        [{ text: 'OK' }]
                    );
                }
            } catch (sheetError) {
                console.log('Sheet sync failed, saved locally:', sheetError);
                // Continue anyway - data is saved locally
            }

            // Step 5: Navigate to results
            setStatus('Complete!');
            setTimeout(() => {
                navigation.replace('Result', { cardData: savedCard });
            }, 500);

        } catch (error) {
            console.error('Processing error:', error);
            Alert.alert(
                'Processing Failed',
                error.message || 'Failed to process the visiting card. Please try again.',
                [
                    {
                        text: 'Try Again',
                        onPress: () => navigation.goBack(),
                    },
                    {
                        text: 'Cancel',
                        onPress: () => navigation.navigate('Home'),
                        style: 'cancel',
                    },
                ]
            );
        }
    };

    return (
        <View style={styles.container}>
            <LoadingSpinner message={status} />
            {imageUri && (
                <View style={styles.imagePreview}>
                    <Image source={{ uri: imageUri }} style={styles.image} />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    imagePreview: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 150,
        opacity: 0.3,
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
});

export default ProcessingScreen;
