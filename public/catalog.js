const categories = [
  ['Semua', ''],
  ['Kaos & Atasan', 'Rp 35.000–85.000'],
  ['Jaket & Outer', 'Rp 95.000–250.000'],
  ['Celana', 'Rp 75.000–180.000'],
  ['Koleksi Pilihan / Rare Picks', 'Rp 200.000+'],
];

const gallerySlots = {front:'Depan', back:'Belakang', side:'Samping', tryon:'Saat dipakai', detail:'Close-up / minus'};
let products = [];
let lastCatalog = '';
let selectedCategory = 0;

const filterGroup = document.querySelector('#filters');
const collection = document.querySelector('#products');
const count = document.querySelector('#count');
const priceFormat = new Intl.NumberFormat('id-ID');

const stockLabels = {available:'Tersedia (1 Stok)',booking:'Booking',sold:'Sold Out'};
const productStock = product => product.status || (product.sold ? 'sold' : 'available');
const productCode = product => 'MT-' + (product.id.startsWith('item-')
  ? product.id.slice(5).padStart(3,'0') : product.id.slice(0,8).toUpperCase());
const priceLabel = value => 'Rp ' + priceFormat.format(value);

function whatsapp(product) {
  const message = encodeURIComponent(`Halo met'tiers.idn, saya ingin pesan ${product.name} (${productCode(product)}) seharga ${priceLabel(product.value)}. Apakah masih tersedia?`);
  return 'https://wa.me/6289518164532?text=' + message;
}

function orderButton(product) {
  return productStock(product) === 'available'
    ? `<a class="order" href="${whatsapp(product)}" target="_blank" rel="noopener">Pesan via WhatsApp <span aria-hidden="true">↗</span></a>`
    : `<button class="order" disabled>${stockLabels[productStock(product)]}</button>`;
}

const search = document.querySelector('#catalog-search');
const stockFilter = document.querySelector('#catalog-stock');
const sizeFilter = document.querySelector('#catalog-size');
const sortFilter = document.querySelector('#catalog-sort');
const maxFilter = document.querySelector('#catalog-max');
const matchesSize = (size, query) => !query || size.toLowerCase().split(/[^\p{L}\p{N}]+/u).includes(query) || (query.includes(' ') && size.toLowerCase().includes(query));

function render(activeCategory) {
  selectedCategory = activeCategory;
  for (const button of filterGroup.children) {
    button.setAttribute('aria-pressed', Number(button.dataset.category) === activeCategory);
  }

  const query = search.value.trim().toLowerCase();
  const sizeQuery = sizeFilter.value.trim().toLowerCase();
  const visible = products.filter(product =>
    (!activeCategory || product.category === activeCategory)
    && (stockFilter.value === 'all' || productStock(product) === stockFilter.value)
    && (product.name + ' ' + productCode(product)).toLowerCase().includes(query)
    && matchesSize(product.size,sizeQuery)
    && (!maxFilter.value || product.value <= Number(maxFilter.value)));
  if (sortFilter.value !== 'default') visible.sort((a,b) => sortFilter.value === 'low' ? a.value-b.value : b.value-a.value);
  collection.innerHTML = visible.map((product, index) => {
    const {category,name,value,size,condition,flaw,photo,photos,illustration,id} = product;
    const status = productStock(product);
    const productUrl = '?produk=' + encodeURIComponent(id) + '#katalog';
    const front = photos?.front || photo;
    const image = `<img src="${escapeHTML(front)}" alt="${illustration && front === photo ? 'Ilustrasi ' : ''}${escapeHTML(name)}" ${index > 2 ? 'loading="lazy"' : ''}>`;
    return `<article class="product ${status === 'sold' ? 'product-sold' : ''}">
      <div class="product-image"><a class="product-gallery-button" href="${productUrl}" data-gallery="${escapeHTML(id)}" aria-label="Lihat detail ${escapeHTML(name)}">${image}<span>${Object.keys(photos || {}).length || 1} foto ↗</span></a><span class="stock ${status === 'available' ? '' : 'sold'}">${status === 'available' ? 'Hanya 1 Stok' : stockLabels[status]}</span></div>
      <div class="product-info"><div class="product-category">${categories[category][0]} · ${productCode(product)}</div><h3><a href="${productUrl}" data-gallery="${escapeHTML(id)}">${escapeHTML(name)}</a></h3><strong class="price">${priceLabel(value)}</strong>
      ${productDetails(product)}${orderButton(product)}</div></article>`;
  }).join('');
  count.textContent = visible.length ? `${visible.length} produk` : 'Tidak ada produk yang cocok.';

}

