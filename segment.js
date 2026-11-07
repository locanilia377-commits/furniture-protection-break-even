const form = document.querySelector('#request-form');
const prepared = document.querySelector('#prepared');
const preview = document.querySelector('#request-text');
const send = document.querySelector('#send-request');
const copy = document.querySelector('#copy-request');
const copyStatus = document.querySelector('#copy-status');
const receipt = document.querySelector('#sheet-receipt');
const sheetStatus = document.querySelector('#sheet-status');
const submit = form.querySelector('button[type=submit]');
const receiver = receipt ? document.createElement('form') : null;
if (receiver) {
  receiver.hidden = true;
  receiver.method = 'post';
  receiver.action = 'https://docs.google.com/forms/d/e/1FAIpQLScBOg86BLKFg-KPtArplruufa2VQBv8H9Yve3tt0mKRyoERHg/formResponse?hl=ru&embedded=true';
  receiver.target = receipt.name;
  document.body.append(receiver);
}

let previousRequest = '';
let pending = false;
let waitForReceipt;

function sendToSheet(segment, city, contact, details, reference) {
  const fields = {
    'entry.553146258': segment,
    'entry.933862649': city,
    'entry.2022050385': contact,
    'entry.195201112': details,
    'entry.1767454713': reference,
    fvv: '1',
    pageHistory: '0',
  };
  receiver.replaceChildren();
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    receiver.append(input);
  }
  receipt.hidden = true;
  sheetStatus.hidden = false;
  sheetStatus.textContent = 'Отправляем заявку…';
  pending = true;
  receiver.submit();
  waitForReceipt = setTimeout(() => {
    pending = false;
    submit.disabled = !prepared.hidden;
    sheetStatus.textContent = 'Подтверждение пока не загрузилось. Вы можете открыть заявку в WhatsApp.';
  }, 12000);
}

receipt?.addEventListener('load', () => {
  if (!previousRequest) return;
  clearTimeout(waitForReceipt);
  pending = false;
  submit.disabled = !prepared.hidden;
  sheetStatus.hidden = true;
  receipt.hidden = false;
});

form.addEventListener('submit', event => {
  event.preventDefault();
  if (pending) return;
  for (const field of form.querySelectorAll('input[required], textarea[required]')) {
    field.setCustomValidity(field.value.trim() ? '' : 'Заполните это поле.');
  }
  if (!form.reportValidity()) return;

  const answers = new FormData(form);
  const fingerprint = JSON.stringify([...answers]);
  prepared.hidden = false;
  submit.disabled = Boolean(receiver);
  if (fingerprint === previousRequest) return;

  const reference = 'MB-' + Array.from(crypto.getRandomValues(new Uint32Array(2)),
    word => word.toString(16).padStart(8, '0')).join('').toUpperCase();
  const city = answers.get('Город').trim();
  const contact = answers.get('Контакт для ответа')?.trim();
  answers.delete('Город');
  answers.delete('Контакт для ответа');
  const details = ['Тема — ' + form.dataset.topic];
  for (const [label, value] of answers) {
    if (value.trim()) details.push(label + ' — ' + value.trim());
  }
  const message = ['Здравствуйте! Хочу получить расчёт.', 'Город — ' + city, ...details];
  if (receiver) message.splice(1, 0, 'Номер заявки — ' + reference);
  if (contact) message.push('Контакт для ответа — ' + contact);
  preview.value = message.join('\n');
  const chat = new URL('https://wa.me/79896669887');
  chat.searchParams.set('text', preview.value);
  send.href = chat.toString();
  copyStatus.textContent = '';
  if (receiver) {
    previousRequest = fingerprint;
    sendToSheet(form.dataset.segment, city, contact ?? '', details.join('\n'), reference);
  }
  document.querySelector('#prepared-title').focus();
});

form.addEventListener('input', event => {
  event.target.setCustomValidity('');
  prepared.hidden = true;
  submit.disabled = pending;
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
  
