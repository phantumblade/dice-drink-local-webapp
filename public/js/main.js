import { createNavbar } from './navbar.js';

document.body.prepend(createNavbar());

const content = document.createElement('div');
content.id = 'content';
document.body.appendChild(content);

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
});

const toggleTheme = () => {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  html.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
};
document
  .getElementById("theme-switch-button")
  .addEventListener("click", toggleTheme);
