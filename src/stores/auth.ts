import axios from 'axios';
import {computed, ref} from "vue";
import {getLocalStorageItem} from "../utils/localstorage.ts";

const user = ref<any>(null);
const showPrivate = ref<boolean>(getLocalStorageItem('showPrivate', false));
const editMode = ref<boolean>(getLocalStorageItem('editMode', false));

export function useAuthStore() {
    const isAuthenticated = computed(() => !!user.value);
    const is2FAVerified = computed(() => user.value?.is2FAVerified ?? false);

    const checkAuth = async () => {
        try {
            const res = await axios.get('/api/auth/me');
            user.value = res.data;
            // Sync private mode from backend session
            showPrivate.value = !!res.data.privateUnlocked;
            localStorage.setItem('showPrivate', String(showPrivate.value));
        } catch (err: any) {
            user.value = null;
            // If not authenticated, clear session-based settings.ts
            if (err.response?.status === 401) {
                showPrivate.value = false;
                editMode.value = false;
                localStorage.clear();
            }
        }
    };

    const logoutSession = async () => {
        try {
            await axios.post('/api/auth/logout');
        } catch (err) {
            console.error('Logout failed', err);
        }
        user.value = null;
        showPrivate.value = false;
        editMode.value = false;
        localStorage.clear();
        window.location.href = '/login';
    };

    const togglePrivate = async (val: boolean) => {
        showPrivate.value = val;
        localStorage.setItem('showPrivate', String(val));
        if (!val) {
            try {
                await axios.post('/api/auth/lock-private');
            } catch (err) {
                console.error('Failed to lock private items on backend', err);
            }
        }
    };

    const setEditMode = async (val: boolean) => {
        editMode.value = val;
        localStorage.setItem('editMode', String(val));
        // Enabling edit mode enables private view by default; disabling turns it off
        await togglePrivate(val);
    };


    return {
        user,
        showPrivate,
        editMode,
        isAuthenticated,
        is2FAVerified,
        checkAuth,
        logoutSession,
        togglePrivate,
        setEditMode,
    };
}