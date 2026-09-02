const header = document.querySelector('.site-header');
const menuBtn = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
const year = document.getElementById('year');

year.textContent = new Date().getFullYear();
window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 20));
menuBtn.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.textContent = open ? '✕' : '☰';
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open');
  menuBtn.setAttribute('aria-expanded','false');
  menuBtn.textContent = '☰';
}));

const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      entry.target.classList.add('visible');
      io.unobserve(entry.target);
    }
  });
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
