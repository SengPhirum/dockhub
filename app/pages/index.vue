<script setup lang="ts">
// KNetraHub home = app launcher. Lists the apps the signed-in user can reach
// (resolved from their Keycloak realm roles + the Settings app-role map, or the
// local-admin superuser). Each app's own access is enforced again server-side.
const { user, accessibleApps, can } = useAuth()
</script>

<template>
  <div>
    <PageHeader
      title="Apps"
      :subtitle="user ? `Welcome back, ${user.displayName}` : 'Available systems'"
      icon="i-lucide-layout-grid"
    />

    <div v-if="accessibleApps.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="app in accessibleApps"
        :key="app.key"
        :to="app.routePath"
        class="panel group flex flex-col gap-3 p-5 transition hover:ring-1 hover:ring-beacon/30"
      >
        <div class="flex items-center gap-3">
          <span class="flex size-11 items-center justify-center rounded-xl bg-beacon/12 ring-1 ring-beacon/25">
            <UIcon :name="app.icon" class="size-6 text-beacon" />
          </span>
          <div class="min-w-0">
            <p class="font-display text-base font-semibold text-foam">{{ app.name }}</p>
            <p class="text-[11px] uppercase tracking-wider text-faint">
              {{ app.type === 'local' ? 'Built in' : 'Subsystem' }}
            </p>
          </div>
          <UIcon
            name="i-lucide-arrow-up-right"
            class="ml-auto size-4 text-faint opacity-0 transition group-hover:opacity-100"
          />
        </div>
        <p class="text-sm text-(--color-muted)">{{ app.description }}</p>
      </NuxtLink>
    </div>

    <div v-else class="panel flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span class="flex size-12 items-center justify-center rounded-xl bg-surface-2 ring-1 ring-hull">
        <UIcon name="i-lucide-lock" class="size-6 text-faint" />
      </span>
      <div>
        <p class="font-display text-base font-semibold text-foam">No apps assigned yet</p>
        <p class="mt-1 max-w-md text-sm text-(--color-muted)">
          Your account doesn't have access to any apps. Access is granted by your
          identity provider role - ask an administrator to map your role to an app
          under Settings &rsaquo; Apps &amp; Access.
        </p>
      </div>
      <NuxtLink
        v-if="can('admin')"
        to="/settings"
        class="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-beacon/12 px-3 py-2 text-sm font-medium text-beacon ring-1 ring-beacon/25 transition hover:bg-beacon/20"
      >
        <UIcon name="i-lucide-settings" class="size-4" />
        Configure access
      </NuxtLink>
    </div>
  </div>
</template>
