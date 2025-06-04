// public/js/footer.js

export function buildFooter() {
  // <footer>
  const footer = document.createElement('footer');

  // <div class="container">
  const container = document.createElement('div');
  container.className = 'footer-container';

  // --- Prima riga: 3 colonne ---
  const row = document.createElement('div');
  row.className = 'footer-row';

  // Colonna 1: Newsletter
  const col1 = document.createElement('div');
  col1.className = 'footer-column';
  col1.innerHTML = `
    <form class="newsletter-form">
        <div class="newsletter-title">Iscriviti alla newsletter</div>
        <div class="newsletter-subtitle">Inserisci qui la tua mail per essere notificato dei nuovi eventi futuri!</div>
        <input type="email" placeholder="La tua email" required>
        <button type="submit">Iscriviti</button>
    </form>
    `;

  // Colonna 2: Company
  const col2 = document.createElement('div');
  col2.className = 'footer-column';
  col2.innerHTML = `
    <ul class="nav flex-column">
      <li class="nav-item"><span class="footer-title">Company</span></li>
      <li class="nav-item"><a class="nav-link" href="#">About us</a></li>
      <li class="nav-item"><a class="nav-link" href="#">Job postings</a></li>
      <li class="nav-item"><a class="nav-link" href="#">News and articles</a></li>
    </ul>
  `;

  // Colonna 3: Contact & Support
  const col3 = document.createElement('div');
  col3.className = 'footer-column';
  col3.innerHTML = `
    <ul class="nav flex-column">
      <li class="nav-item"><span class="footer-title">Contact & Support</span></li>
      <li class="nav-item"><span class="nav-link"><i class="fas fa-phone"></i>+47 45 80 80 80</span></li>
      <li class="nav-item"><a class="nav-link" href="#"><i class="fas fa-comments"></i>Live chat</a></li>
      <li class="nav-item"><a class="nav-link" href="#"><i class="fas fa-envelope"></i>Contact us</a></li>
      <li class="nav-item"><a class="nav-link" href="#"><i class="fas fa-star"></i>Give feedback</a></li>
    </ul>
  `;

  row.appendChild(col1);
  row.appendChild(col2);
  row.appendChild(col3);
  container.appendChild(row);

  // --- Separatore ---
  const separator = document.createElement('hr');
  separator.className = 'footer-separator';
  container.appendChild(separator);

  // --- Seconda riga: copyright, social, quick links ---
  const botRow = document.createElement('div');
  botRow.className = 'footer-row';

  // Colonna 1: copyright
  const botCol1 = document.createElement('div');
  botCol1.className = 'footer-column';
  const spanCopyright = document.createElement('span');
  spanCopyright.className = 'copyright quick-links';
  spanCopyright.innerHTML = `Copyright &copy; Your Website ${new Date().getFullYear()}`;
  botCol1.appendChild(spanCopyright);

  // Colonna 2: social
const botCol2 = document.createElement('div');
botCol2.className = 'footer-column footer-social-column';
botCol2.innerHTML = `
  <div class="footer-social-title">Seguici anche su:</div>
  <ul class="list-inline social-buttons">
    <li class="list-inline-item">
      <a class="social-icon social-twitter" href="https://x.com/andreaperini9">
        <i class="fab fa-twitter"></i>
        <span class="tooltip">Twitter</span>
      </a>
    </li>
    <li class="list-inline-item">
      <a class="social-icon social-facebook" href="#">
        <i class="fab fa-facebook-f"></i>
        <span class="tooltip">Facebook</span>
      </a>
    </li>
    <li class="list-inline-item">
      <a class="social-icon social-linkedin" href="#">
        <i class="fab fa-linkedin-in"></i>
        <span class="tooltip">LinkedIn</span>
      </a>
    </li>
    <li class="list-inline-item">
        <a class="social-icon social-instagram" href="#">
        <i class="fab fa-instagram"></i>
        <span class="tooltip">Instagram</span>
        </a>
    </li>
  </ul>
`;

  // Colonna 3: quick links
  const botCol3 = document.createElement('div');
  botCol3.className = 'footer-column footer-legal-column';
  botCol3.innerHTML = `
    <div class="footer-legal-row">
      <a href="#" class="footer-legal-link">Privacy Policy</a>
      <span class="footer-legal-dot">&bull;</span>
      <a href="#" class="footer-legal-link">Terms of Use</a>
    </div>
    <div class="footer-legal-copyright-row">
      <span class="copyright quick-links">&copy; Dice&Drink ${new Date().getFullYear()}</span>
    </div>
  `;

  botRow.appendChild(botCol1);
  botRow.appendChild(botCol2);
  botRow.appendChild(botCol3);
  container.appendChild(botRow);

  // --- Footer finale ---
  footer.appendChild(container);
  return footer;
}
