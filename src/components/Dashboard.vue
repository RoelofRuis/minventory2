<script setup lang="ts">
import {ref, onMounted, onUnmounted, computed, nextTick, watch} from 'vue';
import axios from 'axios';
import {useAuthStore} from '../stores/auth';
import {formatStat, isDefined, getStatColor} from '../utils/formatters';
import {usageFrequencies, attachments, intentions, joys} from '../utils/constants';
import {
  Plus, Edit2, Trash2, Camera,
  ArrowRightLeft, Package, Tag, Users, ArrowLeft,
  CheckCircle, X, Lock, Gift,
  Smile, Zap, Target, Heart, Loader2
} from 'lucide-vue-next';
import {preload} from '@imgly/background-removal';
import {downscaleImage} from '../utils/imageProcessor';
import BackgroundRemovalWorker from '../workers/background-removal.worker?worker';
import ItemsTab from "./dashboard/ItemsTab.vue";
import {useItemStore} from "../stores/item.ts";
import {useCategoryStore} from "../stores/category.ts";
import {useSettings} from "../stores/settings.ts";

const authStore = useAuthStore();
const { gridColumns } = useSettings();
const {categories, visibleCategories, fetchCategories, getCategoryName, getCategoryColor} = useCategoryStore();
const {items, fetchItems} = useItemStore();

const saving = ref(false);

const currentTab = ref('items');
const loans = ref<any[]>([]);
const categorySearch = ref('');

// Modals state
const showItemModal = ref(false);
const showCategoryModal = ref(false);
const showTransactionModal = ref(false);
const showLoanModal = ref(false);
const showDetailModal = ref(false);
const modalView = ref('detail'); // 'detail', 'edit', 'transactions', 'lend'
const showCameraModal = ref(false);

const detailModalTitle = computed(() => {
  if (modalView.value === 'detail') return selectedItem.value?.name;
  if (modalView.value === 'edit') return editingItem.value ? 'Edit Item' : 'Add New Item';
  if (modalView.value === 'transactions') return `Adjust Quantity: ${selectedItem.value?.name}`;
  if (modalView.value === 'lend') return `Lend Item: ${selectedItem.value?.name}`;
  return '';
});

// TODO: Deprecated
const selectedItem = ref<any>(null);
const editingItem = ref<any>(null);
const editingCategory = ref<any>(null);

// Forms
const itemForm = ref({
  name: '',
  quantity: 0,
  usageFrequency: 'undefined',
  attachment: 'undefined',
  intention: 'undecided',
  joy: 'undefined',
  categoryIds: [] as string[],
  isBorrowed: false,
  borrowedFrom: '',
  isGifted: false,
  giftedBy: ''
});

const categoryForm = ref({
  name: '',
  description: '',
  color: '#9d50bb',
  intentionalCount: null as number | null,
  parentId: null as string | null,
  private: false
});

const transactionForm = ref({
  delta: 0,
  note: '',
  reason: undefined as string | undefined
});

const loanForm = ref({
  borrower: '',
  quantity: 1,
  note: ''
});

const fileInputRef = ref<HTMLInputElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const itemNameInput = ref<HTMLInputElement | null>(null);
const file = ref<File | null>(null);
const preview = ref<string | null>(null);
const stream = ref<MediaStream | null>(null);

const isolateObject = ref(false);
const processingBackground = ref(false);
const originalFile = ref<File | null>(null);
const originalPreview = ref<string | null>(null);

const setPreview = (source: Blob | string | null) => {
  if (preview.value && preview.value.startsWith('blob:')) {
    URL.revokeObjectURL(preview.value);
  }
  if (!source) {
    preview.value = null;
    return;
  }
  if (typeof source === 'string') {
    preview.value = source;
  } else {
    preview.value = URL.createObjectURL(source);
  }
};

const setOriginalPreview = (source: Blob | string | null) => {
  if (originalPreview.value && originalPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(originalPreview.value);
  }
  if (!source) {
    originalPreview.value = null;
    return;
  }
  if (typeof source === 'string') {
    originalPreview.value = source;
  } else {
    originalPreview.value = URL.createObjectURL(source);
  }
};

let worker: Worker | null = null;

const initWorker = () => {
  if (!worker) {
    worker = new BackgroundRemovalWorker();
  }
};

const preloadBackgroundRemoval = () => {
  preload({
    publicPath: window.location.origin + '/background-removal-data/'
  });
};

watch(() => authStore.editMode, (isEdit) => {
  if (isEdit) {
    preloadBackgroundRemoval();
    initWorker();
  }
}, {immediate: true});

watch([showItemModal, showCategoryModal, showTransactionModal, showLoanModal, showDetailModal, showCameraModal], (vals) => {
  if (vals.some(v => v)) {
    document.body.classList.add('modal-open');
  } else {
    nextTick(() => {
      if (document.querySelectorAll('.modal-overlay').length === 0) {
        document.body.classList.remove('modal-open');
        setPreview(null);
        setOriginalPreview(null);
      }
    });
  }
});

onUnmounted(() => {
  setPreview(null);
  setOriginalPreview(null);
  if (worker) {
    worker.terminate();
    worker = null;
  }
  nextTick(() => {
    if (document.querySelectorAll('.modal-overlay').length === 0) {
      document.body.classList.remove('modal-open');
    }
  });
});

// Computed
const closeMatches = computed(() => {
  const name = itemForm.value.name.trim().toLowerCase();
  if (name.length < 2) return [];

  return items.value
      .filter(item => {
        if (editingItem.value && item.id === editingItem.value.id) return false;
        return item.name.toLowerCase().includes(name);
      })
      .slice(0, 5);
});

const filteredCategories = computed(() => {
  const q = categorySearch.value.trim().toLowerCase();
  const base = [...visibleCategories.value] as any[];
  const results = q ? base.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
  ) : base;

  return results.sort((a, b) => a.name.localeCompare(b.name));
});

const sortedCategories = computed(() => {
  let cats = categories.value;
  if (!authStore.showPrivate) {
    cats = cats.filter(c => !c.private);
  }

  const result: any[] = [];
  const addChildren = (parentId: string | null, level: number) => {
    const children = cats
        .filter(c => (c.parentId || null) === parentId)
        .sort((a, b) => a.name.localeCompare(b.name));

    for (const child of children) {
      result.push({...child, level});
      addChildren(child.id, level + 1);
    }
  };
  addChildren(null, 0);

  // Add any categories that might have been missed (e.g. circular dependency or missing parent)
  const addedIds = new Set(result.map(c => c.id));
  const missed = cats.filter(c => !addedIds.has(c.id));
  for (const cat of missed) {
    result.push({...cat, level: 0});
  }

  return result;
});

