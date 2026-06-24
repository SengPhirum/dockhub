<script setup lang="ts">
// Standalone preview of the exposed NetApp component, for developing/testing
// this remote on its own (http://localhost:3101) without the host portal.
</script>

<template>
  <div class="min-h-screen bg-slate-950 p-8">
    <p class="mb-4 text-xs text-slate-500">Standalone preview - the KNetraHub portal loads NetApp directly via Module Federation, not this page.</p>
    <NetApp />
  </div>
</template>
