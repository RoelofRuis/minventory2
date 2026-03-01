<script setup lang="ts">

import {CheckCircle} from "lucide-vue-next";
</script>

<template>
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
        <button v-if="editMode && !loan.returnedAt" class="btn-primary btn-small"
                @click="returnLoan(loan.id)">Return
        </button>
        <span v-else class="silver-text"><CheckCircle :size="16"/> Returned</span>
        <button v-if="editMode" class="btn-danger btn-small" @click="deleteLoan(loan.id)">Delete</button>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>