watch(() => authStore.showPrivate, () => {
  fetchData(true);
});

// Fetching
const fetchData = async (force = false) => {
  const [_, __, loansRes] = await Promise.all([
    fetchCategories(force),
    fetchItems(force),
    axios.get('/api/loans')
  ]);

  loans.value = (loansRes as any).data;
};

// Item Actions
// Deprecated
const openItemModal = (item: any = null, keepImage = false) => {
  if (!authStore.editMode) return;
  editingItem.value = item;
  if (!keepImage) {
    file.value = null;
    originalFile.value = null;
    isolateObject.value = false;
  }

  if (item) {
    isolateObject.value = item.isIsolated || false;
    itemForm.value = {
      name: item.name,
      quantity: item.quantity,
      usageFrequency: item.usageFrequency,
      attachment: item.attachment,
      intention: item.intention,
      joy: item.joy,
      categoryIds: [...(item.categoryIds || [])],
      isBorrowed: item.isBorrowed || false,
      borrowedFrom: item.borrowedFrom || '',
      isGifted: item.isGifted || false,
      giftedBy: item.giftedBy || ''
    };
    if (item.image) {
      setPreview(item.image);
      setOriginalPreview(item.image);
    } else {
      setPreview(null);
      setOriginalPreview(null);
    }
  } else {
    itemForm.value = {
      name: '',
      quantity: 1,
      usageFrequency: 'undefined',
      attachment: 'undefined',
      intention: 'undecided',
      joy: 'undefined',
      categoryIds: [],
      isBorrowed: false,
      borrowedFrom: '',
      isGifted: false,
      giftedBy: ''
    };
    setPreview(null);
    setOriginalPreview(null);
  }

  if (showDetailModal.value) {
    modalView.value = 'edit';
  } else {
    showItemModal.value = true;
  }

  nextTick(() => {
    if (!item) {
      itemNameInput.value?.focus();
    }
  });
};


const triggerFileInput = () => startCamera();

const handleFileChange = async (e: any) => {
  const selectedFile = e.target.files[0];
  if (selectedFile) {
    originalFile.value = selectedFile;
    setOriginalPreview(selectedFile);

    if (!isolateObject.value) {
      setPreview(selectedFile);
      file.value = selectedFile;
    }

    if (isolateObject.value) {
      await applyBackgroundRemoval(selectedFile);
    }
  }
};

const handleIsolateChange = async () => {
  if (isolateObject.value) {
    if (originalFile.value) {
      await applyBackgroundRemoval(originalFile.value);
    }
  } else {
    // Revert to original
    if (originalFile.value) {
      file.value = originalFile.value;
      setPreview(originalFile.value);
    }
  }
};

const applyBackgroundRemoval = async (sourceFile: File) => {
  processingBackground.value = true;
  initWorker();
  try {
    const downscaled = await downscaleImage(sourceFile);

    return new Promise<void>((resolve, reject) => {
      if (!worker) return reject(new Error('Worker not initialized'));

      const handleMessage = (e: MessageEvent) => {
        worker?.removeEventListener('message', handleMessage);
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          const blob = e.data.blob;
          const newFile = new File([blob], sourceFile.name.replace(/\.[^/.]+$/, "") + ".png", {type: 'image/png'});
          file.value = newFile;
          setPreview(blob);
          resolve();
        }
      };

      worker.addEventListener('message', handleMessage);
      worker.postMessage({
        file: downscaled,
        config: {
          publicPath: window.location.origin + '/background-removal-data/'
        }
      });
    });
  } catch (err: any) {
    console.error('Background removal failed', err);
    isolateObject.value = false;
    alert('Failed to isolate object: ' + (err.message || 'Please try again or use a clearer photo.'));
  } finally {
    processingBackground.value = false;
  }
};

const removeImage = () => {
  file.value = null;
  setPreview(null);
  originalFile.value = null;
  setOriginalPreview(null);
  isolateObject.value = false;
};

const startCamera = async () => {
  try {
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera not supported');
    }

    showCameraModal.value = true;
    await nextTick();

    stream.value = await navigator.mediaDevices.getUserMedia({
      video: {facingMode: 'environment'},
      audio: false
    });

    if (videoRef.value) {
      videoRef.value.srcObject = stream.value;
    }
  } catch (err) {
    console.error('Failed to start camera', err);
    showCameraModal.value = false;
    // Fallback to file input
    fileInputRef.value?.click();
  }
};

const stopCamera = () => {
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop());
    stream.value = null;
  }
};

const closeCamera = () => {
  stopCamera();
  showCameraModal.value = false;
};

const capturePhoto = async () => {
  if (videoRef.value && canvasRef.value) {
    const video = videoRef.value;
    const canvas = canvasRef.value;

    // Use video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

      // Convert to blob and file
      const parts = dataUrl.split(',');
      const byteString = atob(parts[1] || '');
      const mimeString = (parts[0] || '').split(':')[1]?.split(';')[0] || 'image/jpeg';
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], {type: mimeString});
      const capturedFile = new File([blob], 'captured_photo.jpg', {type: 'image/jpeg'});

      originalFile.value = capturedFile;
      setOriginalPreview(capturedFile);

      if (isolateObject.value) {
        await applyBackgroundRemoval(capturedFile);
      } else {
        setPreview(capturedFile);
        file.value = capturedFile;
      }

      closeCamera();
    }
  }
};

const toggleCategory = (catId: string) => {
  const idx = itemForm.value.categoryIds.indexOf(catId);
  if (idx > -1) itemForm.value.categoryIds.splice(idx, 1);
  else itemForm.value.categoryIds.push(catId);
};

const saveItem = async (stay = false) => {
  if (!authStore.editMode) return;
  saving.value = true;
  try {
    const formData = new FormData();
    formData.append('isIsolated', isolateObject.value.toString());
    Object.entries(itemForm.value).forEach(([key, val]) => {
      if (key === 'categoryIds') formData.append(key, JSON.stringify(val));
      else formData.append(key, val as any);
    });

    if (file.value) formData.append('image', file.value);
    else if (!preview.value && editingItem.value?.image) formData.append('removeImage', 'true');

    if (editingItem.value) {
      await axios.put(`/api/items/${editingItem.value.id}`, formData);
    } else {
      await axios.post('/api/items', formData);
    }

    if (stay) {
      itemForm.value = {
        name: '',
        quantity: 1,
        usageFrequency: 'undefined',
        attachment: 'undefined',
        intention: 'undecided',
        joy: 'undefined',
        categoryIds: [],
        isBorrowed: false,
        borrowedFrom: '',
        isGifted: false,
        giftedBy: ''
      };
      file.value = null;
      setPreview(null);
      originalFile.value = null;
      setOriginalPreview(null);
      isolateObject.value = false;
      nextTick(() => {
        itemNameInput.value?.focus();
      });
    } else {
      showItemModal.value = false;
      if (showDetailModal.value) {
        modalView.value = 'detail';
        // Refresh selectedItem after save
        if (editingItem.value) {
          const res = await axios.get(`/api/items/${editingItem.value.id}`);
          selectedItem.value = res.data;
        }
      }
    }
    await fetchData(true);
  } catch (err) {
    alert('Failed to save item');
  } finally {
    saving.value = false;
  }
};

