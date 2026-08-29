import blackJacket from './assets/wardrobe/Black Jacket.jpeg'
import blackTrousers from './assets/wardrobe/Black PAnt.jpeg'
import blackFormalShoes from './assets/wardrobe/black-formal-shoes.png'
import blackShoes from './assets/wardrobe/black-shoes.png'
import blueDenimJacket from './assets/wardrobe/Blue Denim Jacket.jpg'
import blueShirt from './assets/wardrobe/Blue Shirt.jpeg'
import brownJeans from './assets/wardrobe/Brown jeans.jpg'
import brownShorts from './assets/wardrobe/Brown Shorts.jpeg'
import greenCap from './assets/wardrobe/GReen cap.jpeg'
import greenPlaidShirt from './assets/wardrobe/Green Plaid SHirt.jpeg'
import greyBag from './assets/wardrobe/Grey Bag.jpeg'
import greyTrousers from './assets/wardrobe/Grey Trousers.jpg'
import navyShirt from './assets/wardrobe/NAvy Shirt.jpeg'
import whiteShirt from './assets/wardrobe/White Shirt.jpeg'
import whiteBlackSneakers from './assets/wardrobe/white-shoes.png'
import yellowShirt from './assets/wardrobe/Yellow Shirt.jpeg'
import type { WardrobeItem } from './types'

export const LEGACY_SEED_IDS = new Set(['g1', 'r1', 'b1', 'w1', 'c1', 'c2', 's1'])
export const WARDROBE_SEED_VERSION = 2

export const STARTING_WARDROBE: WardrobeItem[] = [
  { id: 'seed-blue-shirt', name: 'Blue T-Shirt', image: blueShirt, category: 'top', worn: 0, color: 'blue', metadata: { subcategory: 't-shirt', pattern: 'solid', styleTags: ['casual'], formalityScore: 1 } },
  { id: 'seed-yellow-shirt', name: 'Yellow T-Shirt', image: yellowShirt, category: 'top', worn: 0, color: 'yellow', metadata: { subcategory: 't-shirt', pattern: 'solid', styleTags: ['casual'], formalityScore: 1 } },
  { id: 'seed-green-plaid-shirt', name: 'Green Plaid Shirt', image: greenPlaidShirt, category: 'top', worn: 0, color: 'green', metadata: { subcategory: 'button-up shirt', pattern: 'plaid', styleTags: ['casual'], formalityScore: 2 } },
  { id: 'seed-navy-shirt', name: 'Navy Shirt', image: navyShirt, category: 'top', worn: 0, color: 'navy', metadata: { subcategory: 'shirt', pattern: 'solid', formalityScore: 3 } },
  { id: 'seed-white-shirt', name: 'White Shirt', image: whiteShirt, category: 'top', worn: 0, color: 'white', metadata: { subcategory: 'shirt', pattern: 'solid', formalityScore: 3 } },
  { id: 'seed-black-jacket', name: 'Black Jacket', image: blackJacket, category: 'outerwear', worn: 0, color: 'black', metadata: { subcategory: 'jacket', pattern: 'solid', styleTags: ['outerwear'], formalityScore: 3 } },
  { id: 'seed-blue-denim-jacket', name: 'Blue Denim Jacket', image: blueDenimJacket, category: 'outerwear', worn: 0, color: 'blue', metadata: { subcategory: 'denim jacket', pattern: 'solid', materialGuess: 'denim', styleTags: ['casual', 'outerwear'], formalityScore: 2 } },
  { id: 'seed-black-trousers', name: 'Black Trousers', image: blackTrousers, category: 'bottom', worn: 0, color: 'black', metadata: { subcategory: 'trousers', pattern: 'solid', formalityScore: 3 } },
  { id: 'seed-grey-wide-leg-trousers', name: 'Grey Wide-Leg Trousers', image: greyTrousers, category: 'bottom', worn: 0, color: 'grey', metadata: { subcategory: 'trousers', fit: 'wide-leg / relaxed', pattern: 'solid', styleTags: ['relaxed'], formalityScore: 2 } },
  { id: 'seed-brown-jeans', name: 'Brown Jeans', image: brownJeans, category: 'bottom', worn: 0, color: 'brown', metadata: { subcategory: 'jeans', styleTags: ['casual'], formalityScore: 1 } },
  { id: 'seed-brown-shorts', name: 'Brown Shorts', image: brownShorts, category: 'bottom', worn: 0, color: 'brown', metadata: { subcategory: 'shorts', styleTags: ['casual'], formalityScore: 1 } },
  { id: 'seed-white-black-sneakers', name: 'White/Black Sneakers', image: whiteBlackSneakers, category: 'shoes', worn: 0, color: 'white', metadata: { subcategory: 'sneakers', secondaryColors: ['black'], styleTags: ['casual'], formalityScore: 1 } },
  { id: 'seed-black-shoes', name: 'Black Shoes', image: blackShoes, category: 'shoes', worn: 0, color: 'black', metadata: { subcategory: 'shoes', formalityScore: 2 } },
  { id: 'seed-black-formal-shoes', name: 'Black Formal Shoes', image: blackFormalShoes, category: 'shoes', worn: 0, color: 'black', metadata: { subcategory: 'formal shoes', pattern: 'solid', styleTags: ['formal'], formalityScore: 5 } },
  { id: 'seed-green-cap', name: 'Green Cap', image: greenCap, category: 'accessory', worn: 0, color: 'green', metadata: { subcategory: 'cap', styleTags: ['casual'], formalityScore: 1 } },
  { id: 'seed-grey-bag', name: 'Grey Bag', image: greyBag, category: 'accessory', worn: 0, color: 'grey', metadata: { subcategory: 'bag', formalityScore: 2 } },
]
