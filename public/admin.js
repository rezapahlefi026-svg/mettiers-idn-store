const adminDialog = document.querySelector('#admin-dialog');
const adminLogin = document.querySelector('#admin-login');
const adminDashboard = document.querySelector('#admin-dashboard');
const adminStatus = document.querySelector('#admin-status');
const adminProducts = document.querySelector('#admin-products');
const adminAdd = document.querySelector('#admin-add');
const adminFormTitle = document.querySelector('#admin-form-title');
const adminBookingHours = document.querySelector('#admin-booking-hours');
const bookingDate = new Intl.DateTimeFormat('id-ID', {
  timeZone:'Asia/Jakarta', dateStyle:'medium', timeStyle:'short',
});
const adminSearch = document.querySelector('#admin-search');
const adminPhotoFields = document.querySelector('#add-photo-fields');
let adminBusy = false;

function photoFields(container, existing = {}, required = false) {
  container.innerHTML = Object.entries(gallerySlots).map(([slot, label]) =>
    `<label>${label}${existing[slot] ? ` <img class="admin-photo-preview" src="${escapeHTML(existing[slot])}" alt="">` : ''}
      <input type="file" name="${slot === 'front' ? 'photo' : slot}" accept="image/jpeg,image/png,image/webp" ${required && slot === 'front' ? 'required' : ''}>
    </label>`).join('');
}
function openProductForm(product) {
  adminAdd.reset();
  adminAdd.dataset.id = product?.id || '';
  adminFormTitle.textContent = product ? 'Edit · ' + product.name : 'Tambah produk';
  for (const key of ['name','category','value','size','condition','flaw']) {
    if (product) adminAdd.elements[key].value = product[key];
  }
  photoFields(adminPhotoFields, product?.photos, !product);
  adminAdd.hidden = false;
  adminFormTitle.focus();
  adminAdd.scrollIntoView({block:'nearest'});
}

async function prepareProductForm(form) {
  const data = new FormData(form);
  const inputs = [...form.querySelectorAll('input[type=file]')];
  const total = inputs.reduce((size, input) => size + (input.files[0]?.size || 0), 0);
  const maxPhotoSize = total > 4 * 1024 * 1024 ? 800 * 1024 : 1024 * 1024;
  for (const input of inputs) {
    const file = input.files[0];
    if (!file) {
      data.delete(input.name);
      continue;
    }
    if (file.size <= maxPhotoSize) continue;
    let image;
    try {
      image = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, (maxPhotoSize < 1024*1024 ? 1250 : 1500) / Math.max(image.width,image.height));
      canvas.width = Math.max(1, Math.round(image.width*scale));
      canvas.height = Math.max(1, Math.round(image.height*scale));
      const context = canvas.getContext('2d');
      context.fillStyle = '#fff';
      context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(image,0,0,canvas.width,canvas.height);
      const photo = await new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',.78));
      if (!photo || photo.size > maxPhotoSize) throw new Error();
      data.set(input.name,photo,'foto-produk.jpg');
    } catch {
      throw new Error('Foto ' + file.name + ' belum bisa diperkecil. Coba gunakan JPG, PNG, atau WebP di bawah 1 MB.');
    } finally {
      image?.close();
    }
  }
  return data;
}
let adminSession;

for (const [index, [label]] of categories.entries()) {
  if (index) adminAdd.elements.category.add(new Option(label, index));
}

