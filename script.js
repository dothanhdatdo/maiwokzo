const RESTAURANT = {
  name: "Maiwok Zo Freiburg",
  phoneDisplay: "0761 89730160",
  phone: "+4976189730160",
  whatsapp: "491773943060",
  email: "maiwokzo@gmail.com",
  timezone: "Europe/Berlin"
};

// Zeiten hier ändern (Uhrzeit im Format "HH:MM", Tage: 1 = Montag ... 7 = Sonntag). Jede Zeile ist ein Zeitfenster.
// Bestellzeiten: wann online bestellt werden kann. Überschneiden sich die Zeiten, sind beide Karten bestellbar.
const LUNCH_HOURS = [
  { days: [1, 2, 3, 4, 5], start: "07:00", end: "17:00" }
];
const DINNER_HOURS = [
  { days: [1, 2, 3, 4, 5], start: "16:00", end: "22:00" },
  { days: [6], start: "07:00", end: "22:00" }
];
// Abholzeiten: wann die Bestellung abgeholt werden kann ("end" ist die letzte mögliche Abholzeit).
// Enthält der Warenkorb ein Gericht der Speisekarte, gilt die Abholzeit der Speisekarte.
const LUNCH_PICKUP = [
  { days: [1, 2, 3, 4, 5], start: "11:00", end: "16:59" }
];
const DINNER_PICKUP = [
  { days: [1, 2, 3, 4, 5], start: "17:00", end: "21:00" },
  { days: [6], start: "11:00", end: "21:00" }
];
// Manuell umschalten: "auto" = nach Uhrzeit, "mittag" = nur Mittagsmenü, "abend" = nur Speisekarte.
const MENU_MODE = "auto";
const LUNCH_HOURS_TEXT = hoursText(LUNCH_HOURS);
const DINNER_HOURS_TEXT = hoursText(DINNER_HOURS);
const LUNCH_PICKUP_TEXT = hoursText(LUNCH_PICKUP);
const DINNER_PICKUP_TEXT = hoursText(DINNER_PICKUP);

const EMAIL_ENDPOINT = "";
// Bestellnummern: Mit ORDER_ENDPOINT (Google Apps Script, siehe server/google-apps-script/ANLEITUNG.md)
// fortlaufend pro Tag ab 100 und jede Bestellung landet in der Google-Tabelle.
// Ohne ORDER_ENDPOINT: zufällig aus ORDER_NUMBER. Ist der Server nicht erreichbar: Ersatznummer aus ORDER_NUMBER_FALLBACK.
const ORDER_ENDPOINT = "";
const ORDER_NUMBER = { min: 100, max: 120 };
const ORDER_NUMBER_FALLBACK = { min: 900, max: 999 };
const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const MENU_PAGE_SIZE = 8;
const state = {
  cart: JSON.parse(sessionStorage.getItem("maiWokCart") || "[]"),
  filter: "alle",
  category: "Empfohlen",
  lunchCategory: "Box to go",
  dinnerPage: 1,
  lunchPage: 1,
  sauceChoice: {},
  quickRows: [],
  quickMode: ""
};

// Herkunft merken: QR-Code auf der Mitnahme-Karte öffnet die Seite mit ?ref=tuete
const ORDER_SOURCES = { tuete: "QR-Code Mitnahme-Karte" };
const ORDER_SOURCE = (() => {
  let ref = "";
  try { ref = (new URLSearchParams(location.search).get("ref") || "").toLowerCase(); } catch (e) {}
  try {
    if (ORDER_SOURCES[ref]) sessionStorage.setItem("maiWokSource", ref);
    else ref = sessionStorage.getItem("maiWokSource") || "";
  } catch (e) {}
  return ORDER_SOURCES[ref] ? ref : "";
})();

function trackEvent(path, title) {
  try {
    if (window.goatcounter && typeof window.goatcounter.count === "function") {
      window.goatcounter.count({ path, title, event: true });
    }
  } catch (e) {}
}

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
let motionObserver;

document.addEventListener("DOMContentLoaded", () => {
  initPageIntro();
  initNavigation();
  initMenus();
  initCart();
  initQuickOrder();
  initForms();
  initGallery();
  initLazyEmbeds();
  initHeroTilt();
  setDefaultDates();
  initMotion();
  document.body.classList.add("page-ready");
});

function initPageIntro() {
  const curtain = $(".intro-curtain");
  const finish = () => document.body.classList.add("intro-complete");
  if (!curtain || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finish();
    return;
  }
  const onIntroEnd = (event) => {
    if (event.animationName !== "intro-exit") return;
    curtain.removeEventListener("animationend", onIntroEnd);
    finish();
  };
  curtain.addEventListener("animationend", onIntroEnd);
  window.setTimeout(finish, 3200);
}

function initNavigation() {
  const toggle = $("[data-nav-toggle]");
  const nav = $("[data-nav]");
  const header = $(".site-header");
  if (header && "IntersectionObserver" in window) {
    const sentinel = document.createElement("span");
    sentinel.className = "scroll-sentinel";
    document.body.prepend(sentinel);
    new IntersectionObserver(([entry]) => {
      header.classList.toggle("is-scrolled", !entry.isIntersecting);
    }, { rootMargin: "-12px 0px 0px 0px" }).observe(sentinel);
  }
  toggle?.addEventListener("click", () => {
    const open = !nav.classList.contains("open");
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });
  $$(".main-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      nav?.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
    });
  });
}

function initMenus() {
  buildLunchTabs();
  buildCategoryTabs();
  updateMenuAvailability();
  setInterval(updateMenuAvailability, 60_000);
  $$(".chip").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".chip").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.filter = button.dataset.filter;
      state.dinnerPage = 1;
      renderDinnerMenu();
    });
  });
}

function buildLunchTabs() {
  const tabs = $("#lunchCategoryTabs");
  if (!tabs) return;
  const allCategories = [...new Set(lunchMenu.map((item) => lunchCategoryFor(item)))];
  const categories = ["Box to go", "Beliebt", ...allCategories.filter((category) => category !== "Box to go")];
  tabs.innerHTML = categories.map((category) => (
    `<button class="${category === state.lunchCategory ? "active" : ""}" type="button" data-lunch-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`
  )).join("");
  $$("button", tabs).forEach((button) => {
    button.addEventListener("click", () => {
      $$("button", tabs).forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.lunchCategory = button.dataset.lunchCategory;
      state.lunchPage = 1;
      updateMenuAvailability();
    });
  });
}

function buildCategoryTabs() {
  const tabs = $("#categoryTabs");
  if (!tabs) return;
  const categories = ["Empfohlen", "Alle Kategorien", ...new Set(dinnerMenu.map((item) => item.category))];
  tabs.innerHTML = categories.map((category) => (
    `<button class="${category === state.category ? "active" : ""}" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`
  )).join("");
  $$("button", tabs).forEach((button) => {
    button.addEventListener("click", () => {
      $$("button", tabs).forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.category = button.dataset.category;
      state.dinnerPage = 1;
      renderDinnerMenu();
    });
  });
}

function renderDinnerMenu(open = isDinnerOpenNow()) {
  const grid = $("#dinnerGrid");
  if (!grid) return;
  const items = dinnerMenu.filter((item) => {
    const filterMatch = state.filter === "alle" || item.tags.includes(state.filter);
    const categoryMatch = state.category === "Empfohlen"
      ? item.tags.includes("beliebt")
      : state.category === "Alle Kategorien" || item.category === state.category;
    return filterMatch && categoryMatch;
  });
  const cardOptions = open ? {} : { disabled: true, buttonText: closedButtonText(DINNER_HOURS) };
  const pageData = paginateItems(items, state.dinnerPage);
  state.dinnerPage = pageData.page;
  grid.innerHTML = pageData.items.length ? pageData.items.map((item) => menuCard(item, cardOptions)).join("") : emptyMenu("Keine Gerichte für diese Auswahl gefunden.");
  renderMenuPager("#dinnerPager", pageData, "dinner");
  bindAddButtons(grid);
  observeMotionElements(grid);
}

