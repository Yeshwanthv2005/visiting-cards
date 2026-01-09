import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    Image,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../styles/theme';

const CameraScreen = ({ navigation, route }) => {
    const [hasPermission, setHasPermission] = useState(null);
    const [flashMode, setFlashMode] = useState(Camera.Constants.FlashMode.off);
    const [capturedImage, setCapturedImage] = useState(null);
    const cameraRef = useRef(null);
    const mode = route?.params?.mode || 'camera';

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');

            // If gallery mode, open image picker immediately
            if (mode === 'gallery') {
                pickImage();
            }
        })();
    }, []);

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Please allow access to your photo library.');
            navigation.goBack();
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 1,
        });

        if (!result.canceled) {
            setCapturedImage(result.assets[0].uri);
            processImage(result.assets[0].uri);
        } else {
            navigation.goBack();
        }
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 1,
                    base64: false,
                });
                setCapturedImage(photo.uri);
                processImage(photo.uri);
            } catch (error) {
                Alert.alert('Error', 'Failed to capture image');
                console.error(error);
            }
        }
    };

    const processImage = (imageUri) => {
        // Navigate to processing screen with the image
        navigation.navigate('Processing', { imageUri });
    };

    const toggleFlash = () => {
        setFlashMode(
            flashMode === Camera.Constants.FlashMode.off
                ? Camera.Constants.FlashMode.on
                : Camera.Constants.FlashMode.off
        );
    };

    if (hasPermission === null) {
        return (
            <View style={styles.centered}>
                <Text>Requesting camera permission...</Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.centered}>
                <Ionicons name="camera-off" size={64} color={colors.textLight} />
                <Text style={styles.errorText}>No access to camera</Text>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.buttonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (mode === 'gallery') {
        return null; // Image picker handles UI
    }

    return (
        <SafeAreaView style={styles.container}>
            <Camera
                ref={cameraRef}
                style={styles.camera}
                type={Camera.Constants.Type.back}
                flashMode={flashMode}
            >
                {/* Header with close button */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="close" size={32} color={colors.textWhite} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerButton} onPress={toggleFlash}>
                        <Ionicons
                            name={flashMode === Camera.Constants.FlashMode.off ? 'flash-off' : 'flash'}
                            size={32}
                            color={colors.textWhite}
                        />
                    </TouchableOpacity>
                </View>

                {/* Grid overlay for better alignment */}
                <View style={styles.gridOverlay}>
                    <View style={styles.gridLine} />
                    <View style={[styles.gridLine, styles.gridLineVertical]} />
                </View>

                {/* Guide box */}
                <View style={styles.guideBox}>
                    <View style={styles.corner} style={[styles.corner, styles.topLeft]} />
                    <View style={styles.corner} style={[styles.corner, styles.topRight]} />
                    <View style={styles.corner} style={[styles.corner, styles.bottomLeft]} />
                    <View style={styles.corner} style={[styles.corner, styles.bottomRight]} />
                </View>

                {/* Instructions */}
                <View style={styles.instructionsContainer}>
                    <Text style={styles.instructions}>Align the visiting card within the frame</Text>
                </View>

                {/* Bottom controls */}
                <View style={styles.controls}>
                    <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
                        <Ionicons name="images" size={28} color={colors.textWhite} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                        <View style={styles.captureButtonInner} />
                    </TouchableOpacity>

                    <View style={styles.placeholder} />
                </View>
            </Camera>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.textPrimary,
    },
    camera: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
        padding: spacing.lg,
    },
    errorText: {
        fontSize: typography.fontSizes.lg,
        color: colors.textSecondary,
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.lg,
    },
    buttonText: {
        color: colors.textWhite,
        fontSize: typography.fontSizes.base,
        fontWeight: typography.fontWeights.semibold,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: spacing.lg,
    },
    headerButton: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.full,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridLine: {
        position: 'absolute',
        width: '100%',
        height: 1,
        backgroundColor: colors.textWhite,
        opacity: 0.3,
    },
    gridLineVertical: {
        width: 1,
        height: '100%',
    },
    guideBox: {
        position: 'absolute',
        top: '25%',
        left: '10%',
        right: '10%',
        height: '30%',
        borderWidth: 2,
        borderColor: colors.primary,
        borderRadius: borderRadius.md,
    },
    corner: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderColor: colors.accent,
    },
    topLeft: {
        top: -2,
        left: -2,
        borderTopWidth: 4,
        borderLeftWidth: 4,
    },
    topRight: {
        top: -2,
        right: -2,
        borderTopWidth: 4,
        borderRightWidth: 4,
    },
    bottomLeft: {
        bottom: -2,
        left: -2,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
    },
    bottomRight: {
        bottom: -2,
        right: -2,
        borderBottomWidth: 4,
        borderRightWidth: 4,
    },
    instructionsContainer: {
        position: 'absolute',
        top: '58%',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    instructions: {
        color: colors.textWhite,
        fontSize: typography.fontSizes.base,
        backgroundColor: colors.overlay,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    controls: {
        position: 'absolute',
        bottom: spacing.xl,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.textWhite,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: colors.primary,
    },
    captureButtonInner: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: colors.primary,
    },
    galleryButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholder: {
        width: 56,
    },
});

export default CameraScreen;
