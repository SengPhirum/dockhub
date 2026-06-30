<script setup lang="ts">
const { hasApp } = useAuth()

const { data: devices, status, refresh } = useAsyncData('netDevicesList', () => $fetch('/api/net/devices'))

const search = ref('')
const categoryFilter = ref('all')

const categories = [
  { value: 'all', label: 'All Devices' },
  { value: 'network', label: 'Network Infrastructure' },
  { value: 'server', label: 'Servers & Cloud' },
  { value: 'storage', label: 'Storage & Appliances' },
  { value: 'iot', label: 'IoT & Sensors' },
  { value: 'ping-only', label: 'Ping-Only Devices' }
]

const filteredDevices = computed(() => {
  let list = devices.value || []
  if (categoryFilter.value !== 'all') {
    list = list.filter(d => d.category === categoryFilter.value)
  }
  if (search.value) {
    const s = search.value.toLowerCase()
    list = list.filter(d => d.hostname.toLowerCase().includes(s) || d.ip.includes(s))
  }
  return list
})

const isAddModalOpen = ref(false)
const newDevice = ref({
  hostname: '',
  ip: '',
  poll_method: 'snmp',
  snmp_version: 'v2c',
  snmp_community: 'public',
  category: 'network',
  ...defaultSnmpV3()
})

async function addDevice() {
  await $fetch('/api/net/devices', {
    method: 'POST',
    body: newDevice.value
  })
  isAddModalOpen.value = false
  refresh()
}

const deleteTarget = ref<any>(null)
const deleting = ref(false)
async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await $fetch(`/api/net/devices/${deleteTarget.value.id}`, { method: 'DELETE' })
    deleteTarget.value = null
    await refresh()
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader title="Devices" subtitle="Comprehensive inventory and status of all monitored assets" icon="i-lucide-server-crash">
      <template #actions>
        <UButton v-if="hasApp('net')" icon="i-lucide-plus" size="sm" @click="isAddModalOpen = true">Add Device</UButton>
      </template>
    </PageHeader>

    <div v-if="!hasApp('net')" class="panel flex flex-col items-center gap-2 p-10 text-center">
      <UIcon name="i-lucide-lock" class="size-6 text-faint" />
      <p class="text-sm text-(--color-muted)">You don't have access to KNetraHub-Net.</p>
    </div>

    <div v-else class="space-y-4">
      <div class="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <UInput v-model="search" icon="i-lucide-search" placeholder="Search hostname or IP..." class="w-full sm:w-64" />
          <USelect v-model="categoryFilter" :items="categories" value-key="value" label-key="label" />
        </div>
      </div>

      <div class="panel">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-(--color-muted)">
            <thead class="bg-surface-2 text-xs uppercase text-faint border-b border-surface">
              <tr>
                <th class="px-4 py-3 font-medium">Status</th>
                <th class="px-4 py-3 font-medium">Device</th>
                <th class="px-4 py-3 font-medium">Category</th>
                <th class="px-4 py-3 font-medium">Platform</th>
                <th class="px-4 py-3 font-medium">Uptime</th>
                <th class="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface">
              <tr v-if="status === 'pending'" class="animate-pulse">
                <td colspan="6" class="px-4 py-8 text-center text-faint">Loading devices...</td>
              </tr>
              <tr v-else-if="filteredDevices.length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-faint">No devices found.</td>
              </tr>
              <tr v-for="dev in filteredDevices" :key="dev.id" class="hover:bg-surface-2/50 transition">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <span class="size-2.5 rounded-full shadow-sm" :class="dev.status === 'up' ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'"></span>
                    <span class="capitalize text-xs font-medium" :class="dev.status === 'up' ? 'text-green-500' : 'text-red-500'">{{ dev.status }}</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <NuxtLink :to="`/net/devices/${dev.id}`" class="font-medium text-foam hover:text-beacon transition">{{ dev.hostname }}</NuxtLink>
                  <div class="font-mono text-xs text-faint mt-0.5">{{ dev.ip }}</div>
                </td>
                <td class="px-4 py-3">
                  <UBadge size="xs" variant="soft" :color="dev.category === 'network' ? 'blue' : dev.category === 'server' ? 'purple' : dev.category === 'storage' ? 'orange' : 'gray'">
                    {{ dev.category }}
                  </UBadge>
                </td>
                <td class="px-4 py-3">
                  <div class="text-foam">{{ dev.os || 'Unknown' }}</div>
                  <div class="text-xs text-faint">{{ dev.vendor || 'Unknown' }} ({{ dev.poll_method }})</div>
                </td>
                <td class="px-4 py-3 text-xs">{{ dev.uptime }}</td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <UButton v-if="hasApp('net')" size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" aria-label="Delete device" @click="deleteTarget = dev" />
                    <UButton :to="`/net/devices/${dev.id}`" size="xs" variant="ghost" icon="i-lucide-chevron-right" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add Device Modal -->
    <UModal v-model:open="isAddModalOpen" title="Add Device">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Hostname">
            <UInput v-model="newDevice.hostname" placeholder="sw-core-01" class="w-full" />
          </UFormField>
          <UFormField label="IP Address">
            <UInput v-model="newDevice.ip" placeholder="10.0.0.1" class="w-full" />
          </UFormField>
          <UFormField label="Category">
            <USelect v-model="newDevice.category" :items="categories.slice(1)" value-key="value" label-key="label" class="w-full" />
          </UFormField>
          <UFormField label="Polling Method">
            <USelect v-model="newDevice.poll_method" :items="[{value:'snmp', label:'SNMP'}, {value:'ping', label:'Ping Only'}]" value-key="value" label-key="label" class="w-full" />
          </UFormField>
          <template v-if="newDevice.poll_method === 'snmp'">
            <NetSnmpFields :form="newDevice" />
          </template>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <UButton variant="ghost" @click="isAddModalOpen = false">Cancel</UButton>
          <UButton color="primary" @click="addDevice">Add Device</UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete confirmation -->
    <UModal :open="!!deleteTarget" @update:open="(v) => { if (!v) deleteTarget = null }">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-foam mb-2">Delete device</h3>
          <p class="text-sm text-(--color-muted)">
            Remove <span class="font-medium text-foam">{{ deleteTarget?.hostname }}</span>
            (<span class="font-mono">{{ deleteTarget?.ip }}</span>) and all of its interfaces, sensors, and alerts?
            This cannot be undone.
          </p>
          <div class="mt-6 flex justify-end gap-3">
            <UButton variant="ghost" @click="deleteTarget = null">Cancel</UButton>
            <UButton color="error" :loading="deleting" @click="confirmDelete">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
