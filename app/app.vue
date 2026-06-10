<template>
  <UApp :toaster="{ position: 'bottom-right' }">
    <NuxtPwaManifest />
    <NuxtLayout>
      <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
    </NuxtLayout>
  </UApp>
</template>
