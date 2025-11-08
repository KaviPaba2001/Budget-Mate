import { doc, getDoc, setDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../../firebase';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [userName, setUserNameState] = useState('User');
    const [profileImage, setProfileImageState] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load user data from Firebase when component mounts
    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.log('No user logged in');
                setLoading(false);
                return;
            }

            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                setUserNameState(userData.name || 'User');
                setProfileImageState(userData.profileImage || null);
                console.log('User data loaded from Firebase');
            } else {
                // Create default user document if it doesn't exist
                await setDoc(userDocRef, {
                    name: 'User',
                    email: user.email || '',
                    profileImage: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
                console.log('Created new user document');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveUserName = async (newName) => {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No user logged in');
            }

            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, {
                name: newName,
                updatedAt: new Date().toISOString(),
            }, { merge: true });

            setUserNameState(newName);
            console.log('User name saved to Firebase');
            return true;
        } catch (error) {
            console.error('Error saving user name:', error);
            throw error;
        }
    };

    const saveProfileImage = async (newImage) => {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No user logged in');
            }

            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, {
                profileImage: newImage,
                updatedAt: new Date().toISOString(),
            }, { merge: true });

            setProfileImageState(newImage);
            console.log('Profile image saved to Firebase');
            return true;
        } catch (error) {
            console.error('Error saving profile image:', error);
            throw error;
        }
    };

    return (
        <UserContext.Provider value={{ 
            userName, 
            setUserName: saveUserName, 
            profileImage, 
            setProfileImage: saveProfileImage,
            loading,
            refreshUserData: loadUserData,
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};