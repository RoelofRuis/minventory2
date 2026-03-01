import {ref} from "vue";
import axios from "axios";
import {useAuthStore} from "./auth.ts";

const loans = ref<any[]>([]);
const loading = ref(false);

export function useLoanStore() {
    const { editMode } = useAuthStore();

    const fetchLoans = async (force = false) => {
        if (loans.value.length > 0 && !force) return;
        loading.value = true;
        try {
            const res = await axios.get('/api/loans');
            loans.value = res.data;
        } catch (err) {
            console.error('Failed to fetch loans', err);
        } finally {
            loading.value = false;
        }
    }

    const returnLoan = async (id: string) => {
        if (!editMode.value) return;
        try {
            await axios.post(`/api/loans/${id}/return`, {});
            // TODO: general update is missed?
        } catch (err) {
            alert('Failed to return loan');
        }
    };

    const deleteLoan = async (id: string) => {
        if (!editMode.value) return;
        if (confirm('Delete this loan record?')) {
            try {
                await axios.delete(`/api/loans/${id}`);
                // TODO: general update is missed?
            } catch (err) {
                alert('Failed to delete loan');
            }
        }
    };

    return {
        loans,
        loading,
        returnLoan,
        fetchLoans,
        deleteLoan,
    }
}