async function adminRequest(path, init = {}) {
  const headers = {'X-Catalog-Admin':'1'};
  if (adminSession) headers['X-Catalog-Session'] = adminSession;
  if (typeof init.body === 'string') headers['Content-Type'] = 'application/json';
  const response = await fetch(path, {...init, headers, cache:'no-store'});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Permintaan gagal. Coba lagi.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function adminView(loggedIn) {
  adminLogin.hidden = loggedIn;
  adminDashboard.hidden = !loggedIn;
  if (loggedIn) renderAdminProducts();
  else adminAdd.hidden = true;
}

function bookingNote(product) {
  if (product.bookingExpired) return '<small class="booking-note">Booking berakhir · stok tersedia kembali</small>';
  if (productStock(product) !== 'booking') return '';
  if (!product.bookingUntil) return '<small class="booking-note">Booking lama · atur tenggat</small>';
  return `<small class="booking-note">Berakhir ${bookingDate.format(product.bookingUntil)} WIB
    <span data-booking-until="${product.bookingUntil}"></span></small>`;
}

function updateBookingCountdowns() {
  const now = Date.now();
  for (const time of adminProducts.querySelectorAll('[data-booking-until]')) {
    const minutes = Math.max(0, Math.ceil((Number(time.dataset.bookingUntil) - now) / 60000));
    const label = minutes === 0 ? ' · tenggat lewat'
      : minutes >= 60 ? ` · sisa ${Math.floor(minutes/60)}j ${minutes%60}m` : ` · sisa ${minutes} menit`;
    time.textContent = label;
    time.parentElement.classList.toggle('booking-soon', minutes <= 60);
  }
}
setInterval(updateBookingCountdowns,15000);

async function saveStock(product, status) {
  await adminRequest('/api/products/' + product.id,{
    method:'PATCH',
    body:JSON.stringify({status, bookingHours:Number(adminBookingHours.value)}),
  });
  await refreshCatalog();
  adminStatus.textContent = product.name + ' · ' + stockLabels[status];
  adminProducts.querySelector(`[data-stock-id="${product.id}"]`)?.focus();
}

function renderAdminProducts() {
  if (adminDashboard.hidden) return;
  const query = adminSearch.value.trim().toLowerCase();
  adminProducts.innerHTML = products.filter(product => (product.name + ' ' + productCode(product)).toLowerCase().includes(query))
    .map(product => `<li>
    <div class="admin-item"><img src="${escapeHTML(product.photos?.front || product.photo)}" alt="" loading="lazy"><div><strong class="admin-name">${escapeHTML(product.name)}</strong><small>${productCode(product)} · ${priceLabel(product.value)}</small>${bookingNote(product)}</div></div>
    <div class="admin-row-actions">
      <select data-stock-id="${product.id}" aria-label="Status stok ${escapeHTML(product.name)}">
        ${Object.entries(stockLabels).map(([value,label]) => `<option value="${value}" ${value === productStock(product) ? 'selected' : ''}>${label}</option>`).join('')}
      </select>
      ${productStock(product) === 'booking' ? `<button type="button" data-action="deadline" data-id="${product.id}">Atur ulang tenggat</button>` : ''}
      <button type="button" data-action="edit" data-id="${product.id}">Edit</button>
      <button type="button" data-action="delete" data-id="${product.id}" aria-label="Hapus ${escapeHTML(product.name)}">Hapus</button>
    </div>
  </li>`).join('') || '<li>Tidak ada produk yang cocok.</li>';
  updateBookingCountdowns();

}

async function adminTask(button, task, {sessionRequired = true} = {}) {
  if (adminBusy) return;
  adminBusy = true;
  button.disabled = true;
  adminStatus.textContent = 'Memproses…';
  try {
    await task();
    if (adminStatus.textContent === 'Memproses…') adminStatus.textContent = '';
  } catch (error) {
    if (sessionRequired && error.status === 401) {
      adminSession = undefined;
      adminView(false);
      adminLogin.elements.password.focus();
      adminStatus.textContent = 'Sesi admin berakhir. Masuk kembali untuk melanjutkan.';
    } else {
      adminStatus.textContent = error.message;
    }
  } finally {
    button.disabled = false;
    adminBusy = false;
  }
}

document.querySelector('#admin-open').addEventListener('click', async event => {
  adminLogin.hidden = true;
  adminDashboard.hidden = true;
  adminDialog.showModal();
  if (!adminSession) {
    adminStatus.textContent = '';
    adminView(false);
    adminLogin.elements.password.focus();
    return;
  }
  await adminTask(event.currentTarget, async () => {
    try {
      await adminRequest('/api/admin/session');
      adminView(true);
      await refreshCatalog();
    } catch (error) {
      if (error.status !== 401) adminView(false);
      throw error;
    }
  });
});

document.querySelector('#admin-close').addEventListener('click', () => adminDialog.close());
document.addEventListener('catalog-updated', renderAdminProducts);

adminLogin.addEventListener('submit', event => {
  event.preventDefault();
  const password = adminLogin.elements.password.value;
  adminLogin.reset();
  adminTask(event.submitter, async () => {
    const {session} = await adminRequest('/api/admin/login', {method:'POST', body:JSON.stringify({password})});
    adminSession = session;
    adminView(true);
    await refreshCatalog();
  }, {sessionRequired:false});
});

document.querySelector('#admin-logout').addEventListener('click', () => {
  if (adminBusy) return;
  adminSession = undefined;
  adminStatus.textContent = '';
  adminAdd.reset();
  adminView(false);
  adminLogin.elements.password.focus();
});

adminSearch.addEventListener('input',renderAdminProducts);
document.querySelector('#admin-new').addEventListener('click', () => {
  if (!adminBusy) openProductForm();
});
document.querySelector('#admin-form-cancel').addEventListener('click', () => {
  if (!adminBusy) adminAdd.hidden = true;
});

adminProducts.addEventListener('change', async event => {
  const control = event.target.closest('[data-stock-id]');
  const product = products.find(item => item.id === control?.dataset.stockId);
  if (!product) return;
  const status = control.value;
  control.value = productStock(product);
  if (status === control.value || adminBusy) return;
  await adminTask(control, () => saveStock(product,status));
});

adminProducts.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button || adminBusy) return;
  const product = products.find(item => item.id === button.dataset.id);
  if (!product) return;
  if (button.dataset.action === 'deadline') {
    adminTask(button, () => saveStock(product,'booking'));
    return;
  }
  if (button.dataset.action === 'edit') {
    openProductForm(product);
    return;
  }
  if (!confirm(`Hapus “${product.name}” dari katalog?`)) return;
  adminTask(button, async () => {
    await adminRequest('/api/products/' + product.id,{method:'DELETE'});
    if (adminAdd.dataset.id === product.id) adminAdd.hidden = true;
    await refreshCatalog();
    adminStatus.textContent = 'Produk dihapus.';
  });
});

adminAdd.addEventListener('submit', event => {
  event.preventDefault();
  const id = adminAdd.dataset.id;
  adminTask(event.submitter, async () => {
    const body = await prepareProductForm(adminAdd);
    await adminRequest('/api/products' + (id ? '/' + id : ''),{method:id ? 'PUT' : 'POST',body});
    adminAdd.reset();
    adminAdd.hidden = true;
    await refreshCatalog();
    adminStatus.textContent = id ? 'Perubahan produk tersimpan.' : 'Produk baru ditambahkan.';
  });
});

if (new URLSearchParams(location.search).get("admin") === "1") document.querySelector("#admin-open").click();
