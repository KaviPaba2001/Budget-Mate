import React, { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, withDelay } from 'react-native-reanimated';

// A reusable animated component wrapper for staggered animations
export default function AnimatedView({ children, index }) {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [{ translateY: translateY.value }],
        };
    });

    useEffect(() => {
        // Apply a delay based on the component's index to stagger the animation
        opacity.value = withDelay(index * 100, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
        translateY.value = withDelay(index * 100, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
    }, []);

    return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};
