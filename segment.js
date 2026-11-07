const form = document.querySelector('#request-form');
const prepared = document.querySelector('#prepared');
const preview = document.querySelector('#request-text');
const send = document.querySelector('#send-request');
const copy = document.querySelector('#copy-request');
const copyStatus = document.querySelector('#copy-status');

form.addEventListener('submit', event => {
  event.preventDefault();
  for (const field of form.querySelectorAll('input[required], textarea[required]')) {
    field.setCustomValidity(field.value.trim() ? '' : 'Заполните это поле.');
  }
  if (!form.reportValidity()) return;

  const lines = ['Здравствуйте! Хочу получить расчёт.', 'Тема — ' + form.dataset.topic];
  for (const [label, value] of new FormData(form)) {
    if (value.trim()) lines.push(label + ' — ' + value.trim());
  }
  preview.value = lines.join('\n');
  const chat = new URL('https://wa.me/79896669887');
  chat.searchParams.set('text', preview.value);
  send.href = chat.toString();
  copyStatus.textContent = '';
  prepared.hidden = false;
  document.querySelector('#prepared-title').focus();
});

form.addEventListener('input', event => {
  event.target.setCustomValidity('');
  prepared.hidden = true;
});

copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(preview.value);
    copyStatus.textContent = 'Текст скопирован. Его можно вставить в чат.';
  } catch {
    preview.focus();
    preview.select();
    copyStatus.textContent = 'Текст выделен. Скопируйте его вручную.';
  }
});

form.hidden = false;
  
