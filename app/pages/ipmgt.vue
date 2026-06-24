<script setup lang="ts">
const { hasApp } = useAuth()
</script>

<template>
  <div>
    <PageHeader title="KNetraHub-IPMgt" subtitle="IT asset and IP address management" icon="i-lucide-id-card" />

    <div v-if="!hasApp('ipmgt')" class="panel flex flex-col items-center gap-2 p-10 text-center">
      <UIcon name="i-lucide-lock" class="size-6 text-faint" />
      <p class="text-sm text-(--color-muted)">You don't have access to KNetraHub-IPMgt.</p>
    </div>

    <ClientOnly v-else>
      <RemoteModuleLoader module-key="ipmgt" />
      <template #fallback>
        <div class="panel flex flex-col items-center gap-3 p-10 text-center">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-beacon" />
          <p class="text-sm text-(--color-muted)">Loading KNetraHub-IPMgt…</p>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
