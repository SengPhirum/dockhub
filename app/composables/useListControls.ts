export type SortDirection = 'asc' | 'desc'

export interface ListSortOption<T = any> {
  label: string
  value: string
  getValue?: (item: T) => unknown
}

interface UseListControlsOptions<T> {
  sortOptions: Array<ListSortOption<T>>
  defaultSortBy?: string
  defaultSortDir?: SortDirection
}

function resolveListSource<T>(source: any): T[] {
  const value = typeof source === 'function' ? source() : source?.value
  return Array.isArray(value) ? value : []
}

function pathValue(item: any, path: string): unknown {
  return path.split('.').reduce((current, segment) => current?.[segment], item)
}

function searchableText(value: unknown, seen = new WeakSet<object>()): string {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString()
  if (['string', 'number', 'boolean', 'bigint'].includes(typeof value)) return String(value)
  if (Array.isArray(value)) return value.map((item) => searchableText(item, seen)).join(' ')
  if (typeof value === 'object') {
    if (seen.has(value)) return ''
    seen.add(value)
    return Object.values(value).map((item) => searchableText(item, seen)).join(' ')
  }
  return ''
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1

  const aValue = a instanceof Date ? a.getTime() : a
  const bValue = b instanceof Date ? b.getTime() : b
  if (typeof aValue === 'number' && typeof bValue === 'number') return aValue - bValue
  if (typeof aValue === 'boolean' && typeof bValue === 'boolean') return Number(aValue) - Number(bValue)

  return String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' })
}

export function useListControls<T = any>(
  key: string,
  source: any,
  options: UseListControlsOptions<T>
) {
  const { prefs, updatePreferences } = usePreferences()
  const sortOptions = options.sortOptions
  const fallbackSort = options.defaultSortBy || sortOptions[0]?.value || ''
  const fallbackDir = options.defaultSortDir || 'asc'
  const preferred = computed(() => prefs.value.lists?.[key])

  const search = ref('')
  const sortBy = ref(preferred.value?.sortBy || fallbackSort)
  const sortDir = ref<SortDirection>(preferred.value?.sortDir || fallbackDir)
  const restoringPreference = ref(false)
  let persistTimer: ReturnType<typeof setTimeout> | null = null

  watch(preferred, (next) => {
    if (!next) return
    if (!sortOptions.some((option) => option.value === next.sortBy)) return
    restoringPreference.value = true
    sortBy.value = next.sortBy
    sortDir.value = next.sortDir === 'desc' ? 'desc' : 'asc'
    nextTick(() => { restoringPreference.value = false })
  }, { immediate: true })

  watch([sortBy, sortDir], () => {
    if (restoringPreference.value) return
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      updatePreferences({
        lists: {
          ...(prefs.value.lists || {}),
          [key]: { sortBy: sortBy.value, sortDir: sortDir.value }
        }
      }).catch(() => null)
    }, 350)
  })

  const items = computed<T[]>(() => {
    const query = search.value.trim().toLowerCase()
    const currentSort = sortOptions.find((option) => option.value === sortBy.value) || sortOptions[0]
    const filtered = resolveListSource<T>(source).filter((item) => {
      if (!query) return true
      return searchableText(item).toLowerCase().includes(query)
    })

    if (!currentSort) return filtered

    return filtered
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const aValue = currentSort.getValue ? currentSort.getValue(a.item) : pathValue(a.item, currentSort.value)
        const bValue = currentSort.getValue ? currentSort.getValue(b.item) : pathValue(b.item, currentSort.value)
        const result = compareValues(aValue, bValue)
        return (sortDir.value === 'desc' ? -result : result) || a.index - b.index
      })
      .map(({ item }) => item)
  })

  function toggleSortDir() {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  }

  return { items, search, sortBy, sortDir, sortOptions, toggleSortDir }
}
