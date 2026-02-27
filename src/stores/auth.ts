import { defineStore } from 'pinia';
import axios from 'axios';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null as any,
        showPrivate: localStorage.getItem('showPrivate') === 'true',
        editMode: localStorage.getItem('editMode') === 'true',
        gridColumns: Math.min(Math.max(Number(localStorage.getItem('gridColumns')) || 3, 1), 5)
    }),
    getters: {
        isAuthenticated: (state) => !!state.user
    },
    actions: {
        async checkAuth() {
            try {
                const res = await axios.get('/api/auth/me');
                this.user = res.data;
                // Sync private mode from backend session
                this.showPrivate = !!res.data.privateUnlocked;
                localStorage.setItem('showPrivate', String(this.showPrivate));
            } catch (err: any) {
                this.user = null;
                // If not authenticated, clear session-based settings
                if (err.response?.status === 401) {
                    this.showPrivate = false;
                    this.editMode = false;
                    this.gridColumns = 3;
                    localStorage.clear();
                }
            }
        },
        setUser(user: any) {
            this.user = user;
        },
        async logout() {
            try {
                await axios.post('/api/auth/logout');
            } catch (err) {
                console.error('Logout failed', err);
            }
            this.user = null;
            this.showPrivate = false;
            this.editMode = false;
            this.gridColumns = 3;
            localStorage.clear();
            window.location.href = '/login';
        },
        togglePrivate(val: boolean) {
            this.showPrivate = val;
            localStorage.setItem('showPrivate', String(val));
        },
        setEditMode(val: boolean) {
            this.editMode = val;
            localStorage.setItem('editMode', String(val));
            // Enabling edit mode enables private view by default; disabling turns it off
            if (val) {
                this.showPrivate = true;
                localStorage.setItem('showPrivate', 'true');
            } else {
                this.showPrivate = false;
                localStorage.setItem('showPrivate', 'false');
            }
        },
        setGridColumns(cols: number) {
            const cappedCols = Math.min(Math.max(cols, 1), 5);
            this.gridColumns = cappedCols;
            localStorage.setItem('gridColumns', String(cappedCols));
        }
    }
});
