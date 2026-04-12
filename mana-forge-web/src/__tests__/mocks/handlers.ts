import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:8080';
const SCRYFALL_BASE = 'https://api.scryfall.com';

// Fixtures reutilizables
export const mockUser = {
  userId: 'user-1',
  name: 'Test User',
  username: 'testuser',
  email: 'test@example.com',
  biography: 'Bio',
  friends: [],
  avatar: 'ava1.jpg',
};

export const mockDeck = {
  id: 'deck-1',
  name: 'Sligh',
  formatId: 'fmt-1',
  colors: ['R'],
};

export const mockFormat = {
  id: 'fmt-1',
  name: { es: 'Premoderno', en: 'Premodern' },
  scryfallKey: 'premodern',
  config: { minMainDeck: 60, maxSideboard: 15, maxCopies: 4 },
  isActive: true,
};

export const mockArticle = {
  documentId: 'art-1',
  title: 'Test Article',
  subtitle: 'Subtitle',
  imageUrl: 'https://example.com/img.jpg',
};

export const mockManaSymbols = {
  data: [
    {
      symbol: '{W}',
      svg_uri: 'https://svgs.scryfall.io/card-symbols/W.svg',
      english: 'White',
      transposable: false,
      represents_mana: true,
    },
    {
      symbol: '{U}',
      svg_uri: 'https://svgs.scryfall.io/card-symbols/U.svg',
      english: 'Blue',
      transposable: false,
      represents_mana: true,
    },
    {
      symbol: '{B}',
      svg_uri: 'https://svgs.scryfall.io/card-symbols/B.svg',
      english: 'Black',
      transposable: false,
      represents_mana: true,
    },
    {
      symbol: '{R}',
      svg_uri: 'https://svgs.scryfall.io/card-symbols/R.svg',
      english: 'Red',
      transposable: false,
      represents_mana: true,
    },
    {
      symbol: '{G}',
      svg_uri: 'https://svgs.scryfall.io/card-symbols/G.svg',
      english: 'Green',
      transposable: false,
      represents_mana: true,
    },
  ],
};

export const mockCard = {
  id: 'scryfall-1',
  name: 'Lightning Bolt',
  mana_cost: '{R}',
  cmc: 1,
  type_line: 'Instant',
  image_uris: { normal: 'https://example.com/bolt.jpg' },
};