function updateMenuAvailability() {
  const lunchOpen = isLunchOpenNow();
  const dinnerOpen = isDinnerOpenNow();
  const section = $("[data-lunch-section]");
  const lunchBadge = $("[data-lunch-badge]");
  const lunchMessage = $("[data-lunch-message]");
  const dinnerBadge = $("[data-dinner-badge]");
  const dinnerMessage = $("[data-dinner-message]");

  if (section) section.hidden = false;
  $$("[data-lunch-nav]").forEach((link) => { link.hidden = false; });
  if (lunchBadge) {
    lunchBadge.textContent = lunchOpen ? "Mittag jetzt bestellbar" : closedBadgeText(LUNCH_HOURS);
    lunchBadge.classList.toggle("closed", !lunchOpen);
  }
  if (lunchMessage) {
    lunchMessage.textContent = lunchOpen
      ? `Das Mittagsmenü ist jetzt bestellbar. Abholung ${LUNCH_PICKUP_TEXT}.`
      : `Das Mittagsmenü bleibt sichtbar. Bestellen können Sie ${LUNCH_HOURS_TEXT}, Abholung ${LUNCH_PICKUP_TEXT}.`;
  }
  if (dinnerBadge) {
    dinnerBadge.textContent = dinnerOpen ? "Speisekarte jetzt bestellbar" : closedBadgeText(DINNER_HOURS);
    dinnerBadge.classList.toggle("closed", !dinnerOpen);
  }
  if (dinnerMessage) {
    dinnerMessage.textContent = dinnerOpen
      ? `Die Speisekarte ist jetzt bestellbar. Abholung ${DINNER_PICKUP_TEXT}.`
      : `Die Speisekarte bleibt sichtbar. Bestellen können Sie ${DINNER_HOURS_TEXT}, Abholung ${DINNER_PICKUP_TEXT}.`;
  }
  renderLunchMenu(lunchOpen);
  renderDinnerMenu(dinnerOpen);
  renderQuickResults();
  updateLiveStatus();
  renderPopular();
  renderCart();
}

function renderLunchMenu(open = isLunchOpenNow()) {
  const grid = $("#lunchGrid");
  if (!grid) return;
  const items = lunchMenu.filter((item) => {
    const category = lunchCategoryFor(item);
    return state.lunchCategory === "Beliebt" ? item.tags.includes("beliebt") : category === state.lunchCategory;
  });
  const cardOptions = open ? {} : { disabled: true, buttonText: closedButtonText(LUNCH_HOURS) };
  const pageData = paginateItems(items, state.lunchPage);
  state.lunchPage = pageData.page;
  grid.innerHTML = pageData.items.length ? pageData.items.map((item) => menuCard(item, cardOptions)).join("") : emptyMenu("Keine Mittagsgerichte für diese Auswahl gefunden.");
  renderMenuPager("#lunchPager", pageData, "lunch");
  bindAddButtons(grid);
  observeMotionElements(grid);
}

// Live-Status im Hero: was gerade bestellbar ist bzw. wann es wieder losgeht.
function nextOrderStart(now = getBerlinParts()) {
  const nowMinutes = now.hour * 60 + now.minute;
  for (let offset = 0; offset < 8; offset += 1) {
    const weekday = ((now.weekday - 1 + offset) % 7) + 1;
    const starts = [...LUNCH_HOURS, ...DINNER_HOURS]
      .filter((slot) => slot.days.includes(weekday))
      .map((slot) => toMinutes(slot.start))
      .filter((start) => offset > 0 || start > nowMinutes)
      .sort((a, b) => a - b);
    if (starts.length) {
      const time = `${String(Math.floor(starts[0] / 60)).padStart(2, "0")}:${String(starts[0] % 60).padStart(2, "0")}`;
      const day = offset === 0 ? "heute" : offset === 1 ? "morgen" : WEEKDAY_SHORT[weekday];
      return `${day} ab ${time} Uhr`;
    }
  }
  return "";
}

function updateLiveStatus() {
  const wrap = $("[data-live-status]");
  const text = $("[data-live-text]");
  if (!wrap || !text) return;
  const lunch = isLunchOpenNow();
  const dinner = isDinnerOpenNow();
  const until = (slots) => todaySlot(slots)?.end;
  if (lunch && dinner) text.textContent = "Mittag & Speisekarte jetzt bestellbar";
  else if (lunch) text.textContent = `Mittagsmenü jetzt bestellbar · bis ${until(LUNCH_HOURS)} Uhr`;
  else if (dinner) text.textContent = `Speisekarte jetzt bestellbar · bis ${until(DINNER_HOURS)} Uhr`;
  else text.textContent = `Online-Bestellung wieder ${nextOrderStart()}`;
  wrap.classList.toggle("is-closed", !lunch && !dinner);
  const veggie = [...lunchMenu, ...dinnerMenu].filter((item) => item.tags.includes("vegetarisch") || item.tags.includes("vegan")).length;
  const count = $("[data-veggie-count]");
  if (count) count.textContent = `${Math.floor(veggie / 10) * 10}+`;
}

