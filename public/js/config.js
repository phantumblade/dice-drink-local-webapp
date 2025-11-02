const IS_GITHUB_PAGES = location.hostname.endsWith('github.io');
const GH_REPO_PATH = (() => {
  const path = location.pathname.split('/').filter(Boolean);
  return IS_GITHUB_PAGES && path.length ? `/${path[0]}/` : '/';
})();

window.AppConfig = {
  IS_GITHUB_PAGES,
  GH_REPO_PATH,
  API_BASE: IS_GITHUB_PAGES
    ? (window.GLOBAL_API_BASE || 'https://<your-backend>.onrender.com')
    : ''
};

window.apiFetch = async function (path, options) {
  const base = window.AppConfig.API_BASE || '';
  const url = base + path;

  try {
    const response = await fetch(url, options);
    if (!response.ok && window.AppConfig.IS_GITHUB_PAGES) {
      return handleMockFetch(path, options, response.status);
    }
    return response;
  } catch (error) {
    if (window.AppConfig.IS_GITHUB_PAGES) {
      return handleMockFetch(path, options, 0);
    }
    throw error;
  }
};

async function handleMockFetch(path, options, status) {
  const mockMap = {
    '/api/games': 'data/mock-games.json',
    '/api/drinks': 'data/mock-drinks.json',
    '/api/snacks': 'data/mock-snacks.json',
    '/api/tournaments': 'data/mock-tournaments.json'
  };

  const matchKey = Object.keys(mockMap).find(key => path.startsWith(key));
  if (!matchKey) {
    return new Response(JSON.stringify({ error: 'Mock non disponibile', status }), {
      status: status || 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const mockUrl = mockMap[matchKey];
  try {
    const mockResponse = await fetch(mockUrl);
    if (!mockResponse.ok) {
      throw new Error('Mock non trovato');
    }
    const data = await mockResponse.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Mock non disponibile', status }), {
      status: status || 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
