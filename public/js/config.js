window.AppConfig = {
  IS_GITHUB_PAGES: location.hostname.endsWith('github.io'),
  API_BASE: location.hostname.endsWith('github.io')
    ? 'https://<tuo-backend>.onrender.com' // TODO: sostituire con endpoint reale
    : ''
};

window.apiFetch = function (path, options) {
  const base = window.AppConfig.API_BASE || '';
  return fetch(base + path, options);
};
