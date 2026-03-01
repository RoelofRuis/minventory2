import { ref } from 'vue';
import axios from 'axios';

const questions = ref<any[]>([]);
const loading = ref(false);

export function useArtisticQuestionStore() {
  const fetchQuestions = async () => {
    loading.value = true;
    try {
      const res = await axios.get('/api/artistic-questions');
      questions.value = res.data;
    } catch (err) {
      console.error('Failed to fetch artistic questions', err);
    } finally {
      loading.value = false;
    }
  };

  const createQuestion = async (question: string, answer: string) => {
    try {
      await axios.post('/api/artistic-questions', { question, answer });
      await fetchQuestions();
    } catch (err) {
      console.error('Failed to create artistic question', err);
      throw err;
    }
  };

  const updateQuestion = async (id: string, question: string, answer: string) => {
    try {
      await axios.put(`/api/artistic-questions/${id}`, { question, answer });
      await fetchQuestions();
    } catch (err) {
      console.error('Failed to update artistic question', err);
      throw err;
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      await axios.delete(`/api/artistic-questions/${id}`);
      await fetchQuestions();
    } catch (err) {
      console.error('Failed to delete artistic question', err);
      throw err;
    }
  };

  return {
    questions,
    loading,
    fetchQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion
  };
}
