<template>
  <div class="container">
    <div class="header-row">
      <h2 class="app-title">Artistic Questions</h2>
      <button class="btn-primary" @click="showAddModal = true" style="width: auto;">
        <Plus :size="20" style="vertical-align: middle; margin-right: 4px;" /> Add Question
      </button>
    </div>

    <div v-if="artisticStore.loading" class="silver-text">Loading questions...</div>

    <div v-if="artisticStore.questions.length > 0" class="questions-list">
      <div v-for="q in artisticStore.questions" :key="q.id" class="card question-card">
        <div class="question-header">
          <div class="question-text">
            <HelpCircle :size="20" class="accent-purple" style="flex-shrink: 0;" />
            <h3 class="accent-text">{{ q.question }}</h3>
          </div>
          <div class="actions">
            <button class="icon-btn" @click="editQuestion(q)" title="Edit">
              <Edit2 :size="16" />
            </button>
            <button class="icon-btn" @click="deleteQuestion(q.id)" title="Delete" style="color: #ef4444;">
              <Trash2 :size="16" />
            </button>
          </div>
        </div>
        <div class="answer-text">
          <p v-for="(line, index) in (typeof q.answer === 'string' ? q.answer : '').split('\n')" :key="index">{{ line }}</p>
        </div>
        <div class="question-footer">
          <span class="silver-text date">{{ formatDate(q.createdAt) }}</span>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingQuestion" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content card">
        <div class="modal-header">
          <h2>{{ editingQuestion ? 'Edit Question' : 'Add Artistic Question' }}</h2>
          <X class="modal-close" @click="closeModal" />
        </div>
        <div class="form-group">
          <label>Question</label>
          <input v-model="form.question" type="text" placeholder="e.g. Why do I own this?" />
        </div>
        <div class="form-group">
          <label>Writings / Answer</label>
          <textarea v-model="form.answer" rows="8" placeholder="Your thoughts..."></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeModal" style="width: auto;">Cancel</button>
          <button class="btn-primary" @click="saveQuestion" :disabled="!form.question || !form.answer" style="width: auto;">
            {{ editingQuestion ? 'Update' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useArtisticQuestionStore } from '../stores/artisticQuestion';
import { Plus, HelpCircle, Edit2, Trash2, X } from 'lucide-vue-next';

const artisticStore = useArtisticQuestionStore();
const showAddModal = ref(false);
const editingQuestion = ref<any>(null);

const form = ref({
  question: '',
  answer: ''
});

onMounted(() => {
  artisticStore.fetchQuestions();
});

const editQuestion = (q: any) => {
  editingQuestion.value = q;
  form.value = {
    question: q.question,
    answer: q.answer
  };
};

const closeModal = () => {
  showAddModal.value = false;
  editingQuestion.value = null;
  form.value = { question: '', answer: '' };
};

const saveQuestion = async () => {
  if (editingQuestion.value) {
    await artisticStore.updateQuestion(editingQuestion.value.id, form.value.question, form.value.answer);
  } else {
    await artisticStore.createQuestion(form.value.question, form.value.answer);
  }
  closeModal();
};

const deleteQuestion = async (id: string) => {
  if (confirm('Are you sure you want to delete this question?')) {
    await artisticStore.deleteQuestion(id);
  }
};

const formatDate = (date: any) => {
  return new Date(date).toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};
</script>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-top: 1rem;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.question-card {
  padding: 1.5rem;
  transition: transform 0.2s;
  margin-bottom: 0;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.question-text {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.question-text h3 {
  margin: 0;
  font-size: 1.25rem;
}

.answer-text {
  line-height: 1.6;
  margin-bottom: 1rem;
  white-space: pre-wrap;
}

.answer-text p {
  margin: 0 0 0.75rem 0;
}

.answer-text p:last-child {
  margin-bottom: 0;
}

.question-footer {
  display: flex;
  justify-content: flex-end;
  font-size: 0.8rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

@media (max-width: 600px) {
  .header-row {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    text-align: center;
  }
  
  .header-row .btn-primary {
    width: 100% !important;
  }
}
</style>
