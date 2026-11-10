/** Public business details (from Business Settings and the services list) for the AI assistants. */

/** Business hours may be saved as text or as a { day: hours } list. */
function hoursText(h: unknown): string {
  if (!h) return ''
  if (typeof h === 'string') return h.replace(/\n/g, '; ')
  if (Array.isArray(h)) return h.map((x) => (typeof x === 'string' ? x : Object.values(x || {}).join(' '))).join('; ')
  if (typeof h === 'object') {
    return Object.entries(h as Record<string, unknown>)
      .map(([d, v]) => `${d}: ${v && typeof v === 'object' ? Object.values(v).join('-') : v}`)
      .join('; ')
  }
  return ''
}

function radiusText(r: any) {
  return r && typeof r.miles === 'number' ? `within about ${Math.round(r.miles)} miles of ${r.label || 'our base'}` : ''
}

/** Public business details the assistant can repeat to anyone. Nothing private goes here. */
export async function businessFacts(supabase: any) {
  const [{ data: c }, { data: services }] = await Promise.all([
    supabase.from('company_settings').select('*').eq('id', 'default').maybeSingle(),
    supabase.from('services').select('title, short_description').eq('is_published', true).order('sort_order').limit(20)
  ])
  const lines = [
    c?.company_name && `Business: ${c.company_name}`,
    c?.phone && `Phone: ${c.phone}`,
    c?.email && `Email: ${c.email}`,
    c?.address && `Address: ${c.address}`,
    hoursText(c?.business_hours_text || c?.business_hours) && `Hours: ${hoursText(c?.business_hours_text || c?.business_hours)}`,
    radiusText(c?.service_radius) && `Service area: ${radiusText(c.service_radius)}`,
    Array.isArray(c?.service_areas) && c.service_areas.length && `Main cities served: ${c.service_areas.join(', ')}`,
    Array.isArray(c?.seasonal_areas) && c.seasonal_areas.length && `Seasonal and storm response: ${c.seasonal_areas.join(', ')}`,
    c?.emergency_service_notice && `Emergencies: ${c.emergency_service_notice}`,
    services?.length && `Services offered: ${services.map((s: any) => (s.short_description ? `${s.title} (${String(s.short_description).slice(0, 100)})` : s.title)).join('; ')}`
  ].filter(Boolean)
  return { text: lines.join('\n'), name: c?.company_name || 'the company', phone: c?.phone || '' }
}