export const handlers = [
  // Auth
  http.post(`${BASE}/users/login`, () => HttpResponse.json(mockUser)),
  http.post(`${BASE}/users`, () => HttpResponse.json(mockUser, { status: 201 })),
  http.get(`${BASE}/users/me`, () => HttpResponse.json(mockUser)),
  http.post(`${BASE}/users/logout`, () => new HttpResponse(null, { status: 200 })),
  http.patch(`${BASE}/users/me`, () => HttpResponse.json(mockUser)),
  http.patch(`${BASE}/users/me/password`, () => new HttpResponse(null, { status: 200 })),
  http.get(`${BASE}/users/verify`, () => new HttpResponse(null, { status: 200 })),
  http.get(`${BASE}/decks/user/:userId`, () => HttpResponse.json([])),

  // Cards
  http.get(`${BASE}/cards/autocomplete`, () =>
    HttpResponse.json({ data: ['Lightning Bolt', 'Llanowar Elves'] })
  ),
  http.get(`${BASE}/cards/scryfall`, () => HttpResponse.json({ data: [mockCard] })),
  http.get(`${BASE}/cards/scryfall/:id`, () => HttpResponse.json(mockCard)),
  http.get(`${BASE}/cards/banned/:format`, () => HttpResponse.json([mockCard])),
  http.get(`${BASE}/cards/symbology`, () => HttpResponse.json(mockManaSymbols)),

  // Decks
  http.post(`${BASE}/decks/random`, () =>
    HttpResponse.json({ deck_name: 'Daily Deck', main_deck: [], sideboard: [] })
  ),
  http.post(`${BASE}/decks/random/rate`, () =>
    HttpResponse.json({ deck_name: 'Daily Deck', main_deck: [], sideboard: [] })
  ),
  http.get(`${BASE}/decks/featured`, () =>
    HttpResponse.json({
      id: 'deck-1',
      name: 'Featured',
      formatName: 'Premodern',
      ownerUsername: 'user',
      colors: ['R'],
      featuredScryfallId: 'sc-1',
      likesCount: 5,
    })
  ),
  http.get(`${BASE}/decks/:id/view`, () =>
    HttpResponse.json({
      id: 'deck-1',
      name: 'Sligh',
      formatName: 'Premodern',
      ownerUsername: 'user',
      colors: ['R'],
      mainDeck: [],
      sideboard: [],
      likesCount: 0,
      likedByMe: false,
    })
  ),
  http.post(`${BASE}/decks`, () => HttpResponse.json(mockDeck, { status: 201 })),
  http.put(`${BASE}/decks/:id`, () => HttpResponse.json(mockDeck)),
  http.delete(`${BASE}/decks/:id`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${BASE}/decks/:id/like`, () => HttpResponse.json({ likesCount: 1, likedByMe: true })),
  http.delete(`${BASE}/decks/:id/like`, () =>
    HttpResponse.json({ likesCount: 0, likedByMe: false })
  ),
  http.post(`${BASE}/decks/:id/clone`, () => HttpResponse.json({ ...mockDeck, id: 'deck-2' })),
  http.post(`${BASE}/decks/:id/pin`, () => HttpResponse.json(mockDeck)),
  http.delete(`${BASE}/decks/:id/pin`, () => HttpResponse.json(mockDeck)),
  http.get(`${BASE}/decks/search`, () => HttpResponse.json([])),
  http.post(`${BASE}/decks/analyze`, () => HttpResponse.json({ analysis: 'Great deck!' })),
  http.get(`${BASE}/decks/:id`, () => HttpResponse.json(mockDeck)),

  // Formats
  http.get(`${BASE}/formats/active`, () => HttpResponse.json([mockFormat])),
  http.get(`${BASE}/formats/:id`, () =>
    HttpResponse.json({ mongoId: 'fmt-1', slug: 'premodern', title: 'Premodern' })
  ),
  http.get(`${BASE}/formats`, () =>
    HttpResponse.json({ mongoId: 'fmt-1', title: 'Premodern', imageUrl: '', description: '' })
  ),

  // Articles
  http.get(`${BASE}/articles/latest`, () => HttpResponse.json([mockArticle])),
  http.get(`${BASE}/articles/:id`, () => HttpResponse.json(mockArticle)),

  // Friends
  http.get(`${BASE}/friends`, () => HttpResponse.json([])),
  http.get(`${BASE}/friends/requests/received`, () => HttpResponse.json([])),
  http.get(`${BASE}/friends/requests/sent`, () => HttpResponse.json([])),
  http.post(`${BASE}/friends/requests/:id`, () => new HttpResponse(null, { status: 200 })),
  http.put(`${BASE}/friends/requests/:id/accept`, () => new HttpResponse(null, { status: 200 })),
  http.delete(`${BASE}/friends/requests/:id`, () => new HttpResponse(null, { status: 200 })),
  http.delete(`${BASE}/friends/:id`, () => new HttpResponse(null, { status: 200 })),
  http.get(`${BASE}/friends/search`, () => HttpResponse.json([])),

  // Follows
  http.post(`${BASE}/follows/:id`, () => new HttpResponse(null, { status: 200 })),
  http.delete(`${BASE}/follows/:id`, () => new HttpResponse(null, { status: 200 })),
  http.get(`${BASE}/follows/following`, () => HttpResponse.json([])),
  http.get(`${BASE}/follows/followers`, () => HttpResponse.json([])),
  http.get(`${BASE}/follows/:id/status`, () =>
    HttpResponse.json({ following: false, followersCount: 0, followingCount: 0 })
  ),

  // Contact
  http.post(`${BASE}/contact`, () => new HttpResponse(null, { status: 200 })),

  // Messages
  http.get(`${BASE}/messages/conversations`, () => HttpResponse.json([])),
  http.get(`${BASE}/messages/unread-count`, () => HttpResponse.json({ count: 0 })),
  http.get(`${BASE}/messages/:friendId`, () => HttpResponse.json([])),
  http.post(`${BASE}/messages/:friendId`, () =>
    HttpResponse.json({
      id: 'msg-1',
      senderId: 'user-1',
      receiverId: 'user-2',
      content: 'Hi',
      createdAt: new Date().toISOString(),
      read: false,
    })
  ),
  http.put(`${BASE}/messages/:friendId/read`, () => new HttpResponse(null, { status: 200 })),

  // Scryfall (direct)
  http.get(`${SCRYFALL_BASE}/cards/named`, () => HttpResponse.json(mockCard)),
  http.get(`${SCRYFALL_BASE}/cards/:id`, () => HttpResponse.json(mockCard)),
];
