module.exports = {
  content: [
    './public/index.html',
    './public/js/**/*.js',
    './routes/**/*.js',
    './services/**/*.js',
    './models/**/*.js',
    './middleware/**/*.js'
  ],
  css: [
    './public/css/style.css',
    './public/css/auth-modal.css',
    './public/css/dashboard.css'
  ],
  safelist: [
    /^btn-/,
    /^role-/,
    /^carousel-/,
    /^modal/,
    /^active/,
    /^show/,
    /^hidden/,
    /^fade/,
    /^nav/,
    /^dropdown/,
  ],
  output: './public/css/'
}
