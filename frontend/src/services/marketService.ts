import { STARTING_WARDROBE } from '../mockData'
import type { MarketListing, WardrobeCategory, WardrobeItem } from '../types'

const STORAGE_KEY = 'rewear:market-listings'
const image = (id: string) => STARTING_WARDROBE.find(item => item.id === id)?.image ?? ''

export const MARKET_LISTINGS: MarketListing[] = [
  { id: 'market-denim', title: 'Vintage Denim Jacket', category: 'outerwear', image: image('seed-blue-denim-jacket'), price: 28, size: 'M', condition: 'Excellent condition', sellerName: 'Maya', pickup: 'Pickup in Tiong Bahru', listingType: 'buy', color: 'blue', styleTags: ['casual', 'denim'], description: 'A classic denim layer with an easy, relaxed fit.' },
  { id: 'market-trousers', title: 'Black Wide-Leg Trousers', category: 'bottom', image: image('seed-grey-wide-leg-trousers'), price: 18, size: '30', condition: 'Good condition', sellerName: 'Alex', pickup: 'Meet-up near Bugis', listingType: 'buy', color: 'black', styleTags: ['relaxed'], description: 'Soft drape and a versatile high-rise cut.' },
  { id: 'market-sneakers', title: 'White Sneakers', category: 'shoes', image: image('seed-white-black-sneakers'), price: 24, size: '42', condition: 'Very good condition', sellerName: 'Jamie', pickup: 'Pickup in Queenstown', listingType: 'buy', color: 'white', styleTags: ['casual'], description: 'Clean everyday sneakers with plenty of life left.' },
  { id: 'market-plaid', title: 'Green Plaid Shirt', category: 'top', image: image('seed-green-plaid-shirt'), price: 16, size: 'M', condition: 'Good condition', sellerName: 'Sam', pickup: 'MRT meet-up', listingType: 'trade', tradePreference: 'Casual outerwear', color: 'green', styleTags: ['casual'], description: 'A soft plaid button-up, open to a thoughtful swap.' },
  { id: 'market-jacket', title: 'Black Tailored Jacket', category: 'outerwear', image: image('seed-black-jacket'), price: 32, size: 'S', condition: 'Excellent condition', sellerName: 'Rina', pickup: 'Pickup in Novena', listingType: 'trade', tradePreference: 'Open to offers', color: 'black', styleTags: ['formal'], description: 'A sharp lightweight jacket for work or evenings.' },
  { id: 'market-shirt', title: 'Navy Button-Up Shirt', category: 'top', image: image('seed-navy-shirt'), price: 14, size: 'M', condition: 'Very good condition', sellerName: 'Theo', pickup: 'Meet-up in City Hall', listingType: 'buy', color: 'navy', styleTags: ['smart casual'], description: 'An easy navy staple for a more polished rotation.' },
  { id: 'market-jeans', title: 'Brown Straight Jeans', category: 'bottom', image: image('seed-brown-jeans'), price: 20, size: '31', condition: 'Good condition', sellerName: 'Nora', pickup: 'Pickup in Clementi', listingType: 'trade', tradePreference: 'Shoes or accessories', color: 'brown', styleTags: ['casual'], description: 'Comfortable straight-leg denim, ready for another wardrobe.' },
  { id: 'market-bag', title: 'Grey Everyday Bag', category: 'accessory', image: image('seed-grey-bag'), price: 15, size: 'One size', condition: 'Very good condition', sellerName: 'Lee', pickup: 'MRT meet-up', listingType: 'buy', color: 'grey', styleTags: ['minimal'], description: 'A practical neutral bag for daily essentials.' },
]

export function loadMyListings(): MarketListing[] {
  try { const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]'); return Array.isArray(parsed) ? parsed as MarketListing[] : [] } catch { return [] }
}

export function createMyListing(item: WardrobeItem, listingType: MarketListing['listingType'], details: Pick<MarketListing, 'price' | 'size' | 'condition' | 'tradePreference'>) {
  const existing = loadMyListings().find(candidate => candidate.wardrobeItemId === item.id)
  if (existing) return existing
  const listing: MarketListing = { id: crypto.randomUUID(), title: item.name, category: item.category, image: item.image, sellerName: 'You', pickup: 'Your preferred meet-up', listingType, color: item.color, styleTags: item.metadata?.styleTags, description: `A pre-loved ${item.name.toLowerCase()} ready for its next chapter.`, isMine: true, wardrobeItemId: item.id, ...details }
  const listings = [listing, ...loadMyListings()]
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(listings)) } catch { /* Keep the mock flow usable in memory. */ }
  return listing
}

export function removeMyListing(id: string) {
  const listings = loadMyListings().filter(listing => listing.id !== id)
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(listings)) } catch { /* Keep the mock flow usable in memory. */ }
}

export const isWardrobeItemListed = (itemId: string) => loadMyListings().some(listing => listing.wardrobeItemId === itemId)

export const marketCategories: Array<{ label: string; value: WardrobeCategory | 'all' }> = [{ label: 'All', value: 'all' }, { label: 'Tops', value: 'top' }, { label: 'Outerwear', value: 'outerwear' }, { label: 'Bottoms', value: 'bottom' }, { label: 'Shoes', value: 'shoes' }, { label: 'Accessories', value: 'accessory' }]
