import { db } from './firebase';
import { collection, getDocs, setDoc, doc, updateDoc, arrayUnion, query, where } from 'firebase/firestore';

const STORAGE_KEY_CURRENT_USER = 'photo_share_current_user';

export interface User {
  username: string;
  password?: string; // Optional for Google users
  friends: string[];
  googleId?: string;
}

export interface Photo {
  id: string;
  url: string;
  uploader: string;
  tags: string[];
  timestamp: number;
}

export const storage = {
  getCurrentUser: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY_CURRENT_USER);
  },

  setCurrentUser: (username: string | null) => {
    if (typeof window === 'undefined') return;
    if (username) {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, username);
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    }
  },

  getUsers: async (): Promise<User[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      return querySnapshot.docs.map(doc => doc.data() as User);
    } catch (error) {
      console.error("Error getting users:", error);
      return [];
    }
  },

  getUserByGoogleId: async (googleId: string): Promise<User | undefined> => {
    try {
      const q = query(collection(db, 'users'), where("googleId", "==", googleId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as User;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting user by googleId:", error);
      return undefined;
    }
  },

  registerUser: async (user: User): Promise<{ success: boolean; message?: string }> => {
    try {
      // Check if username exists
      const userDoc = doc(db, 'users', user.username);
      // We can't easily check existence without reading, but setDoc will overwrite.
      // Ideally we should check if it exists first to avoid overwriting.
      // For this demo, we'll assume the UI checks or we just try to read it first.

      // Simple check by reading all (optimization: use getDoc)
      // Better: use getDoc(doc(db, 'users', user.username))
      // But sticking to the pattern:

      const users = await storage.getUsers();
      if (users.find(u => u.username === user.username)) {
        return { success: false, message: 'Username already exists' };
      }

      await setDoc(doc(db, 'users', user.username), user);
      return { success: true };
    } catch (error: any) {
      console.error("Error registering user:", error);
      return { success: false, message: error.message || 'Registration failed' };
    }
  },

  addFriend: async (currentUsername: string, targetUsername: string): Promise<boolean> => {
    try {
      const currentUserRef = doc(db, 'users', currentUsername);
      const targetUserRef = doc(db, 'users', targetUsername);

      await updateDoc(currentUserRef, {
        friends: arrayUnion(targetUsername)
      });

      await updateDoc(targetUserRef, {
        friends: arrayUnion(currentUsername)
      });

      return true;
    } catch (error) {
      console.error("Error adding friend:", error);
      return false;
    }
  },

  getFriends: async (username: string): Promise<string[]> => {
    try {
      const users = await storage.getUsers();
      const user = users.find(u => u.username === username);
      return user ? user.friends : [];
    } catch (error) {
      console.error("Error getting friends:", error);
      return [];
    }
  },

  getPhotos: async (): Promise<Photo[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, 'photos'));
      return querySnapshot.docs.map(doc => doc.data() as Photo).sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error("Error getting photos:", error);
      return [];
    }
  },

  savePhoto: async (photo: Photo): Promise<void> => {
    try {
      await setDoc(doc(db, 'photos', photo.id), photo);
    } catch (error) {
      console.error("Error saving photo:", error);
    }
  }
};
