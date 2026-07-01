<script setup lang="ts">
// Server administrator settings (Monitoring app). Placeholder (Alerts) until
// the Server admin features are built - see AppSettingsScaffold. Gated by the
// monitoring admin tier, mirroring the Dock app's own settings page.
definePageMeta({
  middleware: [
    function () {
      const { hasPermission } = useAuth()
      if (!hasPermission('monitoring.manage')) return navigateTo('/monitoring/server')
    }
  ]
})
</script>

<template>
  <AppSettingsScaffold app-name="Server" app-key="monitoring" back-to="/monitoring/server" />
</template>
