<script setup lang="ts">
const props = defineProps<{ collapsed?: boolean }>()
const emit = defineEmits<{ navigate: [] }>()

const groups = useNav()
const { user, can } = useAuth()
const route = useRoute()

const visibleGroups = computed(() =>
  groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.minRole || can(i.minRole)) }))
    .filter((g) => g.items.length)
)

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- wordmark -->
    <NuxtLink
      to="/"
      class="flex h-18 shrink-0 items-center border-b border-hull-soft px-4 py-3"
      @click="emit('navigate')"
    >
      <span class="flex w-full items-center justify-center px-3 py-2">
        <DockHubLogo size="sm" class="max-w-full" />
      </span>
    </NuxtLink>

    <!-- nav -->
    <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      <div v-for="group in visibleGroups" :key="group.label">
        <p class="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
          {{ group.label }}
        </p>
        <ul class="space-y-0.5">
          <li v-for="item in group.items" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors"
              :class="isActive(item.to)
                ? 'bg-beacon/12 text-foam ring-1 ring-inset ring-beacon/30'
                : 'text-(--color-muted) hover:bg-(--color-veil) hover:text-foam'"
              @click="emit('navigate')"
            >
              <UIcon
                :name="item.icon"
                class="size-4.5 shrink-0"
                :class="isActive(item.to) ? 'text-beacon' : 'text-faint group-hover:text-(--color-muted)'"
              />
              <span class="font-medium">{{ item.label }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </nav>

    <!-- account -->
    <div class="border-t border-hull-soft p-3">
      <div class="flex items-center gap-3 rounded-lg px-2 py-1.5">
        <span class="flex size-9 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-foam ring-1 ring-hull">
          {{ (user?.displayName || '?').charAt(0).toUpperCase() }}
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-foam">{{ user?.displayName || user?.username || '—' }}</p>
          <p class="truncate text-xs text-faint capitalize">
            {{ user?.role || '' }}<template v-if="user?.role && user?.source"> · {{ user.source }}</template>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
