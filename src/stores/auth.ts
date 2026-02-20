import { defineStore } from 'pinia';
import axios from 'axios';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: localStorage.getItem('token') || null,
        user: null as any,
        showPrivate: false,
        editMode: localStorage.getItem('editMode') === 'true',
        gridColumns: Math.min(Math.max(Number(localStorage.getItem('gridColumns')) || 3, 1), 5)
    }),
    getters: {
        isAuthenticated: (state) => !!state.token
    },
    actions: {
        setToken(token: string) {
            this.token = token;
            localStorage.setItem('token', token);
        },
        async logout() {
            try {
                await axios.post('/api/auth/logout');
            } catch (err) {
                console.error('Logout failed', err);
            }
            this.token = null;
            this.user = null;
            this.showPrivate = false;
            this.editMode = false;
            localStorage.removeItem('token');
            localStorage.setItem('editMode', 'false');
        },
        togglePrivate(val: boolean) {
            this.showPrivate = val;
        },
        setEditMode(val: boolean) {
            this.editMode = val;
            localStorage.setItem('editMode', String(val));
            // Enabling edit mode enables private view by default; disabling turns it off
            if (val) {
                this.showPrivate = true;
            } else {
                this.showPrivate = false;
            }
        },
        setGridColumns(cols: number) {
            const cappedCols = Math.min(Math.max(cols, 1), 5);
            this.gridColumns = cappedCols;
            localStorage.setItem('gridColumns', String(cappedCols));
        }
    }
});
