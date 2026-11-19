const slides = [...document.querySelectorAll('.hero-photo')];
const controls = document.querySelector('.hero-controls');
const dots = [...controls.querySelectorAll('.hero-dot')];
const toggle = controls.querySelector('.hero-toggle');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const slideDuration = 5000;
let current = 0;
let timer;
let playing = !reducedMotion.matches;

function showSlide(index) {
  slides[current].classList.remove('is-active');
  dots[current].removeAttribute('aria-current');
  current = index;
  slides[current].classList.add('is-active');
  dots[current].setAttribute('aria-current', 'true');
}

function scheduleSlide() {
  clearInterval(timer);
  if (playing && !document.hidden) {
    timer = setInterval(() => showSlide((current + 1) % slides.length), slideDuration);
  }
}

function setPlaying(value) {
  playing = value;
  toggle.textContent = playing ? 'Ⅱ' : '▶';
  toggle.setAttribute('aria-label', playing ? 'Jeda slideshow' : 'Putar slideshow');
  scheduleSlide();
}

dots.forEach((dot, index) => {
  dot.addEventListener('click', () => {
    showSlide(index);
    scheduleSlide();
  });
});
toggle.addEventListener('click', () => setPlaying(!playing));
document.addEventListener('visibilitychange', scheduleSlide);
reducedMotion.addEventListener('change', event => setPlaying(!event.matches));
controls.hidden = false;
setPlaying(playing);
