<script setup lang="ts">
// Auth itself is already enforced by app/middleware/auth.global.ts - this
// page only adds a UX-level permission check (not a security boundary; the
// KNetraHub-Net API enforces net.view itself when the remote calls it).
const { hasApp } = useAuth()
</script>

<template>
  <div>
    <PageHeader title="KNetraHub-Net" subtitle="Network monitoring" icon="i-lucide-network" />

    <div v-if="!hasApp('net')" class="panel flex flex-col items-center gap-2 p-10 text-center">
      <UIcon name="i-lucide-lock" class="size-6 text-faint" />
      <p class="text-sm text-(--color-muted)">You don't have access to KNetraHub-Net.</p>
    </div>

    <ClientOnly v-else>
      <RemoteModuleLoader module-key="net" />
      <template #fallback>
        <div class="panel flex flex-col items-center gap-3 p-10 text-center">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-beacon" />
          <p class="text-sm text-(--color-muted)">Loading KNetraHub-Net…</p>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