const viewItemDetails = async (itemId: any) => {
  try {
    const res = await axios.get(`/api/items/${itemId}`);
    selectedItem.value = res.data;
    if (authStore.editMode) {
      openItemModal(res.data);
    } else {
      modalView.value = 'detail';
      showDetailModal.value = true;
    }
  } catch (err) {
    console.error(err);
  }
};

const confirmDeleteItem = async (id: string) => {
  if (!authStore.editMode) return;
  if (confirm('Are you sure you want to delete this item?')) {
    try {
      await axios.delete(`/api/items/${id}`);
      await fetchData(true);
    } catch (err) {
      alert('Failed to delete item');
    }
  }
};

// Category Actions
const openCategoryModal = (cat: any = null) => {
  if (!authStore.editMode) return;
  editingCategory.value = cat;
  if (cat) {
    categoryForm.value = {
      name: cat.name,
      description: cat.description || '',
      color: cat.color || '#9d50bb',
      intentionalCount: cat.intentionalCount,
      parentId: cat.parentId || null,
      private: cat.private || false
    };
  } else {
    categoryForm.value = {
      name: '',
      description: '',
      color: '#9d50bb',
      intentionalCount: null,
      parentId: null,
      private: false
    };
  }
  showCategoryModal.value = true;
};

const saveCategory = async () => {
  if (!authStore.editMode) return;
  saving.value = true;
  try {
    if (editingCategory.value) {
      await axios.put(`/api/categories/${editingCategory.value.id}`, categoryForm.value);
    } else {
      await axios.post('/api/categories', categoryForm.value);
    }
    await fetchData(true);
    showCategoryModal.value = false;
  } catch (err) {
    alert('Failed to save category');
  } finally {
    saving.value = false;
  }
};

const deleteCategory = async (id: string) => {
  if (!authStore.editMode) return;
  if (confirm('Are you sure? This will remove the category from all items.')) {
    try {
      await axios.delete(`/api/categories/${id}`);
      await fetchData(true);
    } catch (err) {
      alert('Failed to delete category');
    }
  }
};

const onParentCategoryChange = () => {
  if (categoryForm.value.parentId) {
    categoryForm.value.private = true;
  }
};

// Transaction Actions
const openTransactionModal = async (item: any) => {
  if (!authStore.editMode) return;
  selectedItem.value = item;
  transactionForm.value = {delta: 0, note: '', reason: undefined};

  // Fetch latest transactions
  try {
    const res = await axios.get(`/api/items/${item.id}`);
    selectedItem.value = res.data;
  } catch (err) {
  }

  if (showDetailModal.value) {
    modalView.value = 'transactions';
  } else {
    showTransactionModal.value = true;
  }
};

const saveTransaction = async () => {
  if (!authStore.editMode) return;
  if (transactionForm.value.delta === 0) return;
  saving.value = true;
  try {
    await axios.post(`/api/items/${selectedItem.value.id}/transactions`, transactionForm.value);
    showTransactionModal.value = false;
    if (showDetailModal.value) {
      modalView.value = 'detail';
      const res = await axios.get(`/api/items/${selectedItem.value.id}`);
      selectedItem.value = res.data;
    }
    await fetchData(true);
  } catch (err) {
    alert('Failed to update quantity');
  } finally {
    saving.value = false;
  }
};

// Loan Actions
const openLoanModal = (item: any) => {
  if (!authStore.editMode) return;
  selectedItem.value = item;
  loanForm.value = {borrower: '', quantity: 1, note: ''};
  if (showDetailModal.value) {
    modalView.value = 'lend';
  } else {
    showLoanModal.value = true;
  }
};

const saveLoan = async () => {
  if (!authStore.editMode) return;
  saving.value = true;
  try {
    await axios.post(`/api/items/${selectedItem.value.id}/loans`, loanForm.value);
    showLoanModal.value = false;
    if (showDetailModal.value) {
      modalView.value = 'detail';
      const res = await axios.get(`/api/items/${selectedItem.value.id}`);
      selectedItem.value = res.data;
    }
    await fetchData(true);
  } catch (err) {
    alert('Failed to create loan');
  } finally {
    saving.value = false;
  }
};

const returnLoan = async (id: string) => {
  if (!authStore.editMode) return;
  try {
    await axios.post(`/api/loans/${id}/return`, {});
    await fetchData(true);
  } catch (err) {
    alert('Failed to return loan');
  }
};

const deleteLoan = async (id: string) => {
  if (!authStore.editMode) return;
  if (confirm('Delete this loan record?')) {
    try {
      await axios.delete(`/api/loans/${id}`);
      await fetchData(true);
    } catch (err) {
      alert('Failed to delete loan');
    }
  }
};


// Helpers
const getCategoryDisplayName = (cat: any) => {
  const level = cat.level || 0;
  return '\u00A0\u00A0'.repeat(level) + cat.name;
};

const getItemName = (id: string) => items.value.find(i => i.id === id)?.name || 'Unknown Item';


onMounted(() => {
  fetchData();
});

