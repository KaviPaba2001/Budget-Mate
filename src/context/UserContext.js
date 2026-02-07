import { doc, getDoc, setDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../../firebase';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [userName, setUserNameState] = useState('User');
    const [profileImage, setProfileImageState] = useState(null);
    const [loading, setLoading] = useState(true);

    // Listen to auth state changes
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('Auth state changed - User logged in:', user.uid);
                loadUserData();
            } else {
                console.log('Auth state changed - No user logged in');
                setUserNameState('User');
                setProfileImageState(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const loadUserData = async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.log('No user logged in');
                setLoading(false);
                return;
            }

            console.log('Loading user data for:', user.uid);
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                console.log('User data loaded:', userData);
                setUserNameState(userData.name || 'User');
                setProfileImageState(userData.profileImage || null);
            } else {
                console.log('User document does not exist, creating default...');
                // Create default user document if it doesn't exist
                const defaultData = {
                    name: 'User',
                    email: user.email || '',
                    profileImage: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                
                await setDoc(userDocRef, defaultData);
                console.log('Created new user document with default data');
                setUserNameState('User');
                setProfileImageState(null);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                name: error.name
            });
        } finally {
            setLoading(false);
        }
    };

    const saveUserName = async (newName) => {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.error('No user logged in - cannot save name');
                throw new Error('No user logged in');
            }

            console.log('=== SAVING USER NAME ===');
            console.log('User ID:', user.uid);
            console.log('New Name:', newName);

            const userDocRef = doc(db, 'users', user.uid);
            const updateData = {
                name: newName,
                updatedAt: new Date().toISOString(),
            };

            // Use setDoc with merge to update only specific fields
            await setDoc(userDocRef, updateData, { merge: true });

            setUserNameState(newName);
            console.log('✅ User name saved successfully to Firebase');
            
            // Verify the save by reading back
            const verifyDoc = await getDoc(userDocRef);
            if (verifyDoc.exists()) {
                console.log('Verification - Data in Firebase:', verifyDoc.data());
            }
            
            return true;
        } catch (error) {
            console.error('=== ERROR SAVING USER NAME ===');
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Full error:', error);
            throw error;
        }
    };

    const saveProfileImage = async (newImage) => {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.error('No user logged in - cannot save image');
                throw new Error('No user logged in');
            }

            console.log('=== SAVING PROFILE IMAGE ===');
            console.log('User ID:', user.uid);
            console.log('New Image URI:', newImage ? newImage.substring(0, 50) + '...' : 'null');

            const userDocRef = doc(db, 'users', user.uid);
            const updateData = {
                profileImage: newImage,
                updatedAt: new Date().toISOString(),
            };

            // Use setDoc with merge to update only specific fields
            await setDoc(userDocRef, updateData, { merge: true });

            setProfileImageState(newImage);
            console.log('✅ Profile image saved successfully to Firebase');
            
            // Verify the save by reading back
            const verifyDoc = await getDoc(userDocRef);
            if (verifyDoc.exists()) {
                console.log('Verification - Data in Firebase:', verifyDoc.data());
            }
            
            return true;
        } catch (error) {
            console.error('=== ERROR SAVING PROFILE IMAGE ===');
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Full error:', error);
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