<script setup lang="ts">
const { appearance, htmlStyle, fetchAppearance } = useAppearance()
await fetchAppearance()

function mimeFromDataUrl(url: string): string | undefined {
  const match = /^data:([^;,]+)/.exec(url)
  return match?.[1]
}

// Custom favicon/PWA icon override the built-in static files. A data: URL
// (uploaded image) or http(s) URL works directly as a <link> href - no
// dedicated image-serving route needed, same as the logo overrides.
const faviconLinks = computed(() => {
  const favicon = appearance.value.faviconUrl
  const appIcon = appearance.value.pwaIconUrl
  const links: any[] = favicon
    ? [{ rel: 'icon', href: favicon, sizes: 'any', type: mimeFromDataUrl(favicon) }]
    : [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' }
      ]
  links.push(
    appIcon
      ? { rel: 'apple-touch-icon', href: appIcon, type: mimeFromDataUrl(appIcon) }
      : { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }
  )
  // Manifest content (including icons) is generated per-request by
  // server/routes/manifest.webmanifest.get.ts, reading the same appearance
  // settings - replaces @vite-pwa/nuxt's build-time static manifest, which
  // can't pick up an admin-uploaded icon without a full rebuild.
  links.push({ rel: 'manifest', href: '/manifest.webmanifest' })
  return links
})

useHead({
  title: computed(() => `${appearance.value.appName} - Swarm Console`),
  htmlAttrs: { style: htmlStyle },
  link: faviconLinks,
  meta: [
    { name: 'theme-color', content: computed(() => appearance.value.primaryColor) },
    { name: 'msapplication-TileColor', content: computed(() => appearance.value.primaryColor) }
  ]
})
</script>

<template>
  <UApp :toaster="{ position: 'bottom-right' }">
    <NuxtLayout>
      <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
    </NuxtLayout>
  </UApp>
</template>