// "Beliebt in Freiburg": Gerichte mit Foto aus der gerade bestellbaren Karte, beliebte zuerst.
function renderPopular() {
  const track = $("[data-popular]");
  if (!track) return;
  const lunch = isLunchOpenNow();
  const dinner = isDinnerOpenNow();
  const pool = lunch && !dinner ? lunchMenu : dinner && !lunch ? dinnerMenu : [...dinnerMenu, ...lunchMenu];
  const items = pool
    .filter((item) => item.image && item.image !== logoImage)
    .sort((a, b) => Number(b.tags.includes("beliebt")) - Number(a.tags.includes("beliebt")))
    .slice(0, 10);
  const section = track.closest(".popular");
  if (section) section.hidden = items.length < 3;
  track.innerHTML = items.map((item) => {
    const open = isItemOrderableNow(item.id);
    return `
      <article class="popular-card">
        <img src="${escapeHtml(thumbOf(item.image))}" alt="${escapeHtml(item.name)}" width="640" height="480" loading="lazy" decoding="async">
        <div class="popular-body">
          <span class="code">${escapeHtml(shortCode(item))}</span>
          <h3>${escapeHtml(displayName(item))}</h3>
          <div class="popular-foot">
            <strong class="price">${euro.format(item.price)}</strong>
            <button class="popular-add" type="button" data-popular-add="${escapeHtml(item.id)}" ${open ? "" : "disabled"} aria-label="${escapeHtml(item.name)} in den Warenkorb">${item.sauces ? "Sauce wählen" : "+"}</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
  $$("[data-popular-add]", track).forEach((button) => {
    button.addEventListener("click", () => {
      const item = findItem(button.dataset.popularAdd);
      if (item.sauces) {
        const input = $("#quickSearch");
        input.value = shortCode(item);
        input.dispatchEvent(new Event("input"));
        $("#schnellbestellung").scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      addToCart(item.id, button);
    });
  });
}

function paginateItems(items, requestedPage) {
  const totalPages = Math.max(1, Math.ceil(items.length / MENU_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * MENU_PAGE_SIZE;
  return {
    items: items.slice(start, start + MENU_PAGE_SIZE),
    totalItems: items.length,
    totalPages,
    page,
    start: items.length ? start + 1 : 0,
    end: Math.min(start + MENU_PAGE_SIZE, items.length)
  };
}

function renderMenuPager(selector, pageData, target) {
  const pager = $(selector);
  if (!pager) return;
  if (pageData.totalItems <= MENU_PAGE_SIZE) {
    pager.innerHTML = pageData.totalItems
      ? `<span>${pageData.totalItems} Gerichte</span>`
      : "";
    return;
  }
  pager.innerHTML = `
    <button type="button" data-page-target="${target}" data-page-action="prev" ${pageData.page === 1 ? "disabled" : ""}>Zurück</button>
    <span>${pageData.start}-${pageData.end} von ${pageData.totalItems} Gerichten | Seite ${pageData.page}/${pageData.totalPages}</span>
    <button type="button" data-page-target="${target}" data-page-action="next" ${pageData.page === pageData.totalPages ? "disabled" : ""}>Weiter</button>
  `;
  $$("button", pager).forEach((button) => {
    button.addEventListener("click", () => {
      changeMenuPage(button.dataset.pageTarget, button.dataset.pageAction);
    });
  });
}

function changeMenuPage(target, action) {
  const delta = action === "next" ? 1 : -1;
  const menuPanel = target === "lunch"
    ? $("#mittagsmenu .menu-panel")
    : $("#menu .menu-panel");

  if (target === "lunch") {
    state.lunchPage += delta;
    renderLunchMenu();
  } else {
    state.dinnerPage += delta;
    renderDinnerMenu();
  }

  window.requestAnimationFrame(() => {
    menuPanel?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
  });
}

function lunchCategoryFor(item) {
  if (item.category) return item.category;
  if (item.id.startsWith("LD")) return "Getränke";
  if (item.id.startsWith("B")) return "Box to go";
  const code = Number.parseInt(item.code, 10);
  if (Number.isNaN(code)) return "Weitere";
  if (code <= 19) return "Suppen & Snacks";
  if (code < 30) return "Chop Suey";
  if (code < 40) return "Süß-Sauer";
  if (code < 50) return "Erdnuss";
  if (code < 60) return "Red Curry";
  if (code < 70) return "Mango";
  if (code < 80) return "Spezial";
  if (code < 100) return "Vegetarisch";
  return "Weitere";
}

function menuCard(item, options = {}) {
  const tags = item.tags.map((tag) => `<span class="tag">${tagLabel(tag)}</span>`).join("");
  const disabled = options.disabled ? "disabled" : "";
  const buttonText = options.buttonText || "In den Warenkorb";
  return `
    <article class="menu-card">
      ${item.image && item.image !== logoImage ? `<img class="menu-card-image" src="${escapeHtml(thumbOf(item.image))}" alt="${escapeHtml(item.name)}" width="640" height="480" loading="lazy" decoding="async">` : ""}
      <div class="menu-card-body">
        <div class="menu-card-top">
          <span class="code">${escapeHtml(item.code || item.id)}</span>
          <span class="price">${euro.format(item.price)}</span>
        </div>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description || "")}</p>
        <div class="tag-row">${tags}</div>
        <span class="allergens">Zusatzstoffe/Allergene: ${escapeHtml(item.allergens || "Bitte im Restaurant erfragen")}</span>
        ${item.sauces ? saucePicker(item, disabled) : ""}
        <button class="btn btn-gold" type="button" data-add="${escapeHtml(item.id)}" ${disabled}>${escapeHtml(buttonText)}</button>
      </div>
    </article>
  `;
}

function saucePicker(item, disabled, { name = `sauce-${item.id}`, chosen = state.sauceChoice[item.id], attr = `data-sauce-picker="${escapeHtml(item.id)}"` } = {}) {
  const options = item.sauces.map((sauce) => `
    <label class="sauce-option">
      <input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(sauce)}" ${sauce === chosen ? "checked" : ""} ${disabled}>
      <span>${escapeHtml(sauce)}</span>
    </label>`).join("");
  return `
    <fieldset class="sauce-picker" ${attr}>
      <legend>Sauce wählen</legend>
      <div class="sauce-options">${options}</div>
      <p class="sauce-hint" role="alert" hidden>Bitte zuerst eine Sauce wählen.</p>
    </fieldset>
  `;
}

function emptyMenu(message) {
  return `<div class="cart-empty">${escapeHtml(message)}</div>`;
}

function tagLabel(tag) {
  return { vegetarisch: "Vegetarisch", vegan: "Vegan", scharf: "Scharf", beliebt: "Beliebt" }[tag] || tag;
}

function bindAddButtons(scope = document) {
  $$("[data-sauce-picker]", scope).forEach((picker) => {
    picker.addEventListener("change", (event) => {
      state.sauceChoice[picker.dataset.saucePicker] = event.target.value;
      picker.classList.remove("needs-choice");
      $(".sauce-hint", picker).hidden = true;
    });
  });
  $$("[data-add]", scope).forEach((button) => {
    if (button.disabled) return;
    button.onclick = () => {
      const id = button.dataset.add;
      const picker = button.closest(".menu-card")?.querySelector("[data-sauce-picker]");
      if (picker && !state.sauceChoice[id]) {
        picker.classList.remove("needs-choice");
        void picker.offsetWidth;
        picker.classList.add("needs-choice");
        $(".sauce-hint", picker).hidden = false;
        $("input", picker)?.focus();
        return;
      }
      addToCart(id, button, picker ? state.sauceChoice[id] : "");
    };
  });
}

function findCartItem(id) {
  return state.cart.find((cartItem) => cartItem.id === id);
}

// Gerichte mit "Sauce nach Wahl": jede Portion hat ihre eigene Sauce (cartItem.sauces, Länge = qty).
function normalizeSauces(cartItem) {
  const item = findItem(cartItem.id);
  if (!item?.sauces) return;
  const sauces = Array.isArray(cartItem.sauces) ? cartItem.sauces.slice(0, cartItem.qty) : [];
  while (sauces.length < cartItem.qty) sauces.push("");
  cartItem.sauces = sauces.map((sauce) => (item.sauces.includes(sauce) ? sauce : ""));
}

function missingSauce(cartItem) {
  const item = findItem(cartItem.id);
  return Boolean(item?.sauces) && cartItem.sauces.some((sauce) => !sauce);
}

function sauceSummary(cartItem) {
  const counts = new Map();
  cartItem.sauces.forEach((sauce) => counts.set(sauce, (counts.get(sauce) || 0) + 1));
  if (cartItem.qty === 1) return `Sauce: ${cartItem.sauces[0]}`;
  return `Saucen: ${[...counts].map(([sauce, count]) => `${count}x ${sauce}`).join(", ")}`;
}

// Gericht mit Größe (Box to go B1-B5: Klein/Groß/Mega) anzeigen, z. B. "Bratnudeln mit Gemüse und Ei (Klein)".
// Kleine Vorschaubilder (640 px) für Karten und Galerie; das große Bild nur in der Galerie-Ansicht.
function thumbOf(src) {
  return src.replace("assets/images/dish-", "assets/images/thumbs/dish-");
}

function displayName(item) {
  return item.size ? `${item.name} (${item.size})` : item.name;
}

// Suchkürzel: Code plus Anfangsbuchstabe der Größe, z. B. "B1K" für B1 Klein.
function shortCode(item) {
  return item.size ? `${item.code}${item.size[0]}` : item.code;
}

function findItem(id) {
  return [...lunchMenu, ...dinnerMenu].find((item) => item.id === id);
}

function addToCart(id, trigger, sauce = "") {
  const item = findItem(id);
  if (!item) return;
  if (item.sauces && !item.sauces.includes(sauce)) return;
  if (!isItemOrderableNow(id)) {
    showNotice($("#orderNotice"), unavailableMessage(id), true);
    return;
  }
  const existing = findCartItem(id);
  if (existing) {
    existing.qty += 1;
    if (item.sauces) existing.sauces.push(sauce);
  } else {
    state.cart.push(item.sauces ? { id, qty: 1, note: "", sauces: [sauce] } : { id, qty: 1, note: "" });
  }
  persistCart();
  renderCart();
  animateAddButton(trigger);
  bumpCartCount();
}

function initCart() {
  state.cart = state.cart.filter((cartItem) => findItem(cartItem.id));
  persistCart();
  renderCart();
  $$("[data-open-cart]").forEach((button) => button.addEventListener("click", openCart));
  $$("[data-close-cart], [data-close-cart-link]").forEach((button) => button.addEventListener("click", closeCart));
  $("[data-cart-backdrop]")?.addEventListener("click", closeCart);
  $$("[data-goto-checkout]").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    goToCheckout();
  }));
  const form = $("#orderForm");
  if (form && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      state.checkoutInView = entry.isIntersecting;
      updateCheckoutBar();
    }, { threshold: 0.15 }).observe(form);
  }
  $("[data-clear-cart]")?.addEventListener("click", () => {
    state.cart = [];
    persistCart();
    renderCart();
  });
}

function openCart() {
  $("[data-cart-panel]")?.classList.add("open");
  $("[data-cart-backdrop]")?.classList.add("open");
}

function closeCart() {
  $("[data-cart-panel]")?.classList.remove("open");
  $("[data-cart-backdrop]")?.classList.remove("open");
}

function renderCart() {
  const wrap = $("#cartItems");
  if (!wrap) return;
  state.cart.forEach(normalizeSauces);
  updatePickupWindow();
  updateOrderSummary();
  const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
  $$("[data-cart-count]").forEach((node) => { node.textContent = String(count); });
  if (!state.cart.length) {
    wrap.innerHTML = `<div class="cart-empty">Ihr Warenkorb ist leer.</div>`;
    $("#cartTotal").textContent = euro.format(0);
    return;
  }
  wrap.innerHTML = state.cart.map((cartItem) => {
    const item = findItem(cartItem.id);
    if (!item) return "";
    const sauceSelect = item.sauces ? `
        <div class="cart-sauces">${cartItem.sauces.map((chosen, index) => `
          <label class="cart-sauce${chosen ? "" : " needs-choice"}">${cartItem.qty > 1 ? `Sauce Portion ${index + 1}` : "Sauce"}
            <select data-sauce="${index}">
              ${chosen ? "" : `<option value="" selected disabled>Bitte wählen</option>`}
              ${item.sauces.map((sauce) => `<option ${sauce === chosen ? "selected" : ""}>${escapeHtml(sauce)}</option>`).join("")}
            </select>
          </label>`).join("")}
        </div>` : "";
    return `
      <div class="cart-item" data-cart-key="${escapeHtml(cartItem.id)}">
        <div class="cart-item-main">
          <strong>${escapeHtml(shortCode(item))} ${escapeHtml(displayName(item))}</strong>
          <strong>${euro.format(item.price * cartItem.qty)}</strong>
        </div>${sauceSelect}
        <div class="cart-controls">
          <button type="button" data-cart-action="minus">-</button>
          <span>${cartItem.qty}</span>
          <button type="button" data-cart-action="plus">+</button>
          <button type="button" data-cart-action="remove">Löschen</button>
        </div>
        <textarea placeholder="Notiz zu diesem Gericht" data-note>${escapeHtml(cartItem.note || "")}</textarea>
      </div>
    `;
  }).join("");
  $$(".cart-item", wrap).forEach((row) => {
    const key = row.dataset.cartKey;
    row.querySelector('[data-cart-action="minus"]').addEventListener("click", () => changeQty(key, -1));
    row.querySelector('[data-cart-action="plus"]').addEventListener("click", () => changeQty(key, 1));
    row.querySelector('[data-cart-action="remove"]').addEventListener("click", () => removeCartItem(key));
    $$("[data-sauce]", row).forEach((select) => {
      select.addEventListener("change", () => changeSauce(key, Number(select.dataset.sauce), select.value));
    });
    row.querySelector("[data-note]").addEventListener("input", (event) => {
      const item = findCartItem(key);
      if (item) item.note = event.target.value;
      persistCart();
    });
  });
  $("#cartTotal").textContent = euro.format(cartTotal());
}

function changeQty(key, delta) {
  const item = findCartItem(key);
  if (!item) return;
  if (delta > 0 && !isItemOrderableNow(item.id)) {
    showNotice($("#orderNotice"), unavailableMessage(item.id), true);
    return;
  }
  item.qty += delta;
  if (item.sauces) {
    if (delta > 0) item.sauces.push(item.sauces[item.sauces.length - 1] || "");
    else item.sauces.pop();
  }
  if (item.qty <= 0) removeCartItem(key);
  persistCart();
  renderCart();
}

function changeSauce(key, index, sauce) {
  const item = findCartItem(key);
  if (!item?.sauces) return;
  item.sauces[index] = sauce;
  persistCart();
  renderCart();
}

function removeCartItem(key) {
  state.cart = state.cart.filter((cartItem) => cartItem.id !== key);
  persistCart();
  renderCart();
}

// Schnellsuche: Name oder Nummern ("2 7 34") eingeben und direkt in den Warenkorb legen.
function initQuickOrder() {
  const input = $("#quickSearch");
  if (!input) return;
  input.addEventListener("input", () => {
    state.quickRows = searchQuick(input.value);
    setQuickStatus("");
    renderQuickResults();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") resetQuickSearch("");
    if (event.key !== "Enter") return;
    event.preventDefault();
    const pending = state.quickRows.filter((row) => !row.added);
    if (state.quickMode === "codes" && pending.length) addQuickRows(pending);
    else if (pending.length === 1) addQuickRows(pending);
  });
  $("#quickAddAll")?.addEventListener("click", () => addQuickRows(state.quickRows.filter((row) => !row.added)));
}

function normalizeText(value) {
  return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss");
}

function quickPool() {
  const lunchOpen = isLunchOpenNow();
  const dinnerOpen = isDinnerOpenNow();
  if (lunchOpen && !dinnerOpen) return lunchMenu;
  if (dinnerOpen && !lunchOpen) return dinnerMenu;
  return [...lunchMenu, ...dinnerMenu];
}

function quickShowsBothMenus() {
  return isLunchOpenNow() === isDinnerOpenNow();
}

function searchQuick(query) {
  const tokens = query.trim().split(/[\s,;+]+/).filter(Boolean);
  state.quickMode = "";
  if (!tokens.length) return [];
  const pool = quickPool();
  if (tokens.every((token) => /^[a-z]{0,2}\d+-?[a-z]?$/i.test(token))) {
    state.quickMode = "codes";
    return tokens.flatMap((token) => {
      const key = token.toLowerCase().replace("-", "");
      const bySize = pool.filter((entry) => entry.size && shortCode(entry).toLowerCase() === key);
      const byId = pool.filter((entry) => entry.id.toLowerCase().replace("-", "") === key && entry.code.toLowerCase() !== key);
      const items = bySize.length ? bySize : byId.length ? byId : pool.filter((entry) => entry.code.toLowerCase() === key);
      return items.length ? items.map((item) => ({ id: item.id, sauce: "", added: false })) : [{ missing: token }];
    });
  }
  state.quickMode = "names";
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  return pool
    .filter((item) => {
      const text = normalizeText(`${item.code} ${shortCode(item)} ${item.name} ${item.size || ""} ${item.category}`);
      return words.every((word) => text.includes(word));
    })
    .slice(0, quickShowsBothMenus() ? 12 : 8)
    .map((item) => ({ id: item.id, sauce: "", added: false }));
}

function renderQuickResults() {
  const wrap = $("#quickResults");
  if (!wrap) return;
  const rows = state.quickRows;
  const found = rows.filter((row) => !row.missing);
  const missing = rows.filter((row) => row.missing).map((row) => row.missing);
  const query = $("#quickSearch").value.trim();
  if (query && !found.length) {
    wrap.innerHTML = emptyMenu(missing.length ? `Keine Gerichte mit Nummer ${missing.join(", ")} gefunden.` : "Kein passendes Gericht gefunden.");
  } else {
    wrap.innerHTML = rows.map((row, index) => {
      if (row.missing) return `<div class="quick-row quick-row-missing">Nr. ${escapeHtml(row.missing)} nicht gefunden</div>`;
      const item = findItem(row.id);
      const open = isItemOrderableNow(item.id);
      const disabled = open && !row.added ? "" : "disabled";
      const label = row.added ? "✓ Im Warenkorb" : open ? "Hinzufügen" : (isLunchItem(item.id) ? closedButtonText(LUNCH_HOURS) : closedButtonText(DINNER_HOURS));
      return `
        <div class="quick-row${row.added ? " is-added" : ""}" data-quick-row="${index}">
          <div class="quick-row-main">
            <span class="code">${escapeHtml(shortCode(item))}</span>
            <strong>${escapeHtml(displayName(item))}</strong>
            ${quickShowsBothMenus() ? `<span class="tag">${isLunchItem(item.id) ? "Mittag" : "Abend"}</span>` : ""}
            <span class="price">${euro.format(item.price)}</span>
          </div>
          ${item.sauces && !row.added ? saucePicker(item, open ? "" : "disabled", { name: `quick-sauce-${index}`, chosen: row.sauce, attr: `data-quick-sauce="${index}"` }) : ""}
          ${row.added && row.sauce ? `<span class="quick-row-sauce">Sauce: ${escapeHtml(row.sauce)}</span>` : ""}
          <button class="btn btn-gold" type="button" data-quick-add="${index}" ${disabled}>${escapeHtml(label)}</button>
        </div>
      `;
    }).join("");
  }
  const pending = found.filter((row) => !row.added && isItemOrderableNow(row.id));
  const pendingTotal = pending.reduce((sum, row) => sum + findItem(row.id).price, 0);
  const total = $("#quickTotal");
  total.hidden = !(state.quickMode === "codes" && pending.length);
  total.innerHTML = `<span>Summe: ${pending.length} ${pending.length === 1 ? "Gericht" : "Gerichte"}</span><strong>${euro.format(pendingTotal)}</strong>`;
  const actions = $("#quickActions");
  actions.hidden = !(state.quickMode === "codes" && pending.length > 1);
  $("#quickAddAll").textContent = `Alle ${pending.length} in den Warenkorb · ${euro.format(pendingTotal)}`;
  $$("[data-quick-sauce]", wrap).forEach((picker) => {
    picker.addEventListener("change", (event) => {
      state.quickRows[Number(picker.dataset.quickSauce)].sauce = event.target.value;
      picker.classList.remove("needs-choice");
      $(".sauce-hint", picker).hidden = true;
    });
  });
  $$("[data-quick-add]", wrap).forEach((button) => {
    button.addEventListener("click", () => addQuickRows([state.quickRows[Number(button.dataset.quickAdd)]]));
  });
}

function addQuickRows(rows) {
  const wrap = $("#quickResults");
  const orderable = rows.filter((row) => !row.missing && !row.added && isItemOrderableNow(row.id));
  if (!orderable.length) return;
  const needSauce = orderable.filter((row) => findItem(row.id).sauces && !row.sauce);
  if (needSauce.length) {
    needSauce.forEach((row) => {
      const picker = $(`[data-quick-sauce="${state.quickRows.indexOf(row)}"]`, wrap);
      if (!picker) return;
      picker.classList.remove("needs-choice");
      void picker.offsetWidth;
      picker.classList.add("needs-choice");
      $(".sauce-hint", picker).hidden = false;
    });
    $(`[data-quick-sauce="${state.quickRows.indexOf(needSauce[0])}"] input`, wrap)?.focus();
    setQuickStatus("Bitte zuerst eine Sauce wählen.", true);
    return;
  }
  orderable.forEach((row) => {
    addToCart(row.id, null, row.sauce);
    row.added = true;
  });
  const names = orderable.map((row) => shortCode(findItem(row.id))).join(", ");
  const cartCount = state.cart.reduce((sum, cartItem) => sum + cartItem.qty, 0);
  const added = `${orderable.length === 1 ? "Gericht" : `${orderable.length} Gerichte`} (${names}) in den Warenkorb gelegt. Warenkorb: ${cartCount} ${cartCount === 1 ? "Gericht" : "Gerichte"} · ${euro.format(cartTotal())}.`;
  if (state.quickRows.every((row) => row.missing || row.added || !isItemOrderableNow(row.id))) {
    resetQuickSearch(`${added} Nächstes Gericht eingeben …`);
  } else {
    setQuickStatus(added);
    renderQuickResults();
  }
}

function resetQuickSearch(message) {
  const input = $("#quickSearch");
  input.value = "";
  state.quickRows = [];
  state.quickMode = "";
  renderQuickResults();
  setQuickStatus(message);
  input.focus();
}

function setQuickStatus(text, isError = false) {
  const status = $("#quickStatus");
  if (!status) return;
  status.textContent = text;
  status.classList.toggle("error", isError);
}

// "Zur Kasse": Warenkorb schließen, zum Bestellformular springen und das erste leere Pflichtfeld fokussieren.
function goToCheckout() {
  closeCart();
  const section = $("#orderForm") || $("#bestellen");
  section?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  const firstEmpty = $$("#orderForm input[required]").find((input) => !input.value.trim());
  window.setTimeout(() => firstEmpty?.focus({ preventScroll: true }), 450);
}

// Mitlaufende Leiste mit Anzahl, Summe und "Zur Kasse", sobald etwas im Warenkorb liegt (ausgeblendet am Formular).
function updateCheckoutBar() {
  const bar = $("[data-checkout-bar]");
  if (!bar) return;
  const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const visible = count > 0 && !state.checkoutInView;
  bar.hidden = !visible;
  document.body.classList.toggle("checkout-visible", visible);
  const total = $("[data-checkout-total]");
  if (total) total.textContent = euro.format(cartTotal());
}

function updateOrderSummary() {
  const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const text = $("[data-summary-text]");
  if (text) text.textContent = count ? `${count} ${count === 1 ? "Gericht" : "Gerichte"} · ${euro.format(cartTotal())}` : "Noch keine Gerichte ausgewählt";
  $("[data-order-summary]")?.classList.toggle("is-empty", !count);
  const submit = $("[data-submit-label]");
  if (submit) submit.textContent = count ? `Bestellung abschicken · ${euro.format(cartTotal())}` : "Bestellung abschicken";
  const quickCart = $("[data-quick-cart]");
  if (quickCart) {
    quickCart.hidden = !count;
    $("[data-quick-cart-text]").textContent = `${count} ${count === 1 ? "Gericht" : "Gerichte"} · ${euro.format(cartTotal())}`;
  }
  updateCheckoutBar();
}

// Bestellnummer: bleibt gleich, solange sich der Warenkorb nicht ändert (z. B. bei erneutem Absenden).
function cachedOrderNumber(signature) {
  try {
    const saved = JSON.parse(sessionStorage.getItem("maiWokOrderNumber") || "null");
    if (saved && saved.signature === signature) return saved.number;
  } catch {}
  return null;
}

function rememberOrderNumber(signature, number) {
  try {
    sessionStorage.setItem("maiWokOrderNumber", JSON.stringify({ signature, number }));
    localStorage.setItem("maiWokLastOrderNumber", String(number));
  } catch {}
}

// Zufallsnummer ohne Server; nie zweimal hintereinander dieselbe auf einem Gerät.
function randomOrderNumber(range) {
  let last = 0;
  try { last = Number(localStorage.getItem("maiWokLastOrderNumber")) || 0; } catch {}
  const size = range.max - range.min + 1;
  let number;
  do {
    number = range.min + Math.floor(Math.random() * size);
  } while (size > 1 && number === last);
  return number;
}

function orderNumberFor(signature) {
  const cached = cachedOrderNumber(signature);
  if (cached) return cached;
  const number = randomOrderNumber(ORDER_NUMBER);
  rememberOrderNumber(signature, number);
  return number;
}

// Fortlaufende Tagesnummer vom Server holen (schreibt die Bestellung zugleich in die Google-Tabelle).
async function requestOrderNumber(payload) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(ORDER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const result = await response.json();
    return result && result.ok && Number(result.number) ? Number(result.number) : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

function cartTotal() {
  return state.cart.reduce((sum, cartItem) => {
    const item = findItem(cartItem.id);
    return sum + (item ? item.price * cartItem.qty : 0);
  }, 0);
}

function persistCart() {
  sessionStorage.setItem("maiWokCart", JSON.stringify(state.cart));
}

function renderOrderTimes() {
  const node = $("[data-order-times]");
  if (!node) return;
  node.innerHTML = `
    <li><strong>Mittagsmenü</strong> bestellen ${escapeHtml(LUNCH_HOURS_TEXT)}, abholen ${escapeHtml(LUNCH_PICKUP_TEXT)}.</li>
    <li><strong>Speisekarte</strong> bestellen ${escapeHtml(DINNER_HOURS_TEXT)}, abholen ${escapeHtml(DINNER_PICKUP_TEXT)}.</li>
  `;
}

function initForms() {
  renderOrderTimes();
  $("#orderForm")?.addEventListener("submit", handleOrder);
  $("[data-pickup-days]")?.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-date]");
    if (!chip) return;
    state.pickupDateTouched = true;
    $('#orderForm [name="pickupDate"]').value = chip.dataset.date;
    updatePickupWindow();
  });
  $("[data-pickup-times]")?.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-time]");
    if (!chip) return;
    $('#orderForm [name="pickupTime"]').value = chip.dataset.time;
    updatePickupWindow();
  });
}

// Abholzeit richtet sich nach dem Warenkorb: Mittagsgerichte 11:00-16:59, Speisekarte 17:00-21:00 (samstags ab 11:00).
function cartHasDinnerItems() {
  return state.cart.some((cartItem) => !isLunchItem(cartItem.id));
}

function cartPickupSlots() {
  return cartHasDinnerItems() ? DINNER_PICKUP : LUNCH_PICKUP;
}

function weekdayOf(dateISO) {
  return new Date(`${dateISO}T12:00:00Z`).getUTCDay() || 7;
}

// Nächster Tag, an dem die Bestellung noch abgeholt werden kann (heute nur, wenn das Zeitfenster noch nicht vorbei ist).
function nextPickupDate(slots) {
  const now = getBerlinParts();
  for (let offset = 0; offset < 8; offset += 1) {
    const iso = getBerlinDateISO(new Date(Date.now() + offset * 86400000));
    const slot = slots.find((entry) => entry.days.includes(weekdayOf(iso)));
    if (!slot) continue;
    if (offset === 0 && now.hour * 60 + now.minute > toMinutes(slot.end)) continue;
    return iso;
  }
  return getBerlinDateISO();
}

function pickupWindow(dateISO) {
  if (!state.cart.length) return null;
  const isLunch = !cartHasDinnerItems();
  const slots = cartPickupSlots();
  const weekday = dateISO ? weekdayOf(dateISO) : getBerlinParts().weekday;
  const slot = slots.find((entry) => entry.days.includes(weekday));
  const label = isLunch ? "Mittagsgerichte" : "Gerichte der Speisekarte";
  if (!slot) return { label, closed: true };
  return { label, start: slot.start, end: slot.end };
}

const WEEKDAY_SHORT = ["", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function formatDateShort(iso) {
  const [, month, day] = iso.split("-");
  return `${WEEKDAY_SHORT[weekdayOf(iso)]} ${day}.${month}.`;
}

function formatDateLong(iso) {
  const [year, month, day] = iso.split("-");
  return `${WEEKDAY_SHORT[weekdayOf(iso)]}., ${day}.${month}.${year}`;
}

// Mögliche Abholtage (nächste 7 Tage) und Uhrzeiten im 15-Minuten-Takt.
function pickupDays(slots) {
  const today = getBerlinDateISO();
  const now = getBerlinParts();
  const days = [];
  for (let offset = 0; offset < 8 && days.length < 6; offset += 1) {
    const iso = getBerlinDateISO(new Date(Date.now() + offset * 86400000));
    const slot = slots.find((entry) => entry.days.includes(weekdayOf(iso)));
    if (!slot) continue;
    if (iso === today && now.hour * 60 + now.minute >= toMinutes(slot.end)) continue;
    days.push({ iso, label: offset === 0 ? "Heute" : offset === 1 ? "Morgen" : formatDateShort(iso), sub: offset < 2 ? formatDateShort(iso) : "" });
  }
  return days;
}

function pickupTimes(slot, iso) {
  const now = getBerlinParts();
  const nowMinutes = iso === getBerlinDateISO() ? now.hour * 60 + now.minute : -1;
  const times = [];
  for (let minute = toMinutes(slot.start); minute <= toMinutes(slot.end); minute += 15) {
    if (minute > nowMinutes) times.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
  }
  return times;
}

function updatePickupWindow() {
  const daysWrap = $("[data-pickup-days]");
  const timesWrap = $("[data-pickup-times]");
  const hint = $("#pickupHint");
  const dateInput = $('#orderForm [name="pickupDate"]');
  const timeInput = $('#orderForm [name="pickupTime"]');
  if (!daysWrap || !timesWrap || !dateInput || !timeInput) return;
  if (!state.cart.length) {
    daysWrap.innerHTML = "";
    timesWrap.innerHTML = `<p class="chip-empty">Bitte zuerst Gerichte auswählen, dann zeigen wir passende Abholzeiten.</p>`;
    dateInput.value = "";
    timeInput.value = "";
    hint.textContent = "";
    return;
  }
  const slots = cartPickupSlots();
  const days = pickupDays(slots);
  if (!days.some((day) => day.iso === dateInput.value)) dateInput.value = days[0]?.iso || "";
  daysWrap.innerHTML = days.map((day) => `
    <button type="button" class="chip${day.iso === dateInput.value ? " is-active" : ""}" role="radio" aria-checked="${day.iso === dateInput.value}" data-date="${day.iso}">
      <strong>${escapeHtml(day.label)}</strong>${day.sub ? `<small>${escapeHtml(day.sub)}</small>` : ""}
    </button>`).join("");
  const pickup = pickupWindow(dateInput.value);
  const times = pickup && !pickup.closed ? pickupTimes(pickup, dateInput.value) : [];
  if (!times.includes(timeInput.value)) timeInput.value = "";
  timesWrap.innerHTML = times.length
    ? times.map((time) => `<button type="button" class="chip chip-time${time === timeInput.value ? " is-active" : ""}" role="radio" aria-checked="${time === timeInput.value}" data-time="${time}">${time}</button>`).join("")
    : `<p class="chip-empty">An diesem Tag ist keine Abholung möglich.</p>`;
  const todayMissing = days[0] && days[0].iso !== getBerlinDateISO() && slots.some((slot) => slot.days.includes(getBerlinParts().weekday));
  hint.textContent = pickup && !pickup.closed
    ? `${pickup.label}: Abholung ${pickup.start}-${pickup.end} Uhr${todayMissing ? " · heute keine Abholung mehr möglich" : ""}`
    : "";
}

function pickupError(data) {
  const pickup = pickupWindow(data.pickupDate);
  if (!pickup || !data.pickupTime) return "";
  if (pickup.closed) return `${pickup.label} können am gewählten Tag nicht abgeholt werden.`;
  const time = toMinutes(data.pickupTime);
  const now = getBerlinParts();
  const nowMinutes = now.hour * 60 + now.minute;
  if (data.pickupDate === getBerlinDateISO() && nowMinutes > toMinutes(pickup.end)) {
    return `Heute ist für ${pickup.label} keine Abholung mehr möglich (bis ${pickup.end} Uhr). Bitte wählen Sie ein anderes Abholdatum.`;
  }
  if (time < toMinutes(pickup.start) || time > toMinutes(pickup.end)) {
    return `Bitte wählen Sie für ${pickup.label} eine Abholzeit zwischen ${pickup.start} und ${pickup.end} Uhr.`;
  }
  if (data.pickupDate === getBerlinDateISO() && time < nowMinutes) {
    return "Die gewählte Abholzeit liegt in der Vergangenheit.";
  }
  return "";
}

function handleOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  if (!state.cart.length) return showNotice($("#orderNotice"), "Bitte legen Sie zuerst mindestens ein Gericht in den Warenkorb.", true);
  const unavailable = state.cart.find((cartItem) => !isItemOrderableNow(cartItem.id));
  if (unavailable) {
    return showNotice($("#orderNotice"), `${unavailableMessage(unavailable.id)} Bitte entfernen Sie diese Gerichte aus dem Warenkorb.`, true);
  }
  const withoutSauce = state.cart.find(missingSauce);
  if (withoutSauce) {
    const item = findItem(withoutSauce.id);
    openCart();
    return showNotice($("#orderNotice"), `Bitte wählen Sie im Warenkorb für jede Portion von ${item.code} ${displayName(item)} eine Sauce.`, true);
  }
  if (!data.pickupDate || !data.pickupTime) {
    $("[data-pickup-times]")?.scrollIntoView({ block: "center", behavior: "smooth" });
    return showNotice($("#orderNotice"), "Bitte wählen Sie Tag und Uhrzeit für die Abholung.", true);
  }
  const pickupProblem = pickupError(data);
  if (pickupProblem) return showNotice($("#orderNotice"), pickupProblem, true);
  if (!form.checkValidity()) return showNotice($("#orderNotice"), "Bitte füllen Sie alle Pflichtfelder korrekt aus.", true);
  const lines = state.cart.map((cartItem) => {
    const item = findItem(cartItem.id);
    return `${cartItem.qty}x ${shortCode(item)} ${displayName(item)}${cartItem.sauces ? ` - ${sauceSummary(cartItem)}` : ""} - ${euro.format(item.price * cartItem.qty)}${cartItem.note ? ` | Hinweis: ${cartItem.note}` : ""}`;
  });
  const signature = JSON.stringify(state.cart);
  const cached = cachedOrderNumber(signature);
  if (cached || !ORDER_ENDPOINT) {
    finishOrder(data, lines, orderNumberFor(signature), null);
    return;
  }
  // Fenster sofort öffnen (sonst blockiert der Browser WhatsApp nach dem Warten auf den Server).
  const popup = window.open("", "_blank");
  if (popup) popup.opener = null;
  const submit = $("[data-submit-label]");
  if (submit) submit.disabled = true;
  showNotice($("#orderNotice"), "Bestellnummer wird vergeben …");
  requestOrderNumber({
    name: data.name,
    phone: data.phone,
    email: data.email,
    pickup: `${formatDateShort(data.pickupDate)} ${data.pickupTime}`,
    items: lines.join("\n"),
    total: euro.format(cartTotal()),
    payment: data.payment || "",
    notes: data.notes || "",
    source: ORDER_SOURCE ? ORDER_SOURCES[ORDER_SOURCE] : "Website"
  }).then((number) => {
    const orderNumber = number || randomOrderNumber(ORDER_NUMBER_FALLBACK);
    rememberOrderNumber(signature, orderNumber);
    finishOrder(data, lines, orderNumber, popup);
  }).finally(() => {
    if (submit) submit.disabled = false;
  });
}

function finishOrder(data, lines, orderNumber, popup) {
  const message = [
    `*Bestellung Nr. ${orderNumber}* · ${data.name} · Abholung ${formatDateShort(data.pickupDate)} ${data.pickupTime} Uhr`,
    "Bestellanfrage Maiwok Zo Freiburg", "",
    `Name: ${data.name}`,
    `Telefon: ${data.phone}`,
    `E-Mail: ${data.email}`, "",
    "Gerichte:", ...lines, "",
    `Gesamt: ${euro.format(cartTotal())}`,
    `Abholung: ${formatDateLong(data.pickupDate)} um ${data.pickupTime} Uhr`,
    `Zahlungsmethode: ${data.payment || "Nicht angegeben"}`,
    `Hinweise: ${data.notes || "-"}`,
    ...(ORDER_SOURCE ? ["", `Quelle: ${ORDER_SOURCES[ORDER_SOURCE]}`] : [])
  ].join("\n");
  trackEvent(ORDER_SOURCE ? `bestellung-${ORDER_SOURCE}` : "bestellung", ORDER_SOURCE ? "Bestellung gesendet (QR Mitnahme-Karte)" : "Bestellung gesendet");
  const links = sendMessage(`Bestellung Nr. ${orderNumber} – Maiwok Zo Freiburg`, message, popup);
  showActionNotice($("#orderNotice"), "WhatsApp wurde geöffnet. Bitte senden Sie die Nachricht ab. Falls Sie auch per E-Mail senden möchten:", links, orderNumber);
}

function sendMessage(subject, message, popup = null) {
  const links = {
    whatsapp: `https://wa.me/${RESTAURANT.whatsapp}?text=${encodeURIComponent(message)}`,
    email: `mailto:${RESTAURANT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
  };
  if (EMAIL_ENDPOINT) {
    fetch(EMAIL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message, to: RESTAURANT.email })
    }).catch(() => {});
  }
  if (popup && !popup.closed) popup.location.href = links.whatsapp;
  else window.open(links.whatsapp, "_blank", "noopener");
  return links;
}

function initGallery() {
  const gallery = $("#galleryGrid");
  if (!gallery) return;
  gallery.innerHTML = imagePool.slice(0, 16).map((src, index) => `
    <button class="gallery-item" type="button" data-gallery="${src}">
      <img src="${thumbOf(src)}" alt="Maiwok Zo Freiburg Gericht ${index + 1}" loading="lazy" decoding="async">
    </button>
  `).join("");
  const lightbox = $("#lightbox");
  const lightboxImg = $("#lightbox img");
  $$("[data-gallery]").forEach((button) => {
    button.addEventListener("click", () => {
      lightboxImg.src = button.dataset.gallery;
      lightboxImg.hidden = false;
      lightbox.classList.add("open");
    });
  });
  $("[data-lightbox-close]")?.addEventListener("click", () => lightbox.classList.remove("open"));
  observeMotionElements(gallery);
}

// Externe Inhalte erst bei Bedarf laden: Resmio, wenn "Reservieren" in die Nähe kommt; Google Maps erst nach Klick.
function initLazyEmbeds() {
  const resmio = $("#resmio-maiwok-zo");
  const loadResmio = () => {
    if (!resmio || resmio.dataset.loaded) return;
    resmio.dataset.loaded = "true";
    const script = document.createElement("script");
    script.src = "https://static.resmio.com/static/de/widget.js#id=maiwok-zo&width=100%25&height=560px";
    script.async = true;
    document.body.appendChild(script);
  };
  if (resmio && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        loadResmio();
      }
    }, { rootMargin: "800px 0px" });
    observer.observe(resmio);
  } else {
    loadResmio();
  }
  $("[data-load-map]")?.addEventListener("click", () => {
    const holder = $(".map-consent");
    const frame = document.createElement("iframe");
    frame.title = "Google Maps: Maiwok Zo Freiburg";
    frame.src = holder.dataset.mapSrc;
    frame.loading = "lazy";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.allowFullscreen = true;
    holder.replaceWith(frame);
  });
}

function initMotion() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  motionObserver = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        motionObserver.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" })
    : null;
  document.body.classList.add("motion-ready");
  observeMotionElements(document);
}

function initHeroTilt() {
  const visual = $(".hero-visual");
  if (!visual || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let frame = 0;
  visual.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      const rect = visual.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 7;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * -7;
      visual.style.setProperty("--tilt-x", `${x.toFixed(2)}deg`);
      visual.style.setProperty("--tilt-y", `${y.toFixed(2)}deg`);
    });
  });
  visual.addEventListener("pointerleave", () => {
    visual.style.removeProperty("--tilt-x");
    visual.style.removeProperty("--tilt-y");
  });
}

function observeMotionElements(scope = document) {
  if (!motionObserver) return;
  const selectors = [
    ".section-head",
    ".feature-grid article",
    ".menu-aside",
    ".panel-head",
    ".filters",
    ".category-tabs",
    ".menu-card",
    ".gallery-item",
    ".form-card",
    ".order-intro",
    ".order-steps span",
    ".pickup-note",
    ".map-wrap",
    ".contact-layout > div:first-child"
  ].join(",");
  $$(selectors, scope).forEach((element, index) => {
    if (element.dataset.revealReady) return;
    element.dataset.revealReady = "true";
    element.style.setProperty("--reveal-delay", `${Math.min(index, 8) * 45}ms`);
    motionObserver.observe(element);
  });
}

function animateAddButton(button) {
  if (!button) return;
  const originalText = button.textContent;
  button.classList.remove("added");
  void button.offsetWidth;
  button.classList.add("added");
  button.textContent = "Hinzugef\u00fcgt";
  window.setTimeout(() => {
    button.classList.remove("added");
    button.textContent = originalText;
  }, 900);
}

function bumpCartCount() {
  $$("[data-cart-count]").forEach((node) => {
    node.classList.remove("bump");
    void node.offsetWidth;
    node.classList.add("bump");
  });
  const cart = $(".floating-cart");
  cart?.classList.add("attention");
  window.setTimeout(() => cart?.classList.remove("attention"), 520);
}

function getBerlinParts() {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: RESTAURANT.timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date()).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const weekdayMap = { Mo: 1, Di: 2, Mi: 3, Do: 4, Fr: 5, Sa: 6, So: 7 };
  return { hour: Number(parts.hour), minute: Number(parts.minute), weekday: weekdayMap[String(parts.weekday).replace(".", "")] || 1 };
}


function isWithinHours(slots, now) {
  const minutes = now.hour * 60 + now.minute;
  return slots.some((slot) => slot.days.includes(now.weekday) && minutes >= toMinutes(slot.start) && minutes < toMinutes(slot.end));
}

function todaySlot(slots, now = getBerlinParts()) {
  return slots.find((slot) => slot.days.includes(now.weekday));
}

function closedButtonText(slots) {
  const slot = todaySlot(slots);
  return slot ? `Nur ${slot.start}-${slot.end}` : "Heute nicht bestellbar";
}

function closedBadgeText(slots) {
  const slot = todaySlot(slots);
  return slot ? `Bestellbar ${slot.start}-${slot.end} Uhr` : "Heute nicht bestellbar";
}

function isLunchOpenNow(now = getBerlinParts()) {
  if (MENU_MODE !== "auto") return MENU_MODE === "mittag";
  return isWithinHours(LUNCH_HOURS, now);
}

function isDinnerOpenNow(now = getBerlinParts()) {
  if (MENU_MODE !== "auto") return MENU_MODE === "abend";
  return isWithinHours(DINNER_HOURS, now);
}

function isItemOrderableNow(id) {
  return isLunchItem(id) ? isLunchOpenNow() : isDinnerOpenNow();
}

function unavailableMessage(id) {
  return isLunchItem(id)
    ? `Mittagsgerichte können nur ${LUNCH_HOURS_TEXT} bestellt werden.`
    : `Gerichte der Speisekarte können nur ${DINNER_HOURS_TEXT} bestellt werden.`;
}

function hoursText(slots) {
  const names = ["", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  return slots.map((slot) => {
    const days = [...slot.days].sort((a, b) => a - b);
    const consecutive = days.every((day, index) => index === 0 || day === days[index - 1] + 1);
    const dayText = consecutive && days.length > 2
      ? `${names[days[0]]} bis ${names[days[days.length - 1]]}`
      : days.map((day) => names[day]).join(", ");
    return `${dayText} von ${slot.start} bis ${slot.end} Uhr`;
  }).join(" und ");
}

function toMinutes(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function isLunchItem(id) {
  return lunchMenu.some((lunchItem) => lunchItem.id === id);
}

function setDefaultDates() {
  const iso = getBerlinDateISO();
  $$('input[type="date"]').forEach((input) => {
    input.min = iso;
    if (!input.value) input.value = iso;
  });
}

function getBerlinDateISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: RESTAURANT.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function showNotice(node, text, isError = false) {
  if (!node) return;
  node.textContent = text;
  node.classList.toggle("error", isError);
  node.classList.add("show");
}

function showActionNotice(node, text, links, orderNumber) {
  if (!node) return;
  node.classList.remove("error");
  node.innerHTML = `
    ${orderNumber ? `<span class="order-number"><small>Ihre Bestellnummer</small><strong>${escapeHtml(orderNumber)}</strong><small>Bitte bei der Abholung nennen.</small></span>` : ""}
    <span>${escapeHtml(text)}</span>
    <span class="notice-actions">
      <a href="${escapeHtml(links.whatsapp)}" target="_blank" rel="noopener noreferrer">WhatsApp öffnen</a>
      <a href="${escapeHtml(links.email)}">E-Mail öffnen</a>
    </span>
  `;
  node.classList.add("show");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
