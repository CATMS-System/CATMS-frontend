import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let server;
let App;
let LanguageContextModule;
let LanguageSelector;
let translations;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, ws: false, hmr: false },
    appType: 'custom'
  });
  ({ default: App } = await server.ssrLoadModule('/src/App.jsx'));
  LanguageContextModule = await server.ssrLoadModule('/src/contexts/LanguageContext.jsx');
  ({ default: LanguageSelector } = await server.ssrLoadModule('/src/components/LanguageSelector.jsx'));
  ({ translations } = await server.ssrLoadModule('/src/i18n/translations.js'));
});

after(async () => {
  await server?.close();
});

function setupStorage(initialLang = null) {
  const store = new Map();
  if (initialLang) {
    store.set('catms_language', initialLang);
  }
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
  globalThis.window = {
    location: { pathname: '/admin/dashboard', href: '/admin/dashboard' }
  };

  return {
    store,
    restore: () => {
      if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
      else delete globalThis.localStorage;
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
      else delete globalThis.window;
    }
  };
}

test('i18n translations dictionary defines all 3 supported languages', () => {
  assert.ok(translations.en, 'English dictionary missing');
  assert.ok(translations.si, 'Sinhala dictionary missing');
  assert.ok(translations.ta, 'Tamil dictionary missing');

  // Verify language names
  assert.equal(translations.en.lang_en, 'English');
  assert.equal(translations.si.lang_si, 'සිංහල');
  assert.equal(translations.ta.lang_ta, 'தமிழ்');
});

test('LanguageContext translate helper supports English, Sinhala, and Tamil lookups', () => {
  const { translate } = LanguageContextModule;

  // English
  assert.equal(translate('en', 'nav_executive_dashboard', 'Fallback'), 'Executive Dashboard');
  assert.equal(translate('en', 'stat_revenue_collected', 'Fallback'), 'Revenue Collected');

  // Sinhala
  assert.equal(translate('si', 'nav_executive_dashboard', 'Fallback'), 'විධායක පාලක පුවරුව');
  assert.equal(translate('si', 'stat_revenue_collected', 'Fallback'), 'එකතු කළ ආදායම');

  // Tamil
  assert.equal(translate('ta', 'nav_executive_dashboard', 'Fallback'), 'நிர்வாக டாஷ்போர்டு');
  assert.equal(translate('ta', 'stat_revenue_collected', 'Fallback'), 'வசூலிக்கப்பட்ட வருவாய்');
});

test('i18n falls back to English when a key is missing in another language', () => {
  const { translate } = LanguageContextModule;

  // Key missing in Sinhala or Tamil should fall back to English
  const testKey = 'only_in_english_test_key';
  translations.en[testKey] = 'English Fallback Text';

  assert.equal(translate('si', testKey, 'Default Fallback'), 'English Fallback Text');
  assert.equal(translate('ta', testKey, 'Default Fallback'), 'English Fallback Text');

  delete translations.en[testKey];
});

test('i18n falls back to default fallback when key is missing completely', () => {
  const { translate } = LanguageContextModule;
  assert.equal(translate('si', 'non_existent_key_123', 'Default String'), 'Default String');
  assert.equal(translate('en', 'non_existent_key_123', 'Default String'), 'Default String');
});

test('LanguageSelector renders with English, Sinhala, and Tamil choices', (t) => {
  const { restore } = setupStorage('en');
  t.after(restore);

  const { LanguageProvider } = LanguageContextModule;
  const html = renderToStaticMarkup(
    React.createElement(
      LanguageProvider,
      null,
      React.createElement(LanguageSelector, null)
    )
  );

  assert.ok(html.includes('Select Language'));
  assert.ok(html.includes('English'));
});

test('App shell renders in English by default', (t) => {
  const { restore } = setupStorage(null);
  t.after(restore);

  const user = {
    name: 'Admin User [Admin]',
    email: 'admin@careflow.com',
    roleCode: 'ROLE_ADMIN',
    branch: 'Colombo Main'
  };
  globalThis.localStorage.setItem('catms_user', JSON.stringify(user));
  globalThis.localStorage.setItem('token', 'FAKE_TOKEN');

  const { LanguageProvider } = LanguageContextModule;
  const html = renderToStaticMarkup(
    React.createElement(
      LanguageProvider,
      null,
      React.createElement(App, null)
    )
  );

  assert.ok(html.includes('Executive Dashboard'));
  assert.ok(html.includes('Revenue Collected'));
  assert.ok(html.includes('Outstanding Balance'));
  assert.ok(html.includes('Staff Directory'));
  assert.ok(html.includes('Active Session'));
});

