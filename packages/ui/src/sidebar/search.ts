import type { SidebarRailItem, SidebarSectionData } from './types'

function matchesSidebarItem(
  query: string,
  item: { label: string; description?: string; meta?: string; keywords?: readonly string[] },
): boolean {
  if (query === '') return true

  const haystack = [item.label, item.description ?? '', item.meta ?? '', ...(item.keywords ?? [])]
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

export function filterSidebarSections(sections: readonly SidebarSectionData[], query: string): SidebarSectionData[] {
  return sections
    .map(section => {
      const items = section.items.filter(item => matchesSidebarItem(query, item))
      return {
        ...section,
        items,
        meta: items.length.toString(),
      }
    })
    .filter(section => section.items.length > 0)
}

export function createSidebarSearchSections(
  librarySections: readonly SidebarSectionData[],
  actionSections: readonly SidebarSectionData[],
  query: string,
): SidebarSectionData[] {
  const items = [...librarySections, ...actionSections].flatMap(section => {
    const source = section.title ?? section.id ?? 'Section'

    return section.items
      .filter(item => matchesSidebarItem(query, item))
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

export function createSidebarRailItems(sections: readonly SidebarSectionData[]): SidebarRailItem[] {
  return sections.map(section => ({
    id: section.id ?? section.title ?? 'category',
    label: section.title ?? 'Category',
    title: section.description ?? section.title,
    badge: section.meta,
  }))
}
