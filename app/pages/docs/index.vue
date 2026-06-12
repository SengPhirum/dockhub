<script setup lang="ts">
const docs = [
  {
    title: 'User Manual',
    subtitle: 'Feature usage, daily workflows, and operational guidance.',
    to: '/docs/manual',
    icon: 'i-lucide-book-open',
    actions: ['Dashboard', 'Stacks', 'Services', 'Nodes', 'Data', 'Administration']
  },
  {
    title: 'Configuration',
    subtitle: 'System options, integrations, authentication, and provider setup.',
    to: '/docs/configuration',
    icon: 'i-lucide-sliders-horizontal',
    actions: ['Docker', 'GitLab', 'OIDC', 'Keycloak', 'Authentik', 'LDAP']
  }
]
</script>

<template>
  <div>
    <PageHeader title="Documentation" subtitle="Choose the guide you need" icon="i-lucide-book-open" />

    <div class="grid gap-4 lg:grid-cols-2">
      <NuxtLink
        v-for="doc in docs"
        :key="doc.to"
        :to="doc.to"
        class="group rounded-lg border border-hull bg-surface p-5 transition hover:border-beacon/50 hover:bg-surface-2"
      >
        <div class="flex items-start justify-between gap-4">
          <span class="flex size-10 items-center justify-center rounded-lg bg-abyss ring-1 ring-hull">
            <UIcon :name="doc.icon" class="size-5 text-beacon" />
          </span>
          <UIcon name="i-lucide-arrow-right" class="mt-2 size-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-beacon" />
        </div>
        <h2 class="mt-4 font-display text-lg font-semibold text-foam">{{ doc.title }}</h2>
        <p class="mt-1 text-sm text-(--color-muted)">{{ doc.subtitle }}</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="item in doc.actions"
            :key="item"
            class="rounded-md bg-abyss px-2 py-1 text-xs text-(--color-muted) ring-1 ring-hull"
          >
            {{ item }}
          </span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
