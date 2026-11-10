const eventCategoryLabels: Record<string, string> = {
    art: 'Seni',
    bazaar: 'Bazar',
    campus: 'Kampus',
    exhibition: 'Pameran',
    festival: 'Festival',
    music: 'Musik',
    sports: 'Olahraga',
};

export function eventCategoryLabel(category: string | null | undefined): string {
    return category ? (eventCategoryLabels[category] ?? category) : 'Event';
}
