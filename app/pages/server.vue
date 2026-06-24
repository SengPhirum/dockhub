<script setup lang="ts">
const { hasApp } = useAuth()
</script>

<template>
  <div>
    <PageHeader title="KNetraHub-Server" subtitle="Server monitoring" icon="i-lucide-server-cog" />

    <div v-if="!hasApp('server')" class="panel flex flex-col items-center gap-2 p-10 text-center">
      <UIcon name="i-lucide-lock" class="size-6 text-faint" />
      <p class="text-sm text-(--color-muted)">You don't have access to KNetraHub-Server.</p>
    </div>

    <ClientOnly v-else>
      <RemoteModuleLoader module-key="server" />
      <template #fallback>
        <div class="panel flex flex-col items-center gap-3 p-10 text-center">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-beacon" />
          <p class="text-sm text-(--color-muted)">Loading KNetraHub-Server…</p>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
