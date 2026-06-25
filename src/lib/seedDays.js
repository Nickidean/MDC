const DEFAULT_DAYS = [
  { week: 1, weekday: 'Monday',    date_label: '17 Aug', sort_index: 0 },
  { week: 1, weekday: 'Tuesday',   date_label: '18 Aug', sort_index: 1 },
  { week: 1, weekday: 'Wednesday', date_label: '19 Aug', sort_index: 2 },
  { week: 1, weekday: 'Thursday',  date_label: '20 Aug', sort_index: 3 },
  { week: 1, weekday: 'Friday',    date_label: '21 Aug', sort_index: 4 },
  { week: 2, weekday: 'Monday',    date_label: '24 Aug', sort_index: 5 },
  { week: 2, weekday: 'Tuesday',   date_label: '25 Aug', sort_index: 6 },
  { week: 2, weekday: 'Wednesday', date_label: '26 Aug', sort_index: 7 },
  { week: 2, weekday: 'Thursday',  date_label: '27 Aug', sort_index: 8 },
  { week: 2, weekday: 'Friday',    date_label: '28 Aug', sort_index: 9 },
]

export async function seedCampDays(supabase) {
  const { data, error } = await supabase
    .from('camp_days')
    .select('id')
    .limit(1)

  if (error) {
    console.error('seedCampDays check failed:', error)
    return
  }

  if (data && data.length > 0) return // already seeded

  const { error: insertError } = await supabase
    .from('camp_days')
    .insert(DEFAULT_DAYS)

  if (insertError) {
    console.error('seedCampDays insert failed:', insertError)
  }
}