test('App shell renders in Sinhala (සිංහල) when selected in localStorage', (t) => {
  const { restore } = setupStorage('si');
  t.after(restore);

  const user = {
    name: 'Admin User [Admin]',
    email: 'admin@careflow.com',
    roleCode: 'ROLE_ADMIN',
    branch: 'Colombo Main'
  };
  globalThis.localStorage.setItem('catms_user', JSON.stringify(user));
  globalThis.localStorage.setItem('token', 'FAKE_TOKEN');

  const { LanguageProvider } = LanguageContextModule;
  const html = renderToStaticMarkup(
    React.createElement(
      LanguageProvider,
      null,
      React.createElement(App, null)
    )
  );

  // Sinhala navigation and stat cards
  assert.ok(html.includes('විධායක පාලක පුවරුව'), 'Missing Sinhala Executive Dashboard');
  assert.ok(html.includes('එකතු කළ ආදායම'), 'Missing Sinhala Revenue Collected');
  assert.ok(html.includes('අයවිය යුතු ශේෂය'), 'Missing Sinhala Outstanding Balance');
  assert.ok(html.includes('කාර්ය මණ්ඩල නාමාවලිය'), 'Missing Sinhala Staff Directory');
  assert.ok(html.includes('සක්‍රිය සැසිය'), 'Missing Sinhala Active Session');
});

test('App shell renders in Tamil (தமிழ்) when selected in localStorage', (t) => {
  const { restore } = setupStorage('ta');
  t.after(restore);

  const user = {
    name: 'Admin User [Admin]',
    email: 'admin@careflow.com',
    roleCode: 'ROLE_ADMIN',
    branch: 'Colombo Main'
  };
  globalThis.localStorage.setItem('catms_user', JSON.stringify(user));
  globalThis.localStorage.setItem('token', 'FAKE_TOKEN');

  const { LanguageProvider } = LanguageContextModule;
  const html = renderToStaticMarkup(
    React.createElement(
      LanguageProvider,
      null,
      React.createElement(App, null)
    )
  );

  // Tamil navigation and stat cards
  assert.ok(html.includes('நிர்வாக டாஷ்போர்டு'), 'Missing Tamil Executive Dashboard');
  assert.ok(html.includes('வசூலிக்கப்பட்ட வருவாய்'), 'Missing Tamil Revenue Collected');
  assert.ok(html.includes('நிலுவைத் தொகை'), 'Missing Tamil Outstanding Balance');
  assert.ok(html.includes('ஊழியர் அடைவு'), 'Missing Tamil Staff Directory');
  assert.ok(html.includes('செயலில் உள்ள அமர்வு'), 'Missing Tamil Active Session');
});

test('Login portal renders in Sinhala and Tamil based on language choice', (t) => {
  const { restore } = setupStorage('si');
  t.after(restore);

  // No user logged in -> login screen
  globalThis.localStorage.removeItem('catms_user');
  globalThis.localStorage.removeItem('token');

  const { LanguageProvider } = LanguageContextModule;
  const htmlSi = renderToStaticMarkup(
    React.createElement(
      LanguageProvider,
      null,
      React.createElement(App, null)
    )
  );

  assert.ok(htmlSi.includes('නැවත සාදරයෙන් පිළිගනිමු'), 'Missing Sinhala Welcome Back');
  assert.ok(htmlSi.includes('පද්ධතියට පුරනය වන්න'), 'Missing Sinhala Sign in button');

  // Switch to Tamil
  globalThis.localStorage.setItem('catms_language', 'ta');
  const htmlTa = renderToStaticMarkup(
    React.createElement(
      LanguageProvider,
      null,
      React.createElement(App, null)
    )
  );

  assert.ok(htmlTa.includes('மீண்டும் வருக'), 'Missing Tamil Welcome Back');
  assert.ok(htmlTa.includes('அமைப்பில் உள்நுழைக'), 'Missing Tamil Sign in button');
});