function productDetails(product) {
  return `<dl><div><dt>Ukuran</dt><dd>${escapeHTML(product.size)}</dd></div><div><dt>Kondisi</dt><dd>${escapeHTML(product.condition)}</dd></div><div><dt>Minus</dt><dd>${escapeHTML(product.flaw)}</dd></div></dl>`;
}

for (const control of [search,stockFilter,sizeFilter,sortFilter,maxFilter]) control.addEventListener('input', () => render(selectedCategory));

categories.forEach(([label, range], index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.category = index;
  button.innerHTML = `<span>${label}</span>${range ? `<small>${range}</small>` : ''}`;
  button.addEventListener('click', () => render(index));
  filterGroup.append(button);
});
function escapeHTML(value) {
  const entities = {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'};
  return String(value).replace(/[&<>"']/g, character => entities[character]);
}

async function refreshCatalog() {
  try {
    const response = await fetch('/api/products', {cache:'no-store'});
    if (!response.ok) throw new Error();
    const payload = await response.text();
    if (payload === lastCatalog) {
      if (count.textContent.startsWith('Katalog gagal')) render(selectedCategory);
      return;
    }
    products = JSON.parse(payload);
    lastCatalog = payload;
    render(selectedCategory);
    document.dispatchEvent(new Event('catalog-updated'));
    syncGallery();
  } catch {
    count.textContent = 'Katalog gagal dimuat. Silakan coba lagi.';
  }
}

render(0);
window.addEventListener('focus', refreshCatalog);
setInterval(() => { if (!document.hidden) refreshCatalog(); }, 15000);

const menu = document.querySelector('.menu');
const nav = document.querySelector('#navigation');
menu.addEventListener('click', () => {
  const isOpen = menu.getAttribute('aria-expanded') === 'true';
  menu.setAttribute('aria-expanded', String(!isOpen));
});
nav.addEventListener('click', (event) => {
  if (event.target.closest('a')) menu.setAttribute('aria-expanded', 'false');
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    menu.setAttribute('aria-expanded', 'false');
    menu.focus();
  }
});

const productGallery = document.querySelector('#product-gallery');
const galleryImage = document.querySelector('#gallery-photo');
const galleryTitle = document.querySelector('#product-gallery-title');
const galleryCaption = document.querySelector('#gallery-caption');
const galleryThumbs = document.querySelector('#gallery-thumbs');

let detailId;
const info = document.querySelector('#gallery-info');
const shareStatus = document.querySelector('#gallery-share-status');

collection.addEventListener('click', event => {
  const trigger = event.target.closest('[data-gallery]');
  if (!trigger || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  history.pushState(null,'',trigger.getAttribute('href'));
  syncGallery();
});

function syncGallery() {
  const id = new URLSearchParams(location.search).get('produk');
  const product = products.find(item => item.id === id);
  if (!product) {
    if (productGallery.open) productGallery.close();
    if (id) count.textContent = 'Produk pada tautan ini sudah tidak tersedia.';
    return;
  }
  const status = productStock(product);
  info.innerHTML = `<p><strong>${priceLabel(product.value)}</strong> · ${productCode(product)} · ${stockLabels[status]}</p>
    ${productDetails(product)}${orderButton(product)}`;
  if (productGallery.open && detailId === id) return;
  detailId = id;
  shareStatus.textContent = '';
  galleryTitle.textContent = product.name;
  galleryThumbs.replaceChildren();
  for (const [slot, label] of Object.entries(gallerySlots)) {
    const url = (product.photos || {front:product.photo})[slot];
    if (!url) continue;
    const option = document.createElement('button');
    option.type = 'button';
    option.innerHTML = `<img src="${escapeHTML(url)}" alt=""><span>${label}</span>`;
    option.addEventListener('click', () => {
      for (const button of galleryThumbs.children) button.setAttribute('aria-pressed', String(button === option));
      galleryImage.src = url;
      galleryImage.alt = product.name + ' · ' + label;
      galleryCaption.textContent = label;
    });
    galleryThumbs.append(option);
  }
  galleryThumbs.firstElementChild?.click();
  if (!productGallery.open) productGallery.showModal();
}
productGallery.querySelector('.admin-head button').addEventListener('click', () => productGallery.close());

productGallery.addEventListener('close', () => {
  const url = new URL(location.href);
  if (!url.searchParams.has('produk') || url.searchParams.get('produk') !== detailId) return;
  url.searchParams.delete('produk');
  history.replaceState(null,'',url);
});
document.querySelector('#gallery-share').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    shareStatus.textContent = 'Tautan disalin.';
  } catch {
    shareStatus.textContent = 'Salin tautan dari bilah alamat browser.';
  }
});
window.addEventListener('popstate', syncGallery);
refreshCatalog();
