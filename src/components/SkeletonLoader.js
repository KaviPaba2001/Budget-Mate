import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../styles/theme';

const SkeletonLoader = ({ children }) => {
    const x = useSharedValue(-1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: x.value * 350 }],
        };
    });

    useEffect(() => {
        x.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.linear }), -1, true);
    }, []);

    return (
        <View style={styles.container}>
            {children}
            <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
                <LinearGradient
                    style={StyleSheet.absoluteFill}
                    colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                />
            </Animated.View>
        </View>
    );
};

export const Skeleton = ({ width, height, style }) => (
    <View style={[{ width, height, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, overflow: 'hidden' }, style]}>
        <SkeletonLoader />
    </View>
);

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
    },
});
