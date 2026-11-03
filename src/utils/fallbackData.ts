export interface FallbackService {
  id: string
  title: string
  slug: string
  short_description: string
  full_description: string
  price_range: string
  featured_image: string
  is_published: boolean
  sort_order: number
}

export interface FallbackGalleryItem {
  id: string
  title: string
  description: string
  before_image: string
  after_image: string
  completion_date: string
  service_category: string
  location: string
  is_published: boolean
  is_private: boolean
  sort_order: number
}

export const FALLBACK_SERVICES: FallbackService[] = [
  {
    id: 'f-1',
    title: 'Tree Removal',
    slug: 'tree-removal',
    short_description: 'Safe removal of dead, damaged or unwanted trees of any size.',
    full_description: 'Whether a tree is dead, leaning toward your house or simply in the way, we take it down in sections when needed to protect your home, fences and landscaping, then haul the wood and debris away.',
    price_range: 'Call for a quote',
    featured_image: '',
    is_published: true,
    sort_order: 1
  },
  {
    id: 'f-2',
    title: 'Tree Trimming & Pruning',
    slug: 'tree-trimming-pruning',
    short_description: 'Shape trees, clear overhanging limbs and keep branches off your roof and lines.',
    full_description: 'Regular trimming keeps trees healthy and your property safe. We remove dead and crossing branches, raise canopies over driveways and roofs, and thin trees so they stand up better to wind.',
    price_range: 'Call for a quote',
    featured_image: '',
    is_published: true,
    sort_order: 2
  },
  {
    id: 'f-3',
    title: 'Stump Grinding',
    slug: 'stump-grinding',
    short_description: 'Grind stumps below ground level so you can mow, plant or build.',
    full_description: 'Leftover stumps are trip hazards and attract pests. We grind them down below the surface and can clean up the grindings so the area is ready for grass or new plantings.',
    price_range: 'Call for a quote',
    featured_image: '',
    is_published: true,
    sort_order: 3
  },
  {
    id: 'f-4',
    title: 'Storm Damage Cleanup',
    slug: 'storm-damage-cleanup',
    short_description: 'Fast help clearing fallen trees and broken limbs after a storm.',
    full_description: 'After high winds or ice, we cut up and remove fallen trees and hanging limbs so you can get your yard, driveway and roof clear again.',
    price_range: 'Call for a quote',
    featured_image: '',
    is_published: true,
    sort_order: 4
  },
  {
    id: 'f-5',
    title: 'Lot & Land Clearing',
    slug: 'lot-land-clearing',
    short_description: 'Clear brush, small trees and overgrowth from lots and fence lines.',
    full_description: 'Getting a lot ready to build, opening up a fence line or reclaiming an overgrown yard, we clear trees, brush and undergrowth and haul it off.',
    price_range: 'Call for a quote',
    featured_image: '',
    is_published: true,
    sort_order: 5
  },
  {
    id: 'f-6',
    title: 'Brush & Debris Haul-Off',
    slug: 'brush-debris-haul-off',
    short_description: 'We load up and haul away limbs, brush and yard debris.',
    full_description: 'Already did the cutting yourself? We will load and haul away the limbs, brush and logs so you are not left with the mess.',
    price_range: 'Call for a quote',
    featured_image: '',
    is_published: true,
    sort_order: 6
  }
]

export const FALLBACK_GALLERY_ITEMS: FallbackGalleryItem[] = []
