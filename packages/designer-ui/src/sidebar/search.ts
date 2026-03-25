import type { PanelRailItem, PanelSectionData } from '@diagen/ui'

function matchesPanelItem(
  query: string,
  item: { label: string; description?: string; meta?: string; keywords?: readonly string[] },
): boolean {
  if (query === '') return true

  const haystack = [item.label, item.description ?? '', item.meta ?? '', ...(item.keywords ?? [])]
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

export function filterPanelSections(sections: readonly PanelSectionData[], query: string): PanelSectionData[] {
  return sections
    .map(section => {
      const items = section.items.filter(item => matchesPanelItem(query, item))
      return {
        ...section,
        items,
        meta: items.length.toString(),
      }
    })
    .filter(section => section.items.length > 0)
}

export function createPanelSearchSections(
  librarySections: readonly PanelSectionData[],
  actionSections: readonly PanelSectionData[],
  query: string,
): PanelSectionData[] {
  const items = [...librarySections, ...actionSections].flatMap(section => {
    const source = section.title ?? section.id ?? 'Section'

    return section.items
      .filter(item => matchesPanelItem(query, item))
      .map(item => ({
        ...item,
        meta: source,
      }))
  })

  if (items.length === 0) return []

  return [
    {
      id: 'search:results',
      title: 'Search Results',
      description: `“${query}”`,
      meta: items.length.toString(),
      layout: 'list',
      items,
    },
  ]
}

export function createPanelRailItems(sections: readonly PanelSectionData[]): PanelRailItem[] {
  return sections.map(section => ({
    id: section.id ?? section.title ?? 'category',
    label: section.title ?? 'Category',
    title: section.description ?? section.title,
    badge: section.meta,
  }))
}
