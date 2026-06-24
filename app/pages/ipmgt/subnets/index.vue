<script setup lang="ts">
const { hasApp } = useAuth()

const { data: subnets } = useAsyncData('ipmgtSubnetsList', () => $fetch('/api/ipmgt/subnets'))
</script>

<template>
  <div>
    <PageHeader title="Subnets" subtitle="IPv4 and IPv6 managed subnets" icon="i-lucide-network" />

    <div v-if="!hasApp('ipmgt')" class="panel flex flex-col items-center gap-2 p-10 text-center">
      <UIcon name="i-lucide-lock" class="size-6 text-faint" />
      <p class="text-sm text-(--color-muted)">You don't have access to KNetraHub-IPMgt.</p>
    </div>

    <div v-else class="panel">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-(--color-muted)">
          <thead class="bg-surface-2 text-xs uppercase text-faint">
            <tr>
              <th class="px-4 py-3 font-medium">Subnet</th>
              <th class="px-4 py-3 font-medium">Description</th>
              <th class="px-4 py-3 font-medium">VLAN</th>
              <th class="px-4 py-3 font-medium">Usage</th>
              <th class="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface">
            <tr v-for="sub in subnets" :key="sub.id" class="hover:bg-surface-2/50 transition">
              <td class="px-4 py-3 font-mono text-foam font-medium">{{ sub.subnet }}</td>
              <td class="px-4 py-3">{{ sub.name }}</td>
              <td class="px-4 py-3">{{ sub.vlan }}</td>
              <td class="px-4 py-3 min-w-[200px]">
                <div class="flex items-center gap-3">
                  <div class="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all" 
                         :class="sub.usage > 80 ? 'bg-red-500' : (sub.usage > 60 ? 'bg-orange-500' : 'bg-green-500')"
                         :style="{ width: `${sub.usage}%` }">
                    </div>
                  </div>
                  <span class="text-xs text-faint w-8 text-right">{{ sub.usage }}%</span>
                </div>
              </td>
              <td class="px-4 py-3 text-right">
                <NuxtLink :to="`/ipmgt/subnets/${sub.id}`" class="text-beacon hover:underline">View IPs</NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
