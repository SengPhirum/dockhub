<script setup lang="ts">
const route = useRoute()
const { hasApp } = useAuth()

const { data: subnet } = useAsyncData(`ipmgtSubnet-${route.params.id}`, () => $fetch(`/api/ipmgt/subnets/${route.params.id}`))
const { data: ips } = useAsyncData(`ipmgtSubnetIps-${route.params.id}`, () => $fetch(`/api/ipmgt/subnets/${route.params.id}/ips`))
</script>

<template>
  <div>
    <PageHeader :title="subnet?.network || 'Loading...'" :subtitle="subnet?.name || ''" icon="i-lucide-book">
      <template #actions>
        <NuxtLink to="/ipmgt/subnets" class="text-sm font-medium text-(--color-muted) hover:text-foam flex items-center gap-1">
          <UIcon name="i-lucide-arrow-left" class="size-4" /> Back to Subnets
        </NuxtLink>
      </template>
    </PageHeader>

    <div v-if="!hasApp('ipmgt')" class="panel flex flex-col items-center gap-2 p-10 text-center">
      <UIcon name="i-lucide-lock" class="size-6 text-faint" />
      <p class="text-sm text-(--color-muted)">You don't have access to KNetraHub-IPMgt.</p>
    </div>

    <div v-else-if="subnet" class="space-y-6">
      <div class="panel p-5 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <span class="text-xs font-medium uppercase text-(--color-muted)">Network Address</span>
          <p class="mt-1 font-mono text-sm text-foam">{{ subnet.network }}</p>
        </div>
        <div>
          <span class="text-xs font-medium uppercase text-(--color-muted)">Gateway</span>
          <p class="mt-1 font-mono text-sm text-foam">{{ subnet.gateway }}</p>
        </div>
        <div>
          <span class="text-xs font-medium uppercase text-(--color-muted)">VLAN</span>
          <p class="mt-1 text-sm text-foam">{{ subnet.vlan }}</p>
        </div>
        <div>
          <span class="text-xs font-medium uppercase text-(--color-muted)">Utilization</span>
          <div class="mt-1 flex items-center gap-2">
            <div class="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden max-w-[100px]">
              <div class="h-full rounded-full bg-beacon transition-all" :style="{ width: `${subnet.usage}%` }"></div>
            </div>
            <p class="text-sm text-foam">{{ subnet.usage }}%</p>
          </div>
        </div>
      </div>

      <section class="panel">
        <div class="p-4 border-b border-surface flex items-center justify-between">
          <h2 class="font-display text-sm font-semibold uppercase tracking-wider text-(--color-muted)">IP Addresses</h2>
          <div class="flex items-center gap-2">
             <UInput icon="i-lucide-search" placeholder="Search IP or hostname..." size="sm" />
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-(--color-muted)">
            <thead class="bg-surface-2 text-xs uppercase text-faint">
              <tr>
                <th class="px-4 py-2 font-medium">IP Address</th>
                <th class="px-4 py-2 font-medium">State</th>
                <th class="px-4 py-2 font-medium">Hostname</th>
                <th class="px-4 py-2 font-medium">MAC Address</th>
                <th class="px-4 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface">
              <tr v-for="addr in ips" :key="addr.id" class="hover:bg-surface-2/50 transition" :class="{'opacity-60': addr.state === 'Available'}">
                <td class="px-4 py-2 font-mono text-foam font-medium">{{ addr.ip }}</td>
                <td class="px-4 py-2">
                  <span class="px-2 py-0.5 rounded text-xs font-medium"
                        :class="{
                          'bg-green-500/10 text-green-500': addr.state === 'Available',
                          'bg-blue-500/10 text-blue-500': addr.state === 'Used',
                          'bg-orange-500/10 text-orange-500': addr.state === 'Reserved'
                        }">
                    {{ addr.state }}
                  </span>
                </td>
                <td class="px-4 py-2">{{ addr.hostname }}</td>
                <td class="px-4 py-2 font-mono text-xs">{{ addr.mac }}</td>
                <td class="px-4 py-2">{{ addr.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>
