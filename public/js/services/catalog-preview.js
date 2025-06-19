export async function fetchCatalogPreview(type, limit = 4) {
  const endpointMap = {
    'Giochi': '/api/games',
    'Drink': '/api/drinks',
    'Snack': '/api/snacks'
  };
  const keyMap = {
    'Giochi': 'games',
    'Drink': 'drinks',
    'Snack': 'snacks'
  };

  const url = endpointMap[type];
  if (!url) return [];
  try {
    const response = await fetch(`${url}?limit=${limit}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data[keyMap[type]] || data;
  } catch (err) {
    console.error('fetchCatalogPreview error:', err);
    return [];
  }
}