onUnmounted(() => {
  stopCamera();
});
</script>
<template>
  <div class="container" :style="{ '--grid-columns': gridColumns }">
    <!-- Tabs -->
    <div class="tabs">
      <button :class="{ active: currentTab === 'items' }" @click="currentTab = 'items'">
        <Package :size="18" style="vertical-align: middle; margin-right: 4px;"/>
        Items
      </button>
      <button :class="{ active: currentTab === 'categories' }" @click="currentTab = 'categories'">
        <Tag :size="18" style="vertical-align: middle; margin-right: 4px;"/>
        Categories
      </button>
      <button :class="{ active: currentTab === 'loans' }" @click="currentTab = 'loans'">
        <Users :size="18" style="vertical-align: middle; margin-right: 4px;"/>
        Loans
      </button>
    </div>

    <div v-if="authStore.editMode && (currentTab === 'items' || currentTab === 'categories')" class="actions-row">
      <button v-if="currentTab === 'items'" class="btn-primary" @click="openItemModal()">
        <Plus :size="20" style="vertical-align: middle;"/>
        Add Item
      </button>
      <button v-if="currentTab === 'categories'" class="btn-primary" @click="openCategoryModal()">
        <Plus :size="20" style="vertical-align: middle;"/>
        Add Category
      </button>
    </div>

    <!-- Items Tab -->
    <div v-if="currentTab === 'items'">
      <ItemsTab v-on:item-selected="(id) => viewItemDetails(id)"/>
    </div>

    <!-- Categories Tab -->
    <div v-if="currentTab === 'categories'">
      <div class="card filter-bar">
        <div class="search-wrapper" style="flex: 1;">
          <input v-model="categorySearch" type="text" placeholder="Search categories..."/>
          <button v-if="categorySearch" class="clear-button" @click="categorySearch = ''" title="Clear search">
            <X :size="16"/>
          </button>
        </div>
      </div>

      <div v-if="categories.length === 0" class="silver-text">No categories created yet.</div>
      <div v-else-if="filteredCategories.length === 0" class="silver-text">No categories found.</div>

      <div class="grid" v-else>
        <div v-for="cat in filteredCategories" :key="cat.id" class="item-card"
             @click="authStore.editMode && openCategoryModal(cat)"
             :style="{ borderColor: cat.color || 'var(--border-color)', cursor: authStore.editMode ? 'pointer' : 'default' }">
          <h3 :style="{ color: cat.color || 'var(--accent-purple)', margin: '0 0 8px 0' }">
            <Lock v-if="cat.isPrivate" :size="14" :color="cat.private ? '#ef4444' : '#f59e0b'"
                  style="margin-right: 6px; vertical-align: middle;" title="Private"/>
            {{ cat.name }}
          </h3>
          <p class="silver-text" style="font-size: 0.9rem; margin-bottom: 8px;">{{
              cat.description || 'No description'
            }}</p>
          <div class="item-stats-row" style="margin-top: auto;">
            <div class="item-stat" :title="'Items: ' + cat.count">
              <Package :size="14"/>
              <span>{{ cat.count }}</span>
            </div>
            <div v-if="cat.intentionalCount" class="item-stat" :title="'Target: ' + cat.intentionalCount">
              <Target :size="14"/>
              <span>{{ cat.intentionalCount }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loans Tab -->
    <div v-if="currentTab === 'loans'">
      <div v-if="loans.length === 0" class="silver-text">No active loans.</div>

      <div v-for="loan in loans" :key="loan.id" class="card"
           style="border-left: 4px solid var(--accent-purple); padding: 12px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between;">
          <div>
            <h3 class="accent-text" style="margin: 0 0 4px 0;">{{ getItemName(loan.itemId) }}</h3>
            <p class="silver-text" style="margin: 0 0 2px 0;">Borrowed by: <strong>{{ loan.borrower }}</strong></p>
            <p class="silver-text" style="margin: 0 0 2px 0;">Quantity: {{ loan.quantity }}</p>
            <p class="silver-text" style="font-size: 0.8rem; margin: 0 0 2px 0;">Lent at:
              {{ new Date(loan.lentAt).toLocaleDateString() }}</p>
            <p v-if="loan.note" class="silver-text" style="font-size: 0.8rem; font-style: italic; margin: 4px 0 0 0;">
              Note: {{ loan.note }}</p>
          </div>
          <div class="actions" style="flex-direction: column; gap: 8px;">
            <button v-if="authStore.editMode && !loan.returnedAt" class="btn-primary btn-small"
                    @click="returnLoan(loan.id)">Return
            </button>
            <span v-else class="silver-text"><CheckCircle :size="16"/> Returned</span>
            <button v-if="authStore.editMode" class="btn-danger btn-small" @click="deleteLoan(loan.id)">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Item Modal -->
    <div v-if="authStore.editMode && showItemModal" class="modal-overlay" @click.self="showItemModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="accent-text">{{ editingItem ? 'Edit Item' : 'Add New Item' }}</h2>
          <X class="modal-close" :size="20" @click="showItemModal = false"/>
        </div>

        <div v-if="editingItem" class="actions"
             style="margin-top: 10px; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 20px;">
          <button type="button" class="btn-secondary" title="Transactions" @click="openTransactionModal(editingItem)">
            <ArrowRightLeft :size="18" style="vertical-align: middle; margin-right: 8px;"/>
            Transactions
          </button>
          <button type="button" class="btn-secondary" title="Lend" @click="openLoanModal(editingItem)">
            <Users :size="18" style="vertical-align: middle; margin-right: 8px;"/>
            Lend
          </button>
          <button type="button" class="btn-danger" title="Delete"
                  @click="confirmDeleteItem(editingItem.id); showItemModal = false" style="margin-left: auto;">
            <Trash2 :size="18"/>
          </button>
        </div>
        <form @submit.prevent="saveItem()">
          <template v-if="editingItem">
            <!-- Categories first when editing -->
            <div class="form-group">
              <label>Categories</label>
              <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;">
                <div v-for="cat in categories" :key="cat.id"
                     class="item-badge"
                     :style="{ cursor: 'pointer', backgroundColor: itemForm.categoryIds.includes(cat.id) ? (cat.color || 'var(--accent-purple)') : 'var(--input-bg)', color: itemForm.categoryIds.includes(cat.id) ? 'white' : 'var(--accent-silver)' }"
                     @click="toggleCategory(cat.id)">
                  {{ cat.name }}
                </div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div class="form-group">
                <label>Usage Frequency</label>
                <select v-model="itemForm.usageFrequency">
                  <option v-for="opt in usageFrequencies" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Attachment</label>
                <select v-model="itemForm.attachment">
                  <option v-for="opt in attachments" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div class="form-group">
                <label>Intention</label>
                <select v-model="itemForm.intention">
                  <option v-for="opt in intentions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Joy</label>
                <select v-model="itemForm.joy">
                  <option v-for="opt in joys" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>

            <div class="form-group"
                 style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 15px;">
              <label>Name</label>
              <input v-model="itemForm.name" ref="itemNameInput" type="text" required/>
            </div>

            <div class="form-group">
              <label>Quantity</label>
              <input v-model="itemForm.quantity" type="number" step="any" :disabled="true"/>
            </div>

            <div class="form-group">
              <label>Image</label>
              <div style="text-align: center;">
                <input type="file" ref="fileInputRef" accept="image/*" capture="environment" @change="handleFileChange"
                       style="display: none;"/>
                <button type="button" class="btn-secondary" style="width: 100%; margin-bottom: 10px;"
                        @click="triggerFileInput">
                  <Camera :size="20" style="vertical-align: middle; margin-right: 8px;"/>
                  {{ preview ? 'Change Photo' : 'Take Picture' }}
                </button>
                <img v-if="preview" :src="preview" style="max-width: 100%; border-radius: 8px; margin-top: 10px;"/>

                <div v-if="preview"
                     style="margin-top: 12px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <label class="switch-container">
                      <input type="checkbox" v-model="isolateObject" @change="handleIsolateChange"
                             :disabled="processingBackground"/>
                      <div class="switch-track">
                        <div class="switch-thumb"></div>
                      </div>
                      <span class="silver-text" style="font-size: 14px;">Isolate Object</span>
                    </label>
                    <Loader2 v-if="processingBackground" class="animate-spin accent-purple" :size="18"/>
                  </div>
                  <button type="button" class="btn-danger btn-small" @click="removeImage">Remove Image</button>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <!-- Basic info first when creating -->
            <div class="form-group">
              <label>Name</label>
              <input v-model="itemForm.name" ref="itemNameInput" type="text" required/>
              <div v-if="closeMatches.length > 0" class="close-matches-list">
                <div v-for="match in closeMatches" :key="match.id" class="close-match-item">
                  <span class="match-name">{{ match.name }}</span>
                  <span v-if="match.categoryIds?.[0]" class="match-category">
                    ({{ getCategoryName(match.categoryIds[0]) }})
                  </span>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Image</label>
              <div style="text-align: center;">
                <input type="file" ref="fileInputRef" accept="image/*" capture="environment" @change="handleFileChange"
                       style="display: none;"/>
                <button type="button" class="btn-secondary" style="width: 100%; margin-bottom: 10px;"
                        @click="triggerFileInput">
                  <Camera :size="20" style="vertical-align: middle; margin-right: 8px;"/>
                  {{ preview ? 'Change Photo' : 'Take Picture' }}
                </button>
                <img v-if="preview" :src="preview" style="max-width: 100%; border-radius: 8px; margin-top: 10px;"/>

                <div v-if="preview"
                     style="margin-top: 12px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <label class="switch-container">
                      <input type="checkbox" v-model="isolateObject" @change="handleIsolateChange"
                             :disabled="processingBackground"/>
                      <div class="switch-track">
                        <div class="switch-thumb"></div>
                      </div>
                      <span class="silver-text" style="font-size: 14px;">Isolate Object</span>
                    </label>
                    <Loader2 v-if="processingBackground" class="animate-spin accent-purple" :size="18"/>
                  </div>
                  <button type="button" class="btn-danger btn-small" @click="removeImage">Remove Image</button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Quantity</label>
              <input v-model="itemForm.quantity" type="number" step="any"/>
            </div>

            <div class="form-group"
                 style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 15px;">
              <label>Categories</label>
              <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;">
                <div v-for="cat in categories" :key="cat.id"
                     class="item-badge"
                     :style="{ cursor: 'pointer', backgroundColor: itemForm.categoryIds.includes(cat.id) ? (cat.color || 'var(--accent-purple)') : 'var(--input-bg)', color: itemForm.categoryIds.includes(cat.id) ? 'white' : 'var(--accent-silver)' }"
                     @click="toggleCategory(cat.id)">
                  {{ cat.name }}
                </div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div class="form-group">
                <label>Usage Frequency</label>
                <select v-model="itemForm.usageFrequency">
                  <option v-for="opt in usageFrequencies" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Attachment</label>
                <select v-model="itemForm.attachment">
                  <option v-for="opt in attachments" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div class="form-group">
                <label>Intention</label>
                <select v-model="itemForm.intention">
                  <option v-for="opt in intentions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Joy</label>
                <select v-model="itemForm.joy">
                  <option v-for="opt in joys" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>
          </template>

          <div class="form-group"
               style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 15px; display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
            <label class="switch-container" style="margin-bottom: 0;">
              <input type="checkbox" v-model="itemForm.isBorrowed"/>
              <div class="switch-track">
                <div class="switch-thumb"></div>
              </div>
              <span class="silver-text" style="font-size: 14px;">Borrowed</span>
            </label>
            <div v-if="itemForm.isBorrowed"
                 style="flex: 1; min-width: 150px; display: flex; align-items: center; gap: 10px;">
              <span class="silver-text" style="font-size: 14px;">From:</span>
              <input v-model="itemForm.borrowedFrom" type="text" placeholder="Whom?" style="margin: 0;"/>
            </div>
          </div>

          <div class="form-group"
               style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 15px; display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
            <label class="switch-container" style="margin-bottom: 0;">
              <input type="checkbox" v-model="itemForm.isGifted"/>
              <div class="switch-track">
                <div class="switch-thumb"></div>
              </div>
              <span class="silver-text" style="font-size: 14px;">Gifted</span>
            </label>
            <div v-if="itemForm.isGifted"
                 style="flex: 1; min-width: 150px; display: flex; align-items: center; gap: 10px;">
              <span class="silver-text" style="font-size: 14px;">By:</span>
              <input v-model="itemForm.giftedBy" type="text" placeholder="Whom?" style="margin: 0;"/>
            </div>
          </div>

          <div class="actions">
            <button type="submit" class="btn-primary" :disabled="saving" style="flex: 1; width: auto;">
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
            <button v-if="!editingItem" type="button" class="btn-secondary" :disabled="saving" @click="saveItem(true)"
                    style="flex: 1;">
              {{ saving ? 'Saving...' : 'Save and Next' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Category Modal -->
    <div v-if="authStore.editMode && showCategoryModal" class="modal-overlay" @click.self="showCategoryModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="accent-text">{{ editingCategory ? 'Edit Category' : 'Add Category' }}</h2>
          <X class="modal-close" :size="20" @click="showCategoryModal = false"/>
        </div>
        <form @submit.prevent="saveCategory">
          <div class="form-group">
            <label>Name</label>
            <input v-model="categoryForm.name" type="text" required/>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea v-model="categoryForm.description"></textarea>
          </div>
          <div class="form-group">
            <label>Color</label>
            <input v-model="categoryForm.color" type="color" style="height: 40px; padding: 2px;"/>
          </div>
          <div class="form-group">
            <label>Private</label>
            <select v-model="categoryForm.private">
              <option :value="false">No</option>
              <option :value="true">Yes</option>
            </select>
          </div>
          <div class="form-group">
            <label>Target Count (Optional)</label>
            <input v-model="categoryForm.intentionalCount" type="number"/>
          </div>
          <div class="form-group">
            <label>Parent Category</label>
            <select v-model="categoryForm.parentId" @change="onParentCategoryChange">
              <option :value="null">None</option>
              <option v-for="cat in sortedCategories.filter(c => c.id !== editingCategory?.id)" :key="cat.id"
                      :value="cat.id">
                {{ getCategoryDisplayName(cat) }}
              </option>
            </select>
          </div>
          <div class="actions">
            <button type="submit" class="btn-primary" :disabled="saving">Save</button>
            <button v-if="editingCategory" type="button" class="btn-danger" title="Delete"
                    @click="deleteCategory(editingCategory.id); showCategoryModal = false" style="margin-left: auto;">
              <Trash2 :size="18"/>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Transaction Modal -->
    <div v-if="authStore.editMode && showTransactionModal" class="modal-overlay"
         @click.self="showTransactionModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="accent-text">Adjust Quantity: {{ selectedItem?.name }}</h2>
          <X class="modal-close" :size="20" @click="showTransactionModal = false"/>
        </div>
        <p class="silver-text">Current Quantity: {{ selectedItem?.quantity }}</p>
        <form @submit.prevent="saveTransaction">
          <div class="form-group">
            <label>Change (Positive or Negative)</label>
            <input v-model="transactionForm.delta" type="number" step="any" required/>
          </div>
          <div class="form-group">
            <label>Note (Optional)</label>
            <input v-model="transactionForm.note" type="text"/>
          </div>
          <div v-if="transactionForm.delta < 0" class="form-group">
            <label>Reason</label>
            <select v-model="transactionForm.reason">
              <option :value="undefined">None</option>
              <option value="lost">Lost</option>
              <option value="stolen">Stolen</option>
              <option value="broken">Broken</option>
              <option value="used up">Used up</option>
              <option value="replaced">Replaced</option>
              <option value="donated">Donated</option>
              <option value="sold">Sold</option>
              <option value="disposed">Disposed</option>
            </select>
          </div>
          <div class="actions">
            <button type="submit" class="btn-primary" :disabled="saving">Update</button>
          </div>
        </form>

        <div v-if="selectedItem?.transactions" style="margin-top: 20px;">
          <h4 class="silver-text">Recent Transactions</h4>
          <div v-for="t in selectedItem.transactions" :key="t.id"
               style="font-size: 0.8rem; padding: 5px; border-bottom: 1px solid #444;">
            <span :class="t.delta > 0 ? 'accent-text' : 'error-text'">{{ t.delta > 0 ? '+' : '' }}{{ t.delta }}</span>
            <span v-if="t.reason" class="silver-text" style="margin-left: 10px; font-style: italic;">({{
                t.reason
              }})</span>
            <span style="margin-left: 10px;">{{ t.note || 'No note' }}</span>
            <span class="silver-text" style="float: right;">{{ new Date(t.createdAt).toLocaleDateString() }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loan Modal -->
    <div v-if="authStore.editMode && showLoanModal" class="modal-overlay" @click.self="showLoanModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="accent-text">Lend Item: {{ selectedItem?.name }}</h2>
          <X class="modal-close" :size="20" @click="showLoanModal = false"/>
        </div>
        <form @submit.prevent="saveLoan">
          <div class="form-group">
            <label>Borrower Name</label>
            <input v-model="loanForm.borrower" type="text" required/>
          </div>
          <div class="form-group">
            <label>Quantity</label>
            <input v-model="loanForm.quantity" type="number" step="any" required/>
          </div>
          <div class="form-group">
            <label>Note</label>
            <input v-model="loanForm.note" type="text"/>
          </div>
          <div class="actions">
            <button type="submit" class="btn-primary" :disabled="saving">Lend</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showDetailModal" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <button v-if="modalView !== 'detail'" class="btn-secondary btn-small" style="padding: 4px 8px;"
                    @click="modalView = 'detail'">
              <ArrowLeft :size="16"/>
            </button>
            <h2 class="accent-text" style="display: flex; align-items: center; gap: 8px;">
              <Lock v-if="modalView === 'detail' && selectedItem?.private" :size="20" style="color: #f59e0b;"/>
              {{ detailModalTitle }}
            </h2>
          </div>
          <X class="modal-close" :size="20" @click="showDetailModal = false"/>
        </div>

        <div v-if="modalView === 'detail'">
          <img v-if="selectedItem?.image" :src="selectedItem.image"
               style="width: 200px; height: 200px; object-fit: cover; border-radius: 12px; margin: 0 auto 20px auto; display: block;"/>
          <div v-else
               style="width: 200px; height: 200px; display: flex; align-items: center; justify-content: center; background-color: var(--input-bg); border-radius: 12px; margin: 0 auto 20px auto;">
            <Package :size="64" :stroke-width="1.5" class="silver-text" style="opacity: 0.8;"/>
          </div>

          <div v-if="authStore.editMode" class="actions"
               style="margin-top: 10px; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 20px;">
            <button class="btn-secondary" title="Edit" @click="openItemModal(selectedItem)">
              <Edit2 :size="18" style="vertical-align: middle; margin-right: 8px;"/>
              Edit
            </button>
            <button class="btn-secondary" title="Transactions" @click="openTransactionModal(selectedItem)">
              <ArrowRightLeft :size="18" style="vertical-align: middle; margin-right: 8px;"/>
              Transactions
            </button>
            <button class="btn-secondary" title="Lend" @click="openLoanModal(selectedItem)">
              <Users :size="18" style="vertical-align: middle; margin-right: 8px;"/>
              Lend
            </button>
            <button class="btn-danger" title="Delete"
                    @click="confirmDeleteItem(selectedItem.id); showDetailModal = false" style="margin-left: auto;">
              <Trash2 :size="18"/>
            </button>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Quantity</div>
              <div class="stat-value" style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                <Package :size="16" class="silver-text"/>
                {{ selectedItem?.quantity }}
              </div>
            </div>
            <div v-if="isDefined(selectedItem?.usageFrequency)" class="stat-card">
              <div class="stat-label">Usage</div>
              <div class="stat-value"
                   :style="{ color: getStatColor(selectedItem?.usageFrequency || 'undefined'), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }">
                <Zap :size="16"/>
                {{ formatStat(selectedItem?.usageFrequency) }}
              </div>
            </div>
            <div v-if="isDefined(selectedItem?.joy)" class="stat-card">
              <div class="stat-label">Joy</div>
              <div class="stat-value"
                   :style="{ color: getStatColor(selectedItem?.joy || 'medium'), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }">
                <Smile :size="16"/>
                {{ formatStat(selectedItem?.joy) }}
              </div>
            </div>
            <div v-if="isDefined(selectedItem?.intention)" class="stat-card">
              <div class="stat-label">Intention</div>
              <div class="stat-value"
                   :style="{ color: getStatColor(selectedItem?.intention || 'undecided'), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }">
                <Target :size="16"/>
                {{ formatStat(selectedItem?.intention) }}
              </div>
            </div>
            <div v-if="isDefined(selectedItem?.attachment)" class="stat-card">
              <div class="stat-label">Attachment</div>
              <div class="stat-value"
                   :style="{ color: getStatColor(selectedItem?.attachment || 'undefined'), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }">
                <Heart :size="16"/>
                {{ formatStat(selectedItem?.attachment) }}
              </div>
            </div>
            <div v-if="selectedItem?.isBorrowed" class="stat-card" style="border-color: #f59e0b;">
              <div class="stat-label">Borrowed From</div>
              <div class="stat-value"
                   style="display: flex; align-items: center; justify-content: center; gap: 6px; color: #f59e0b;">
                <Users :size="16"/>
                {{ selectedItem?.borrowedFrom || 'Someone' }}
              </div>
            </div>
            <div v-if="selectedItem?.isGifted" class="stat-card" style="border-color: #f59e0b;">
              <div class="stat-label">Gifted By</div>
              <div class="stat-value"
                   style="display: flex; align-items: center; justify-content: center; gap: 6px; color: #f59e0b;">
                <Gift :size="16"/>
                {{ selectedItem?.giftedBy || 'Someone' }}
              </div>
            </div>
          </div>

          <div v-if="selectedItem?.categoryIds && selectedItem.categoryIds.length > 0" style="margin-top: 20px;">
            <span v-for="catId in selectedItem.categoryIds" :key="catId" class="category-tag"
                  :style="{ backgroundColor: getCategoryColor(catId), color: 'white', cursor: 'pointer' }"
            >
              {{ getCategoryName(catId) }}
            </span>
          </div>
        </div>

        <!-- Edit View -->
        <div v-else-if="modalView === 'edit'">

          <div v-if="editingItem" class="actions"
               style="margin-top: 10px; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 20px;">
            <button type="button" class="btn-secondary" title="Transactions" @click="openTransactionModal(editingItem)">
              <ArrowRightLeft :size="18" style="vertical-align: middle; margin-right: 8px;"/>
              Transactions
            </button>
            <button type="button" class="btn-secondary" title="Lend" @click="openLoanModal(editingItem)">
              <Users :size="18" style="vertical-align: middle; margin-right: 8px;"/>
              Lend
            </button>
            <button type="button" class="btn-danger" title="Delete"
                    @click="confirmDeleteItem(editingItem.id); showDetailModal = false" style="margin-left: auto;">
              <Trash2 :size="18"/>
            </button>
          </div>

          <form @submit.prevent="saveItem()">
            <template v-if="editingItem">
              <!-- Categories first when editing -->
              <div class="form-group">
                <label>Categories</label>
                <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;">
                  <div v-for="cat in categories" :key="cat.id"
                       class="item-badge"
                       :style="{ cursor: 'pointer', backgroundColor: itemForm.categoryIds.includes(cat.id) ? (cat.color || 'var(--accent-purple)') : 'var(--input-bg)', color: itemForm.categoryIds.includes(cat.id) ? 'white' : 'var(--accent-silver)' }"
                       @click="toggleCategory(cat.id)">
                    {{ cat.name }}
                  </div>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group">
                  <label>Usage Frequency</label>
                  <select v-model="itemForm.usageFrequency">
                    <option v-for="opt in usageFrequencies" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Attachment</label>
                  <select v-model="itemForm.attachment">
                    <option v-for="opt in attachments" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group">
                  <label>Intention</label>
                  <select v-model="itemForm.intention">
                    <option v-for="opt in intentions" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Joy</label>
                  <select v-model="itemForm.joy">
                    <option v-for="opt in joys" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                </div>
              </div>

              <div class="form-group"
                   style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                <label>Name</label>
                <input v-model="itemForm.name" ref="itemNameInput" type="text" required/>
              </div>

              <div class="form-group">
                <label>Image</label>
                <div style="text-align: center;">
                  <input type="file" ref="fileInputRef" accept="image/*" capture="environment"
                         @change="handleFileChange" style="display: none;"/>
                  <button type="button" class="btn-secondary" style="width: 100%; margin-bottom: 10px;"
                          @click="triggerFileInput">
                    <Camera :size="20" style="vertical-align: middle; margin-right: 8px;"/>
                    {{ preview ? 'Change Photo' : 'Take Picture' }}
                  </button>
                  <img v-if="preview" :src="preview" style="max-width: 100%; border-radius: 8px; margin-top: 10px;"/>

                  <div v-if="preview"
                       style="margin-top: 12px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <label class="switch-container">
                        <input type="checkbox" v-model="isolateObject" @change="handleIsolateChange"
                               :disabled="processingBackground"/>
                        <div class="switch-track">
                          <div class="switch-thumb"></div>
                        </div>
                        <span class="silver-text" style="font-size: 14px;">Isolate Object</span>
                      </label>
                      <Loader2 v-if="processingBackground" class="animate-spin accent-purple" :size="18"/>
                    </div>
                    <button type="button" class="btn-danger btn-small" @click="removeImage">Remove Image</button>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <!-- Standard order for creation (though less common in detail modal) -->
              <div class="form-group">
                <label>Name</label>
                <input v-model="itemForm.name" ref="itemNameInput" type="text" required/>
              </div>

              <div class="form-group">
                <label>Image</label>
                <div style="text-align: center;">
                  <input type="file" ref="fileInputRef" accept="image/*" capture="environment"
                         @change="handleFileChange" style="display: none;"/>
                  <button type="button" class="btn-secondary" style="width: 100%; margin-bottom: 10px;"
                          @click="triggerFileInput">
                    <Camera :size="20" style="vertical-align: middle; margin-right: 8px;"/>
                    {{ preview ? 'Change Photo' : 'Take Picture' }}
                  </button>
                  <img v-if="preview" :src="preview" style="max-width: 100%; border-radius: 8px; margin-top: 10px;"/>

                  <div v-if="preview"
                       style="margin-top: 12px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <label class="switch-container">
                        <input type="checkbox" v-model="isolateObject" @change="handleIsolateChange"
                               :disabled="processingBackground"/>
                        <div class="switch-track">
                          <div class="switch-thumb"></div>
                        </div>
                        <span class="silver-text" style="font-size: 14px;">Isolate Object</span>
                      </label>
                      <Loader2 v-if="processingBackground" class="animate-spin accent-purple" :size="18"/>
                    </div>
                    <button type="button" class="btn-danger btn-small" @click="removeImage">Remove Image</button>
                  </div>
                </div>
              </div>

              <div class="form-group"
                   style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                <label>Categories</label>
                <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;">
                  <div v-for="cat in categories" :key="cat.id"
                       class="item-badge"
                       :style="{ cursor: 'pointer', backgroundColor: itemForm.categoryIds.includes(cat.id) ? (cat.color || 'var(--accent-purple)') : 'var(--input-bg)', color: itemForm.categoryIds.includes(cat.id) ? 'white' : 'var(--accent-silver)' }"
                       @click="toggleCategory(cat.id)">
                    {{ cat.name }}
                  </div>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group">
                  <label>Usage Frequency</label>
                  <select v-model="itemForm.usageFrequency">
                    <option v-for="opt in usageFrequencies" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Attachment</label>
                  <select v-model="itemForm.attachment">
                    <option v-for="opt in attachments" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group">
                  <label>Intention</label>
                  <select v-model="itemForm.intention">
                    <option v-for="opt in intentions" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Joy</label>
                  <select v-model="itemForm.joy">
                    <option v-for="opt in joys" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                </div>
              </div>
            </template>

            <div class="form-group"
                 style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 15px; display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
              <label class="switch-container" style="margin-bottom: 0;">
                <input type="checkbox" v-model="itemForm.isBorrowed"/>
                <div class="switch-track">
                  <div class="switch-thumb"></div>
                </div>
                <span class="silver-text" style="font-size: 14px;">Borrowed</span>
              </label>
              <div v-if="itemForm.isBorrowed"
                   style="flex: 1; min-width: 150px; display: flex; align-items: center; gap: 10px;">
                <span class="silver-text" style="font-size: 14px;">From:</span>
                <input v-model="itemForm.borrowedFrom" type="text" placeholder="Whom?" style="margin: 0;"/>
              </div>
            </div>

            <div class="form-group"
                 style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 15px; display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
              <label class="switch-container" style="margin-bottom: 0;">
                <input type="checkbox" v-model="itemForm.isGifted"/>
                <div class="switch-track">
                  <div class="switch-thumb"></div>
                </div>
                <span class="silver-text" style="font-size: 14px;">Gifted</span>
              </label>
              <div v-if="itemForm.isGifted"
                   style="flex: 1; min-width: 150px; display: flex; align-items: center; gap: 10px;">
                <span class="silver-text" style="font-size: 14px;">By:</span>
                <input v-model="itemForm.giftedBy" type="text" placeholder="Whom?" style="margin: 0;"/>
              </div>
            </div>

            <div class="actions">
              <button type="submit" class="btn-primary" :disabled="saving">
                <Loader2 v-if="saving" class="animate-spin" :size="18"
                         style="vertical-align: middle; margin-right: 8px;"/>
                {{ editingItem ? 'Update' : 'Save' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Transactions View -->
        <div v-else-if="modalView === 'transactions'">
          <p class="silver-text">Current Quantity: {{ selectedItem?.quantity }}</p>
          <form @submit.prevent="saveTransaction">
            <div class="form-group">
              <label>Change (Positive or Negative)</label>
              <input v-model="transactionForm.delta" type="number" step="any" required/>
            </div>
            <div class="form-group">
              <label>Note (Optional)</label>
              <input v-model="transactionForm.note" type="text"/>
            </div>
            <div v-if="transactionForm.delta < 0" class="form-group">
              <label>Reason</label>
              <select v-model="transactionForm.reason">
                <option :value="undefined">None</option>
                <option value="lost">Lost</option>
                <option value="stolen">Stolen</option>
                <option value="broken">Broken</option>
                <option value="used up">Used up</option>
                <option value="replaced">Replaced</option>
                <option value="donated">Donated</option>
                <option value="sold">Sold</option>
                <option value="disposed">Disposed</option>
              </select>
            </div>
            <div class="actions">
              <button type="submit" class="btn-primary" :disabled="saving">Update</button>
            </div>
          </form>

          <div v-if="selectedItem?.transactions" style="margin-top: 20px;">
            <h4 class="silver-text">Recent Transactions</h4>
            <div v-for="t in selectedItem.transactions" :key="t.id"
                 style="font-size: 0.8rem; padding: 5px; border-bottom: 1px solid #444;">
              <span :class="t.delta > 0 ? 'accent-text' : 'error-text'">{{ t.delta > 0 ? '+' : '' }}{{ t.delta }}</span>
              <span v-if="t.reason" class="silver-text" style="margin-left: 10px; font-style: italic;">({{
                  t.reason
                }})</span>
              <span style="margin-left: 10px;">{{ t.note || 'No note' }}</span>
              <span class="silver-text" style="float: right;">{{ new Date(t.createdAt).toLocaleDateString() }}</span>
            </div>
          </div>
        </div>

        <!-- Lend View -->
        <div v-else-if="modalView === 'lend'">
          <form @submit.prevent="saveLoan">
            <div class="form-group">
              <label>Borrower Name</label>
              <input v-model="loanForm.borrower" type="text" required/>
            </div>
            <div class="form-group">
              <label>Quantity</label>
              <input v-model="loanForm.quantity" type="number" step="any" required/>
            </div>
            <div class="form-group">
              <label>Note</label>
              <input v-model="loanForm.note" type="text"/>
            </div>
            <div class="actions">
              <button type="submit" class="btn-primary" :disabled="saving">Lend</button>
            </div>
          </form>
        </div>

      </div>
    </div>

    <!-- Camera Modal -->
    <div v-if="showCameraModal" class="modal-overlay" @click.self="closeCamera">
      <div class="modal-content" style="max-width: 600px; padding: 20px; text-align: center;">
        <div class="modal-header">
          <h2 class="accent-text" style="margin-top: 0;">Capture Photo</h2>
          <X class="modal-close" :size="20" @click="closeCamera"/>
        </div>
        <div
            style="position: relative; width: 100%; aspect-ratio: 4/3; background: #000; border-radius: 12px; overflow: hidden; margin-bottom: 20px;">
          <video ref="videoRef" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
          <canvas ref="canvasRef" style="display: none;"></canvas>
        </div>
        <div class="actions" style="justify-content: center;">
          <button type="button" class="btn-primary" @click="capturePhoto" style="width: auto;">
            <Camera :size="20" style="vertical-align: middle; margin-right: 8px;"/>
            Capture
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
