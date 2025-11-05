import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

// Create the context
const UserContext = createContext();

// Create a provider component
export const UserProvider = ({ children }) => {
    const [userName, setUserName] = useState('User'); // Default user name
    const [profileImage, setProfileImage] = useState(null); // Default profile image

    // Load user data on mount
    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const savedUserName = await AsyncStorage.getItem('userName');
            const savedProfileImage = await AsyncStorage.getItem('profileImage');
            
            if (savedUserName) setUserName(savedUserName);
            if (savedProfileImage) setProfileImage(savedProfileImage);
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    };

    const saveUserName = async (newName) => {
        try {
            await AsyncStorage.setItem('userName', newName);
            setUserName(newName);
        } catch (error) {
            console.error('Error saving user name:', error);
            setUserName(newName); // Set anyway
        }
    };

    const saveProfileImage = async (newImage) => {
        try {
            if (newImage) {
                await AsyncStorage.setItem('profileImage', newImage);
            } else {
                await AsyncStorage.removeItem('profileImage');
            }
            setProfileImage(newImage);
        } catch (error) {
            console.error('Error saving profile image:', error);
            setProfileImage(newImage); // Set anyway
        }
    };

    return (
        <UserContext.Provider value={{ 
            userName, 
            setUserName: saveUserName, 
            profileImage, 
            setProfileImage: saveProfileImage 
        }}>
            {children}
        </UserContext.Provider>
    );
};

// Create a custom hook to use the UserContext
export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
