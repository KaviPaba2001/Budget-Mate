import React from 'react';
import { TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

export default function AnimatedPressable({ children, onPress, style }) {
    const scale = useSharedValue(1);

    // Create an animated style that will react to changes in the 'scale' value
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    // When the user presses down, animate the scale to 0.95
    const handlePressIn = () => {
        scale.value = withSpring(0.95);
    };

    // When the user releases, animate the scale back to 1
    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={style}
                activeOpacity={0.8} // We can keep a subtle opacity change as well
            >
                {children}
            </TouchableOpacity>
        </Animated.View>
    );
}
