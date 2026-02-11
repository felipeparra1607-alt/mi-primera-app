import { supabase } from "./supabaseClient.js";

const BUDGET_KEY = "fluxo_budgets";
const BUDGET_V2_KEY = "fluxo_budgets_v2";
const CURRENCY_KEY = "fluxo_currency";
const LOGIN_EMAIL_KEY = "fluxo_login_email";

let expensesCache = [];
let activeSession = null;
let isAuthModeSignUp = false;
let isSavingExpense = false;
let isLoggingOut = false;
let isAuthLoading = false;
let uiBound = false;
let authBound = false;
let authFormBound = false;
let focusListenersBound = false;
let isResumingApp = false;
let pendingResumeReason = "";
let inFocus = true;

const state = {
  amount: 0,
  currency: "EUR",
  category: null,
  date: new Date(),
  quickDate: "today",
  dateSelection: {
    day: new Date().getDate(),
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  },
  dateMode: "day",
};

const viewState = {
  openCategories: new Set(),
  sortBy: {},
};

const budgetState = {
  mode: "template",
  template: null,
  monthly: {},
};

const monthNames = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const currencySymbols = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  COP: "$",
  MXN: "$",
};

const CATEGORIES = [
  { key: "Restaurantes", label: "Restaurantes", emoji: "🍽️" },
  { key: "Supermercado", label: "Supermercado", emoji: "🛒" },
  { key: "Transporte", label: "Transporte", emoji: "🚗" },
  { key: "Gasolina", label: "Gasolina", emoji: "⛽" },
  { key: "Ocio", label: "Ocio", emoji: "🎉" },
  { key: "Otros", label: "Otros", emoji: "✨" },
  { key: "Servicios", label: "Servicios", emoji: "💡" },
  { key: "Mascota", label: "Mascota", emoji: "🐾" },
  { key: "Niños", label: "Niños", emoji: "👶" },
  { key: "Empleada", label: "Empleada", emoji: "🧹" },
];
const CATEGORY_KEYS = new Set(CATEGORIES.map((category) => category.key));
const CATEGORY_FALLBACK = "Otros";

const tabs = document.querySelectorAll(".tab-button");
const panels = document.querySelectorAll(".tab-panel");
const amountDisplay = document.getElementById("amount-display");
const amountInput = document.getElementById("amount-input");
const currencyPill = document.getElementById("currency-pill");
const currencyModal = document.getElementById("currency-modal");
const dateModal = document.getElementById("date-modal");
const dateDisplay = document.getElementById("date-display");
const datePills = document.getElementById("date-pills");
const confirmDateBtn = document.getElementById("confirm-date");
const toast = document.getElementById("toast");
const saveBtn = document.getElementById("save-expense");
const conceptInput = document.getElementById("concept");
const yearSelect = document.getElementById("year-select");
const monthSelect = document.getElementById("month-select");
const expensesList = document.getElementById("expenses-list");
const budgetView = document.getElementById("view-budget");
const budgetWizard = document.getElementById("budget-wizard");
const budgetStartBtn = document.getElementById("budget-start");
const budgetEditBtn = document.getElementById("budget-edit");
const budgetDisableBtn = document.getElementById("budget-disable");
const budgetBackBtn = document.getElementById("budget-back");
const budgetStepLabel = document.getElementById("budget-step");
const budgetNext1 = document.getElementById("budget-next-1");
const budgetSkip = document.getElementById("budget-skip");
const budgetActivate = document.getElementById("budget-activate");
const budgetMonthlyAmount = document.getElementById("budget-month-amount");
const budgetMonthSelect = document.getElementById("budget-month-select");
const budgetMonthSelector = document.getElementById("budget-month-selector");
const monthlyBudgetBar = document.getElementById("monthly-budget-bar");
const monthlyBudgetFill = document.getElementById("monthly-budget-fill");
const monthlyBudgetTooltip = document.getElementById("monthly-budget-tooltip");
const monthlyBudgetText = document.getElementById("monthly-budget-text");
const budgetStepRef = document.getElementById("budget-step-ref");
const budgetStepMonth = document.getElementById("budget-step-month");
const budgetModeTemplate = document.getElementById("budget-mode-template");
const budgetModeMonthly = document.getElementById("budget-mode-monthly");
const budgetMonthlyNote = document.getElementById("budget-monthly-note");
const evolutionTitle = document.getElementById("evolution-title");
const evolutionChartCanvas = document.getElementById("evolution-chart");
const evolutionEmpty = document.getElementById("evolution-empty");
const evolutionPrev = document.getElementById("evolution-prev");
const evolutionNext = document.getElementById("evolution-next");
const evolutionDots = document.getElementById("evolution-dots");
const monthDonutCanvas = document.getElementById("month-donut");
const monthDonutEmpty = document.getElementById("month-donut-empty");
const monthDonutList = document.getElementById("month-donut-list");
const monthTotalBreakdown = document.getElementById("month-total-breakdown");
const dateModeButtons = document.querySelectorAll(".mode-btn");

const appShell = document.getElementById("app-shell");
const authScreen = document.getElementById("auth-screen");
const authLoader = document.getElementById("auth-loader");
const authCard = document.getElementById("auth-card");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authSubmit = document.getElementById("auth-submit");
const authToggle = document.getElementById("auth-toggle");
const authSubtitle = document.getElementById("auth-subtitle");
const authMessage = document.getElementById("auth-message");
const logoutBtn = document.getElementById("logout-btn");
const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const settingsLogoutBtn = document.getElementById("settings-logout");


const formatAmount = (amount) =>
  amount.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDateText = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const toLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const dateKey = toLocalDateKey(date);
  if (dateKey === toLocalDateKey(today)) {
    return `Hoy · ${formatDateText(date)}`;
  }
  if (dateKey === toLocalDateKey(yesterday)) {
    return `Ayer · ${formatDateText(date)}`;
  }
  return formatDateText(date);
};

const formatMonthKey = (monthKey) => {
  if (!monthKey) {
    return "";
  }
  const [year, month] = monthKey.split("-");
  const index = Number(month) - 1;
  const label = monthNames[index] || "";
  return `${label.charAt(0).toUpperCase() + label.slice(1)} ${year}`;
};

const toggleModal = (modal, show) => {
  modal.classList.toggle("is-visible", show);
  modal.setAttribute("aria-hidden", String(!show));
};

const closeAllModals = () => {
  [currencyModal, dateModal, settingsModal].forEach((modal) => {
    if (!modal) {
      return;
    }
    modal.classList.remove("is-visible");
    modal.setAttribute("aria-hidden", "true");
  });
};

const safeResetUI = async () => {
  closeAllModals();
  resetActionFlags();
  try {
    const session = await getSession();
    if (session) {
      hideLogin();
      await refreshAppData();
    } else {
      showLogin();
    }
  } catch (error) {
    console.error(error);
    showLogin();
  }
};

const withSafeHandler = (handler, message) => async (event) => {
  try {
    await handler(event);
  } catch (error) {
    handleUIError(error, message);
  }
};

const clearSupabaseAuthStorage = () => {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-") && key.includes("auth-token")) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error(error);
  }
};

const setBootState = (state) => {
  window.__fluxoBootState = state;
};

const setInFocus = (value) => {
  inFocus = value;
};

const hardSignOut = async () => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error(error);
  }
  clearSupabaseAuthStorage();
};

const resetActionFlags = () => {
  isSavingExpense = false;
  isLoggingOut = false;
  saveBtn.disabled = false;
};

const setAuthMessage = (message = "") => {
  authMessage.textContent = message;
};

const setAuthLoading = (loading, message = "") => {
  isAuthLoading = loading;
  authLoader.classList.toggle("is-hidden", !loading);
  authCard.classList.toggle("is-hidden", loading);
  if (loading && message) {
    authLoader.textContent = message;
  }
  if (!loading) {
    authLoader.textContent = "Cargando sesión…";
  }
};

const showLogin = () => {
  setInFocus(true);
  closeAllModals();
  resetActionFlags();
  authEmail.value = loadLoginEmailFromSession();
  authScreen.classList.remove("is-hidden");
  authScreen.setAttribute("aria-hidden", "false");
  appShell.classList.add("is-hidden");
  appShell.setAttribute("aria-hidden", "true");
  setAuthLoading(false);
};

const showApp = () => {
  setInFocus(true);
  closeAllModals();
  resetActionFlags();
  authScreen.classList.add("is-hidden");
  authScreen.setAttribute("aria-hidden", "true");
  appShell.classList.remove("is-hidden");
  appShell.setAttribute("aria-hidden", "false");
};

const hideLogin = () => {
  showApp();
};

const showAuthMode = (signUpMode) => {
  isAuthModeSignUp = signUpMode;
  authSubmit.textContent = signUpMode ? "Create account" : "Sign In";
  authToggle.textContent = signUpMode
    ? "Already have an account?"
    : "Create account";
  authSubtitle.textContent = signUpMode
    ? "Create your account to sync your expenses"
    : "Sign in to sync your expenses";
  authPassword.autocomplete = signUpMode ? "new-password" : "current-password";
  setAuthMessage("");
};

const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
};

const signIn = async (email, password) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
};

const signUp = async (email, password) => {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    throw error;
  }
};

const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
};

const getReadableAuthError = (error) => {
  const msg = (error?.message || "").toLowerCase();
  if (msg.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (msg.includes("email not confirmed")) return "Debes confirmar tu email antes de entrar.";
  if (msg.includes("already registered") || msg.includes("already been registered")) {
    return "Ese email ya está registrado.";
  }
  if (msg.includes("password") && msg.includes("short")) {
    return "La contraseña es demasiado corta.";
  }
  return error?.message || "Ha ocurrido un error de autenticación.";
};

const updateAmountDisplay = () => {
  amountDisplay.textContent = formatAmount(state.amount);
};

const updateCurrency = (currency) => {
  state.currency = currency;
  currencyPill.textContent = currency;
  localStorage.setItem(CURRENCY_KEY, currency);
};

const updateDateDisplay = () => {
  dateDisplay.textContent = formatDisplayDate(state.date);
};

const isSameLocalDate = (a, b) => toLocalDateKey(a) === toLocalDateKey(b);

const updateQuickDatePills = () => {
  document.querySelectorAll("#date-modal [data-quick]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.quick === state.quickDate);
  });
};

const resetDateToToday = () => {
  const now = new Date();
  state.date = now;
  state.quickDate = "today";
  state.dateSelection = {
    day: now.getDate(),
    month: now.getMonth(),
    year: now.getFullYear(),
  };
  state.dateMode = "day";
  dateModeButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.mode === "day");
  });
  updateDateDisplay();
  updateQuickDatePills();
};

const saveLoginEmailToSession = (value) => {
  try {
    const email = (value || "").trim();
    if (email) {
      sessionStorage.setItem(LOGIN_EMAIL_KEY, email);
    } else {
      sessionStorage.removeItem(LOGIN_EMAIL_KEY);
    }
  } catch (error) {
    console.error(error);
  }
};

const loadLoginEmailFromSession = () => {
  try {
    return sessionStorage.getItem(LOGIN_EMAIL_KEY) || "";
  } catch (error) {
    console.error(error);
    return "";
  }
};

const normalizeExpenseRecord = (record) => ({
  id: String(record.id),
  concept: record.concept || "",
  amount: Number(record.amount || 0),
  currency: record.currency || state.currency,
  category: normalizeCategory(record.category || CATEGORY_FALLBACK),
  dateISO: record.dateISO || record.date || new Date().toISOString().slice(0, 10),
});

const fetchExpensesFromSupabase = async () => {
  const { data, error } = await supabase
    .from("expenses")
    .select("id, concept, amount, currency, category, date")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  expensesCache = (data || []).map((item) =>
    normalizeExpenseRecord({
      id: item.id,
      concept: item.concept,
      amount: item.amount,
      currency: item.currency,
      category: item.category,
      dateISO: item.date,
    })
  );

  return expensesCache;
};

const insertExpenseToSupabase = async (expense) => {
  const payload = {
    concept: expense.concept,
    amount: Number(expense.amount),
    currency: expense.currency,
    category: expense.category,
    date: expense.dateISO,
  };

  const { data, error } = await supabase
    .from("expenses")
    .insert(payload)
    .select("id, concept, amount, currency, category, date")
    .single();

  if (error) {
    throw error;
  }

  const normalized = normalizeExpenseRecord({
    id: data.id,
    concept: data.concept,
    amount: data.amount,
    currency: data.currency,
    category: data.category,
    dateISO: data.date,
  });
  expensesCache.unshift(normalized);
  return normalized;
};

const deleteExpenseFromSupabase = async (expenseId) => {
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) {
    throw error;
  }
  expensesCache = expensesCache.filter((entry) => entry.id !== String(expenseId));
};

const updateExpenseInSupabase = async (expenseId, updates) => {
  const { data, error } = await supabase
    .from("expenses")
    .update(updates)
    .eq("id", expenseId)
    .select("id, concept, amount, currency, category, date")
    .single();
  if (error) {
    throw error;
  }
  const normalized = normalizeExpenseRecord({
    id: data.id,
    concept: data.concept,
    amount: data.amount,
    currency: data.currency,
    category: data.category,
    dateISO: data.date,
  });
  expensesCache = expensesCache.map((entry) =>
    entry.id === normalized.id ? normalized : entry
  );
  return normalized;
};

const loadExpenses = () => expensesCache;

const migrateBudgets = () => {
  const existingV2 = localStorage.getItem(BUDGET_V2_KEY);
  if (existingV2) {
    return;
  }
  const legacyRaw = localStorage.getItem(BUDGET_KEY);
  if (!legacyRaw) {
    return;
  }
  try {
    const legacy = JSON.parse(legacyRaw);
    const monthlyTotal = Number(legacy.monthly?.amount || 0);
    const migrated = {
      mode: "template",
      template: legacy.enabled
        ? {
            monthlyTotal,
            categories: legacy.categories || {},
          }
        : null,
      monthly: {},
    };
    if (legacy.monthly?.currency) {
      localStorage.setItem(CURRENCY_KEY, legacy.monthly.currency);
    }
    localStorage.setItem(BUDGET_V2_KEY, JSON.stringify(migrated));
  } catch (error) {
    return;
  }
};

const loadBudgets = () => {
  migrateBudgets();
  const raw = localStorage.getItem(BUDGET_V2_KEY);
  if (!raw) {
    return { ...budgetState };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed.global) {
      return {
        mode: "template",
        template: parsed.global?.enabled
          ? {
              monthlyTotal: Number(parsed.global.monthlyTotal || 0),
              categories: parsed.global.categories || {},
            }
          : null,
        monthly: parsed.monthly || {},
      };
    }
    return {
      mode: parsed.mode === "monthly" ? "monthly" : "template",
      template: parsed.template
        ? {
            monthlyTotal: Number(parsed.template.monthlyTotal || 0),
            categories: parsed.template.categories || {},
          }
        : null,
      monthly: parsed.monthly || {},
    };
  } catch (error) {
    return { ...budgetState };
  }
};

const saveBudgets = (budgets) => {
  localStorage.setItem(BUDGET_V2_KEY, JSON.stringify(budgets));
};

const showToast = (message = "✅ Gasto guardado") => {
  const text = toast.querySelector("span");
  if (text) {
    text.textContent = message;
  }
  toast.classList.add("is-visible");
  setTimeout(() => toast.classList.remove("is-visible"), 1400);
};

const handleUIError = (error, message = "Ocurrió un error. Intenta de nuevo.") => {
  console.error(error);
  showToast(message);
};

const setActiveTab = (target) => {
  tabs.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.tab == target);
    btn.setAttribute("aria-selected", String(btn.dataset.tab == target));
  });
  panels.forEach((panel) => {
    panel.classList.toggle("is-visible", panel.id === `tab-${target}`);
  });
  if (target === "add") {
    resetDateToToday();
  }
};

const handleDocumentClick = withSafeHandler(async (event) => {
  const target = event.target;

  const tabBtn = target.closest(".tab-button");
  if (tabBtn) {
    setActiveTab(tabBtn.dataset.tab);
    closeAllModals();
    return;
  }

  const saveTrigger = target.closest("#save-expense");
  if (saveTrigger) {
    await handleSave();
    return;
  }

  const logoutTrigger = target.closest("#logout-btn, #settings-logout");
  if (logoutTrigger) {
    await handleLogout();
    return;
  }

  const settingsTrigger = target.closest("#settings-btn");
  if (settingsTrigger) {
    openSettingsModal();
    return;
  }

  const currencyTrigger = target.closest("#currency-pill");
  if (currencyTrigger) {
    openCurrencyModal();
    return;
  }

  const currencyOption = target.closest("#currency-modal button[data-currency]");
  if (currencyOption) {
    updateCurrency(currencyOption.dataset.currency);
    closeCurrencyModal();
    return;
  }

  const currencyOverlay = target.closest("#currency-modal .modal-overlay");
  if (currencyOverlay) {
    closeCurrencyModal();
    return;
  }

  const dateTrigger = target.closest("#date-display");
  if (dateTrigger) {
    state.dateSelection = {
      day: state.date.getDate(),
      month: state.date.getMonth(),
      year: state.date.getFullYear(),
    };
    state.dateMode = "day";
    dateModeButtons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.mode === state.dateMode);
    });
    updateQuickDatePills();
    renderDatePills();
    openDateModal();
    return;
  }

  const dateOverlay = target.closest("#date-modal .modal-overlay");
  if (dateOverlay) {
    closeDateModal();
    return;
  }

  const dateQuick = target.closest("#date-modal [data-quick]");
  if (dateQuick) {
    const now = new Date();
    const quick = dateQuick.dataset.quick;
    state.quickDate = quick;
    if (quick === "yesterday") {
      now.setDate(now.getDate() - 1);
    }
    state.dateSelection = {
      day: now.getDate(),
      month: now.getMonth(),
      year: now.getFullYear(),
    };
    state.date = buildDateFromSelection();
    updateDateDisplay();
    updateQuickDatePills();
    renderDatePills();
    return;
  }

  const datePill = target.closest("#date-pills .pill");
  if (datePill) {
    const { type, value } = datePill.dataset;
    updateDateSelection(type, value);
    state.date = buildDateFromSelection();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (isSameLocalDate(state.date, today)) {
      state.quickDate = "today";
    } else if (isSameLocalDate(state.date, yesterday)) {
      state.quickDate = "yesterday";
    } else {
      state.quickDate = null;
    }
    updateDateDisplay();
    updateQuickDatePills();
    renderDatePills();
    return;
  }

  const dateModeBtn = target.closest(".mode-btn");
  if (dateModeBtn) {
    state.dateMode = dateModeBtn.dataset.mode;
    dateModeButtons.forEach((btn) => {
      btn.classList.toggle("is-active", btn === dateModeBtn);
    });
    renderDatePills();
    return;
  }

  const dateConfirm = target.closest("#confirm-date");
  if (dateConfirm) {
    state.date = buildDateFromSelection();
    updateDateDisplay();
    updateQuickDatePills();
    closeDateModal();
    return;
  }

  const settingsOverlay = target.closest("#settings-modal .modal-overlay");
  if (settingsOverlay) {
    closeSettingsModal();
    return;
  }

  const amountButton = target.closest(".amount-btn");
  if (amountButton) {
    const action = amountButton.dataset.action;
    const delta = action === "increment" ? 1 : -1;
    state.amount = Math.max(0, state.amount + delta);
    updateAmountDisplay();
    return;
  }

  const amountDisplayTrigger = target.closest("#amount-display");
  if (amountDisplayTrigger) {
    amountInput.classList.add("is-visible");
    amountInput.value = state.amount.toString();
    amountInput.focus();
    return;
  }

  const catCircle = target.closest(".cat-circle");
  if (catCircle) {
    const card = catCircle.closest(".cat-card");
    if (card) {
      setCategory(card.dataset.category, catCircle);
    }
    return;
  }

  const catCard = target.closest(".cat-card");
  if (catCard && !target.closest(".cat-circle")) {
    setCategory(catCard.dataset.category);
    return;
  }

  const budgetStart = target.closest("#budget-start");
  if (budgetStart) {
    const editable = getEditableBudgetForMonth(getSelectedYearMonth());
    loadBudgetIntoWizard(editable);
    openWizard();
    return;
  }

  const budgetEdit = target.closest("#budget-edit");
  if (budgetEdit) {
    const editable = getEditableBudgetForMonth(getSelectedYearMonth());
    loadBudgetIntoWizard(editable);
    openWizard();
    return;
  }

  const budgetDisable = target.closest("#budget-disable");
  if (budgetDisable) {
    const monthKey = getSelectedYearMonth();
    if (budgetState.mode === "monthly") {
      delete budgetState.monthly[monthKey];
    } else {
      budgetState.template = null;
    }
    saveBudgets(budgetState);
    updateBudgetButtons();
    renderExpenses();
    return;
  }

  const budgetBack = target.closest("#budget-back");
  if (budgetBack) {
    closeWizard();
    return;
  }

  const budgetNext = target.closest("#budget-next-1");
  if (budgetNext) {
    const amount = Number(budgetMonthlyAmount.value || 0);
    if (amount <= 0) {
      window.alert("Ingresa un presupuesto mensual válido.");
      return;
    }
    setWizardStep(2);
    return;
  }

  const budgetSkip = target.closest("#budget-skip");
  if (budgetSkip) {
    document.querySelectorAll("[data-category-budget]").forEach((input) => {
      input.value = "";
    });
    const applied = applyBudgetSettings();
    if (!applied) {
      return;
    }
    updateBudgetButtons();
    closeWizard();
    renderExpenses();
    return;
  }

  const budgetActivate = target.closest("#budget-activate");
  if (budgetActivate) {
    const applied = applyBudgetSettings();
    if (!applied) {
      return;
    }
    updateBudgetButtons();
    closeWizard();
    renderExpenses();
    return;
  }

  const sortButton = target.closest(".vg-sort-btn");
  if (sortButton) {
    const category = sortButton.closest(".vg-category")?.dataset.category;
    if (category) {
      viewState.sortBy[category] = sortButton.dataset.sort;
      renderExpenses();
    }
    return;
  }

  const categoryHeader = target.closest(".vg-category-header");
  if (categoryHeader) {
    const category = categoryHeader.closest(".vg-category")?.dataset.category;
    if (category) {
      if (viewState.openCategories.has(category)) {
        viewState.openCategories.delete(category);
      } else {
        viewState.openCategories.add(category);
      }
      renderExpenses();
    }
    return;
  }

  const deleteButton = target.closest(".vg-delete-btn");
  if (deleteButton) {
    const expenseId = deleteButton.dataset.expenseId;
    if (!expenseId) {
      return;
    }
    const confirmed = window.confirm("¿Eliminar este gasto?");
    if (!confirmed) {
      return;
    }
    const item = deleteButton.closest(".vg-expense-item");
    if (item) {
      item.style.maxHeight = `${item.offsetHeight}px`;
      item.offsetHeight;
      item.classList.add("is-removing");
      item.style.maxHeight = "0px";
    }
    setTimeout(async () => {
      try {
        await deleteExpenseFromSupabase(expenseId);
        renderExpenses();
      } catch (error) {
        if (item) {
          item.classList.remove("is-removing");
          item.style.maxHeight = "";
        }
        handleUIError(error, "No se pudo eliminar el gasto.");
      }
    }, 180);
    return;
  }

  const evolutionPrevBtn = target.closest("#evolution-prev");
  if (evolutionPrevBtn) {
    evolutionMode = (evolutionMode + 2) % 3;
    renderCharts(loadExpenses());
    updateEvolutionDots();
    return;
  }

  const evolutionNextBtn = target.closest("#evolution-next");
  if (evolutionNextBtn) {
    evolutionMode = (evolutionMode + 1) % 3;
    renderCharts(loadExpenses());
    updateEvolutionDots();
    return;
  }

  const evolutionDot = target.closest(".vg-dot");
  if (evolutionDot) {
    const index = Number(evolutionDot.dataset.index);
    if (!Number.isNaN(index)) {
      evolutionMode = index;
      renderCharts(loadExpenses());
      updateEvolutionDots();
    }
  }
}, "Error en interacción. Reiniciando…");

const setCategory = (category, button) => {
  state.category = category;
  document.querySelectorAll(".cat-card").forEach((card) => {
    card.classList.toggle("selected", card.dataset.category === category);
  });
  if (button) {
    button.blur();
  }
};

const openSettingsModal = () => toggleModal(settingsModal, true);
const closeSettingsModal = () => toggleModal(settingsModal, false);

const openCurrencyModal = () => toggleModal(currencyModal, true);
const closeCurrencyModal = () => toggleModal(currencyModal, false);
const openDateModal = () => toggleModal(dateModal, true);
const closeDateModal = () => toggleModal(dateModal, false);

const createPill = (label, value, type) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "pill";
  button.textContent = label;
  button.dataset.value = value;
  button.dataset.type = type;
  return button;
};

const renderDatePills = () => {
  datePills.innerHTML = "";
  if (state.dateMode === "day") {
    for (let day = 1; day <= 31; day += 1) {
      const button = createPill(String(day), String(day), "day");
      if (day === state.dateSelection.day) {
        button.classList.add("is-active");
      }
      datePills.appendChild(button);
    }
    return;
  }
  if (state.dateMode === "month") {
    monthNames.forEach((name, index) => {
      const label = name.charAt(0).toUpperCase() + name.slice(1);
      const button = createPill(label, String(index), "month");
      if (index === state.dateSelection.month) {
        button.classList.add("is-active");
      }
      datePills.appendChild(button);
    });
    return;
  }
  const currentYear = new Date().getFullYear();
  for (let year = currentYear - 5; year <= currentYear + 1; year += 1) {
    const button = createPill(String(year), String(year), "year");
    if (year === state.dateSelection.year) {
      button.classList.add("is-active");
    }
    datePills.appendChild(button);
  }
};

const updateDateSelection = (type, value) => {
  if (type === "day") {
    state.dateSelection.day = Number(value);
  }
  if (type === "month") {
    state.dateSelection.month = Number(value);
    if (state.dateMode === "month") {
      state.dateSelection.day = 1;
    }
  }
  if (type === "year") {
    state.dateSelection.year = Number(value);
    if (state.dateMode === "year") {
      state.dateSelection.day = 1;
    }
  }
};

const buildDateFromSelection = () => {
  const { day, month, year } = state.dateSelection;
  const candidate = new Date(year, month, day);
  if (candidate.getMonth() !== month) {
    return new Date(year, month + 1, 0);
  }
  return candidate;
};

const buildYearOptions = (expenses) => {
  const years = new Set(
    expenses.map((item) => Number((item.dateISO || item.date).slice(0, 4)))
  );
  const currentYear = new Date().getFullYear();
  years.add(currentYear);
  const sorted = Array.from(years).sort((a, b) => b - a);
  yearSelect.innerHTML = "";
  sorted.forEach((year) => {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    yearSelect.appendChild(option);
  });
  yearSelect.value = String(currentYear);
};

const buildMonthOptions = () => {
  monthSelect.innerHTML = "";
  monthNames.forEach((name, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    monthSelect.appendChild(option);
  });
  monthSelect.value = String(new Date().getMonth());
};

const buildAmountLabel = (totals) => {
  const entries = Object.entries(totals);
  if (!entries.length) {
    return { main: "0,00 €", breakdown: [] };
  }
  if (entries.length === 1) {
    const [currency, value] = entries[0];
    return {
      main: `${formatAmount(value)} ${currencySymbols[currency]}`,
      breakdown: [],
    };
  }
  return {
    main: "Totales por divisa",
    breakdown: entries.map(
      ([currency, value]) => `${currency}: ${formatAmount(value)} ${currencySymbols[currency]}`
    ),
  };
};

const getCategoryEmoji = (category) =>
  CATEGORIES.find((item) => item.key === category)?.emoji ?? "✨";
const categoryList = CATEGORIES.map((category) => category.key);
const normalizeCategory = (category) =>
  CATEGORY_KEYS.has(category) ? category : CATEGORY_FALLBACK;
const monthLabels = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];
const chartPalette = [
  "#1F6BFF",
  "#16A34A",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#0EA5E9",
  "#22D3EE",
  "#F97316",
  "#10B981",
  "#A855F7",
];

let evolutionChart = null;
let donutChart = null;
let evolutionMode = 0;

const getSelectedYearMonth = () => {
  const year = yearSelect.value;
  const monthIndex = String(Number(monthSelect.value) + 1).padStart(2, "0");
  return `${year}-${monthIndex}`;
};

const buildBudgetMonthOptions = () => {
  const selectedYear = yearSelect.value;
  if (!budgetMonthSelect) {
    return;
  }
  budgetMonthSelect.innerHTML = "";
  monthNames.forEach((name, index) => {
    const option = document.createElement("option");
    option.value = `${selectedYear}-${String(index + 1).padStart(2, "0")}`;
    option.textContent = `${name.charAt(0).toUpperCase() + name.slice(1)} ${selectedYear}`;
    budgetMonthSelect.appendChild(option);
  });
};

const getBudgetForSelectedMonth = (yyyyMM) => {
  if (budgetState.mode === "monthly") {
    const monthlyBudget = budgetState.monthly?.[yyyyMM];
    if (!monthlyBudget) {
      return null;
    }
    return {
      monthlyTotal: Number(monthlyBudget.monthlyTotal || 0),
      categories: monthlyBudget.categories || {},
      currency: state.currency,
    };
  }
  if (budgetState.template) {
    return {
      monthlyTotal: Number(budgetState.template.monthlyTotal || 0),
      categories: budgetState.template.categories || {},
      currency: state.currency,
    };
  }
  return null;
};

const getSortMode = (category) => viewState.sortBy[category] || "date";

const sortExpensesForCategory = (expenses, category) => {
  const mode = getSortMode(category);
  return [...expenses].sort((a, b) => {
    if (mode === "amount") {
      return b.amount - a.amount;
    }
    return new Date(b.dateISO || b.date) - new Date(a.dateISO || a.date);
  });
};

const getBudgetProgress = (spent, budgetAmount) => {
  if (!budgetAmount || budgetAmount <= 0) {
    return { percent: 0, width: 0, color: "#16A34A" };
  }
  const rawPercent = Math.min((spent / budgetAmount) * 100, 999);
  const width = Math.min(rawPercent, 100);
  let color = "#16A34A";
  if (rawPercent >= 90) {
    color = "#EF4444";
  } else if (rawPercent >= 70) {
    color = "#F59E0B";
  }
  return { percent: Math.round(rawPercent), width, color };
};

const updateMonthlyBudgetBar = (filtered) => {
  const activeBudget = getBudgetForSelectedMonth(getSelectedYearMonth());
  if (!activeBudget || activeBudget.monthlyTotal <= 0) {
    monthlyBudgetBar.classList.remove("is-visible");
    monthlyBudgetBar.setAttribute("aria-hidden", "true");
    monthlyBudgetText.textContent = "";
    return;
  }
  const spent = filtered
    .filter((expense) => expense.currency === activeBudget.currency)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const progress = getBudgetProgress(spent, activeBudget.monthlyTotal);
  monthlyBudgetFill.style.width = `${progress.width}%`;
  monthlyBudgetFill.style.background = progress.color;
  monthlyBudgetTooltip.textContent = `Has gastado el ${progress.percent}% del presupuesto`;
  monthlyBudgetText.textContent = `${Math.round(spent)}/${Math.round(
    activeBudget.monthlyTotal
  )} ${activeBudget.currency}`;
  monthlyBudgetBar.classList.add("is-visible");
  monthlyBudgetBar.setAttribute("aria-hidden", "false");
};

const buildCategoryBudgetBar = (category, subtotal, currency) => {
  const activeBudget = getBudgetForSelectedMonth(getSelectedYearMonth());
  const budgetAmount = activeBudget?.categories?.[category];
  if (!activeBudget || !budgetAmount || budgetAmount <= 0) {
    return null;
  }
  if (currency && currency !== activeBudget.currency) {
    return null;
  }
  const container = document.createElement("div");
  container.className = "vg-budget-row vg-category-budget";
  const bar = document.createElement("div");
  bar.className = "vg-budget-bar";
  bar.classList.add("is-visible");
  const fill = document.createElement("span");
  fill.className = "vg-budget-fill";
  const tooltip = document.createElement("span");
  tooltip.className = "vg-budget-tooltip";
  const text = document.createElement("span");
  text.className = "vg-budget-text";
  const progress = getBudgetProgress(subtotal, budgetAmount);
  fill.style.width = `${progress.width}%`;
  fill.style.background = progress.color;
  tooltip.textContent = `Has gastado el ${progress.percent}% del presupuesto de ${category}`;
  text.textContent = `${Math.round(subtotal)}/${Math.round(budgetAmount)} ${
    activeBudget.currency
  }`;
  bar.append(fill, tooltip);
  container.append(bar, text);
  return container;
};

const setWizardStep = (step) => {
  budgetStepLabel.textContent = String(step + 1);
  document.querySelectorAll(".vg-step-panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.step === String(step));
  });
  if (step === 2) {
    budgetStepRef.textContent = `Presupuesto mensual: ${formatAmount(
      Number(budgetMonthlyAmount.value || 0)
    )} ${state.currency}`;
    if (budgetState.mode === "monthly") {
      budgetStepMonth.textContent = `Mes del presupuesto: ${formatMonthKey(
        budgetMonthSelect?.value || getSelectedYearMonth()
      )}`;
    } else {
      budgetStepMonth.textContent = "";
    }
  }
  if (step === 1) {
    if (budgetState.mode === "monthly") {
      buildBudgetMonthOptions();
      budgetMonthSelector?.classList.add("is-visible");
      budgetMonthSelect.value = budgetMonthSelect.value || getSelectedYearMonth();
    } else {
      budgetMonthSelector?.classList.remove("is-visible");
    }
  }
};

const openWizard = () => {
  budgetView.classList.add("is-hidden");
  budgetWizard.style.display = "";
  budgetWizard.classList.add("is-visible");
  budgetWizard.classList.remove("is-hidden");
  budgetWizard.setAttribute("aria-hidden", "false");
  budgetModeTemplate.classList.toggle("is-active", budgetState.mode === "template");
  budgetModeMonthly.classList.toggle("is-active", budgetState.mode === "monthly");
  setWizardStep(0);
};

const closeWizard = () => {
  budgetView.classList.remove("is-hidden");
  budgetWizard.classList.remove("is-visible");
  budgetWizard.classList.add("is-hidden");
  budgetWizard.style.display = "none";
  budgetWizard.setAttribute("aria-hidden", "true");
  setWizardStep(0);
};

const loadBudgetIntoWizard = (settings) => {
  budgetMonthlyAmount.value = settings.monthlyTotal || "";
  document.querySelectorAll("[data-category-budget]").forEach((input) => {
    const category = input.dataset.categoryBudget;
    input.value = settings.categories?.[category] ?? "";
  });
  if (budgetState.mode === "monthly" && budgetMonthSelect) {
    buildBudgetMonthOptions();
    budgetMonthSelect.value = getSelectedYearMonth();
  }
};

const getEditableBudgetForMonth = (yyyyMM) => {
  if (budgetState.mode === "monthly") {
    const override = budgetState.monthly?.[yyyyMM];
    return {
      monthlyTotal: override?.monthlyTotal || 0,
      categories: override?.categories || {},
    };
  }
  return {
    monthlyTotal: budgetState.template?.monthlyTotal || 0,
    categories: budgetState.template?.categories || {},
  };
};

const applyBudgetSettings = () => {
  const monthlyAmount = Number(budgetMonthlyAmount.value || 0);
  if (monthlyAmount <= 0) {
    window.alert("Ingresa un presupuesto mensual válido.");
    return false;
  }
  const categories = {};
  document.querySelectorAll("[data-category-budget]").forEach((input) => {
    const value = Number(input.value);
    if (value > 0) {
      categories[input.dataset.categoryBudget] = value;
    }
  });

  if (budgetState.mode === "monthly") {
    const monthKey = budgetMonthSelect?.value || getSelectedYearMonth();
    budgetState.monthly[monthKey] = { monthlyTotal: monthlyAmount, categories };
  } else {
    budgetState.template = { monthlyTotal: monthlyAmount, categories };
  }
  saveBudgets(budgetState);
  return true;
};

const updateBudgetButtons = () => {
  const cta = document.querySelector(".vg-budget-cta");
  const active = getBudgetForSelectedMonth(getSelectedYearMonth());
  const hasActive = Boolean(active?.monthlyTotal);
  if (budgetState.mode === "monthly") {
    budgetMonthlyNote.classList.toggle("is-visible", !hasActive);
    budgetStartBtn.textContent = "Configurar presupuesto";
    budgetEditBtn.textContent = "Editar presupuesto";
    budgetDisableBtn.textContent = "Quitar presupuesto";
  } else {
    budgetMonthlyNote.classList.remove("is-visible");
    budgetStartBtn.textContent = "Configurar presupuesto";
    budgetEditBtn.textContent = "Editar presupuesto";
    budgetDisableBtn.textContent = "Quitar presupuesto";
  }
  cta.classList.toggle("is-enabled", hasActive);
};

const setupBudgetTooltip = (bar) => {
  if (!bar) {
    return;
  }
  bar.addEventListener("click", () => {
    bar.classList.add("is-active");
    setTimeout(() => bar.classList.remove("is-active"), 1500);
  });
};

const buildYearSeries = (expenses, year) => {
  const totals = Array.from({ length: 12 }, () => 0);
  const stacked = {};
  let totalSpent = 0;
  categoryList.forEach((category) => {
    stacked[category] = Array.from({ length: 12 }, () => 0);
  });
  expenses.forEach((expense) => {
    const date = new Date(expense.dateISO || expense.date);
    if (date.getFullYear() !== year) {
      return;
    }
    const month = date.getMonth();
    totals[month] += expense.amount;
    totalSpent += expense.amount;
    const normalizedCategory = normalizeCategory(expense.category);
    if (stacked[normalizedCategory]) {
      stacked[normalizedCategory][month] += expense.amount;
    }
  });
  return { totals, stacked, totalSpent };
};

const buildBudgetSeriesForYear = (year) => {
  const totals = [];
  for (let month = 1; month <= 12; month += 1) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const active = getBudgetForSelectedMonth(key);
    totals.push(active?.monthlyTotal ? active.monthlyTotal : null);
  }
  return totals;
};

const destroyChart = (chart) => {
  if (chart) {
    chart.destroy();
  }
};

const buildBaseOptions = () => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 200 },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => {
          const value = context.raw ?? 0;
          const label = context.dataset?.label || context.label || "";
          return label ? `${label}: ${formatAmount(value)}` : `${formatAmount(value)}`;
        },
      },
    },
  },
  scales: {
    x: { grid: { display: false } },
    y: { ticks: { callback: (value) => formatAmount(value) } },
  },
});

const renderEvolutionChart = (series) => {
  destroyChart(evolutionChart);
  if (!window.Chart) {
    return;
  }
  evolutionEmpty.classList.remove("is-visible");
  const baseOptions = buildBaseOptions();
  if (evolutionMode === 0) {
    evolutionTitle.textContent = "Total por mes";
    if (!series.totalSpent) {
      evolutionEmpty.textContent = "Sin datos para este año";
      evolutionEmpty.classList.add("is-visible");
      return;
    }
    evolutionChart = new Chart(evolutionChartCanvas, {
      type: "line",
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: "Total",
            data: series.totals,
            borderColor: "#1F6BFF",
            backgroundColor: "transparent",
            tension: 0.35,
            fill: false,
          },
        ],
      },
      options: {
        ...baseOptions,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${formatAmount(context.raw ?? 0)}`,
            },
          },
        },
      },
    });
    return;
  }
  if (evolutionMode === 1) {
    evolutionTitle.textContent = "Repartición por mes";
    if (!series.totalSpent) {
      evolutionEmpty.textContent = "Sin datos para este año";
      evolutionEmpty.classList.add("is-visible");
      return;
    }
    const datasets = categoryList.map((category, index) => ({
      label: category,
      data: series.stacked[category],
      backgroundColor: chartPalette[index],
      borderRadius: 6,
    }));
    evolutionChart = new Chart(evolutionChartCanvas, {
      type: "bar",
      data: { labels: monthLabels, datasets },
      options: {
        ...baseOptions,
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, ticks: { callback: (value) => formatAmount(value) } },
        },
      },
    });
    return;
  }

  evolutionTitle.textContent = "Gasto vs Presupuesto";
  const selectedYear = Number(yearSelect.value);
  const budgetLine = buildBudgetSeriesForYear(selectedYear);
  const hasAnyBudget = budgetLine.some((value) => value !== null && value > 0);
  if (!hasAnyBudget) {
    evolutionEmpty.textContent = "Configura un presupuesto para ver esta comparación.";
    evolutionEmpty.classList.add("is-visible");
    return;
  }
  evolutionChart = new Chart(evolutionChartCanvas, {
    type: "line",
    data: {
      labels: monthLabels,
      datasets: [
        {
          label: "Gasto",
          data: series.totals,
          borderColor: "#1F6BFF",
          backgroundColor: "transparent",
          tension: 0.35,
        },
        {
          label: "Presupuesto",
          data: budgetLine,
          borderColor: "#16A34A",
          backgroundColor: "transparent",
          tension: 0.35,
          borderDash: [6, 6],
          spanGaps: false,
        },
      ],
    },
    options: baseOptions,
  });
};

const renderDonutChart = (expenses, year, month) => {
  destroyChart(donutChart);
  if (!window.Chart) {
    return;
  }
  const totals = categoryList
    .map((category) => {
      const value = expenses
        .filter((expense) => {
          const date = new Date(expense.dateISO || expense.date);
          return (
            date.getFullYear() === year &&
            date.getMonth() === month &&
            normalizeCategory(expense.category) === category
          );
        })
        .reduce((sum, expense) => sum + expense.amount, 0);
      return { category, value };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  monthDonutList.innerHTML = "";
  if (!totals.length) {
    monthDonutEmpty.classList.add("is-visible");
    return;
  }
  monthDonutEmpty.classList.remove("is-visible");
  const totalValue = totals.reduce((sum, item) => sum + item.value, 0);
  const fallbackExpense = expenses.find((expense) => {
    const date = new Date(expense.dateISO || expense.date);
    return date.getFullYear() === year && date.getMonth() === month;
  });
  const budgetForMonth = getBudgetForSelectedMonth(`${year}-${String(month).padStart(2, "0")}`);
  const currencyCode = budgetForMonth?.currency || fallbackExpense?.currency || state.currency;
  totals.forEach((item) => {
    const row = document.createElement("div");
    row.className = "vg-donut-item";
    const meta = document.createElement("div");
    meta.className = "vg-donut-meta";
    const emoji = document.createElement("span");
    emoji.textContent = getCategoryEmoji(item.category);
    const name = document.createElement("span");
    name.textContent = item.category;
    meta.append(emoji, name);

    const value = document.createElement("div");
    value.className = "vg-donut-value";
    const percent = totalValue ? Math.round((item.value / totalValue) * 100) : 0;
    value.textContent = `${formatAmount(item.value)} ${currencyCode}`;
    const percentSpan = document.createElement("span");
    percentSpan.className = "vg-donut-percent";
    percentSpan.textContent = `${percent}%`;
    value.appendChild(percentSpan);
    row.append(meta, value);
    monthDonutList.appendChild(row);
  });

  donutChart = new Chart(monthDonutCanvas, {
    type: "doughnut",
    data: {
      labels: totals.map((item) => item.category),
      datasets: [
        {
          data: totals.map((item) => item.value),
          backgroundColor: totals.map(
            (item) => chartPalette[categoryList.indexOf(item.category)]
          ),
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 200 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.raw ?? 0;
              const percent = totalValue
                ? Math.round((value / totalValue) * 100)
                : 0;
              return `${context.label}: ${formatAmount(value)} ${currencyCode} (${percent}%)`;
            },
          },
        },
      },
    },
  });
};

const renderCharts = (expenses) => {
  const selectedYear = Number(yearSelect.value);
  const selectedMonth = Number(monthSelect.value);
  const series = buildYearSeries(expenses, selectedYear);
  renderEvolutionChart(series);
  renderDonutChart(expenses, selectedYear, selectedMonth);
  updateEvolutionDots();
};

const updateEvolutionDots = () => {
  if (!evolutionDots) {
    return;
  }
  evolutionDots.querySelectorAll(".vg-dot").forEach((dot, index) => {
    dot.classList.toggle("is-active", index === evolutionMode);
  });
};

const setupEvolution = () => {
  if (!evolutionPrev || !evolutionNext || !evolutionDots) {
    return;
  }
  evolutionDots.innerHTML = "";
  for (let i = 0; i < 3; i += 1) {
    const dot = document.createElement("span");
    dot.className = "vg-dot";
    dot.dataset.index = String(i);
    if (i === evolutionMode) {
      dot.classList.add("is-active");
    }
    evolutionDots.appendChild(dot);
  }
};

const renderExpenses = () => {
  const expenses = loadExpenses();
  const selectedYear = Number(yearSelect.value);
  const selectedMonth = Number(monthSelect.value);

  const filtered = expenses
    .filter((expense) => {
      const date = new Date(expense.dateISO || expense.date);
      return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
    })
    .sort((a, b) => new Date(b.dateISO || b.date) - new Date(a.dateISO || a.date));

  const totals = {};
  filtered.forEach((expense) => {
    totals[expense.currency] = (totals[expense.currency] || 0) + expense.amount;
  });
  const monthTotal = buildAmountLabel(totals);
  document.getElementById("month-total").textContent = monthTotal.main;
  monthTotalBreakdown.innerHTML = "";
  if (monthTotal.breakdown.length) {
    monthTotal.breakdown.forEach((line) => {
      const item = document.createElement("span");
      item.textContent = line;
      monthTotalBreakdown.appendChild(item);
    });
  }
  updateBudgetButtons();
  updateMonthlyBudgetBar(filtered);
  setupBudgetTooltip(monthlyBudgetBar);
  renderCharts(expenses);

  const grouped = {};
  filtered.forEach((expense) => {
    const normalizedCategory = normalizeCategory(expense.category);
    if (!grouped[normalizedCategory]) {
      grouped[normalizedCategory] = [];
    }
    grouped[normalizedCategory].push({
      ...expense,
      category: normalizedCategory,
    });
  });

  expensesList.innerHTML = "";

  Object.keys(grouped).forEach((category) => {
    const categoryCard = document.createElement("div");
    categoryCard.className = "vg-category";
    categoryCard.dataset.category = category;
    const isOpen = viewState.openCategories.has(category);
    if (isOpen) {
      categoryCard.classList.add("is-open");
    }

    const header = document.createElement("button");
    header.type = "button";
    header.className = "vg-category-header";
    header.setAttribute("aria-expanded", String(isOpen));

    const title = document.createElement("div");
    title.className = "vg-category-title";
    const emoji = document.createElement("span");
    emoji.textContent = getCategoryEmoji(category);
    const name = document.createElement("span");
    name.textContent = category;
    title.append(emoji, name);

    const subtotalTotals = {};
    grouped[category].forEach((expense) => {
      subtotalTotals[expense.currency] =
        (subtotalTotals[expense.currency] || 0) + expense.amount;
    });

    const right = document.createElement("div");
    right.className = "vg-category-right";
    const meta = document.createElement("div");
    meta.className = "vg-category-meta";
    const subtotal = document.createElement("span");
    subtotal.className = "vg-category-subtotal";
    subtotal.textContent = buildAmountLabel(subtotalTotals).main;
    meta.appendChild(subtotal);

    const activeBudget = getBudgetForSelectedMonth(getSelectedYearMonth());
    const currencyForBudget = activeBudget?.currency || "EUR";
    const subtotalForCurrency = grouped[category]
      .filter((expense) => expense.currency === currencyForBudget)
      .reduce((sum, expense) => sum + expense.amount, 0);
    const categoryBudgetBar = buildCategoryBudgetBar(
      category,
      subtotalForCurrency,
      currencyForBudget
    );
    if (categoryBudgetBar) {
      meta.appendChild(categoryBudgetBar);
      setupBudgetTooltip(categoryBudgetBar.querySelector(".vg-budget-bar"));
    }

    const chevron = document.createElement("span");
    chevron.className = "vg-chevron";
    chevron.textContent = "⌄";
    right.append(meta, chevron);

    header.append(title, right);
    categoryCard.appendChild(header);

    const body = document.createElement("div");
    body.className = "vg-category-body";

    if (isOpen) {
      const toggle = document.createElement("div");
      toggle.className = "vg-sort-toggle";
      const dateBtn = document.createElement("button");
      dateBtn.type = "button";
      dateBtn.className = "vg-sort-btn";
      dateBtn.textContent = "Fecha";
      dateBtn.dataset.sort = "date";
      const amountBtn = document.createElement("button");
      amountBtn.type = "button";
      amountBtn.className = "vg-sort-btn";
      amountBtn.textContent = "Cantidad";
      amountBtn.dataset.sort = "amount";

      const activeSort = getSortMode(category);
      if (activeSort === "date") {
        dateBtn.classList.add("is-active");
      } else {
        amountBtn.classList.add("is-active");
      }

      toggle.append(dateBtn, amountBtn);
      body.appendChild(toggle);

      sortExpensesForCategory(grouped[category], category).forEach((expense) => {
        const item = document.createElement("div");
        item.className = "vg-expense-item";

        const meta = document.createElement("div");
        meta.className = "expense-meta";
        const concept = document.createElement("span");
        concept.textContent = expense.concept;
        const date = document.createElement("span");
        date.className = "expense-date";
        date.textContent = formatDateText(new Date(expense.dateISO || expense.date));
        meta.append(concept, date);

        const actions = document.createElement("div");
        actions.className = "vg-expense-actions";
        const amount = document.createElement("div");
        amount.className = "expense-amount";
        amount.textContent = `${formatAmount(expense.amount)} ${currencySymbols[expense.currency]}`;

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "vg-delete-btn";
        deleteBtn.textContent = "🗑️";
        deleteBtn.setAttribute("aria-label", "Eliminar gasto");
        deleteBtn.dataset.expenseId = expense.id;

        actions.append(amount, deleteBtn);
        item.append(meta, actions);
        body.appendChild(item);
      });
    }

    categoryCard.appendChild(body);

    expensesList.appendChild(categoryCard);

    if (isOpen) {
      requestAnimationFrame(() => {
        body.style.maxHeight = `${body.scrollHeight}px`;
      });
    } else {
      body.style.maxHeight = "0px";
    }
  });

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "vg-empty";
    empty.textContent = "No hay gastos para este mes.";
    expensesList.appendChild(empty);
  }
};

const resetForm = () => {
  conceptInput.value = "";
  state.amount = 0;
  updateAmountDisplay();
  amountInput.value = "";
  document.querySelectorAll(".cat-card").forEach((card) => {
    card.classList.remove("selected");
  });
  state.category = null;
};

const handleLogout = async () => {
  if (isLoggingOut) {
    return;
  }
  isLoggingOut = true;
  try {
    closeSettingsModal();
    const session = await getSession();
    if (!session) {
      closeAllModals();
      showLogin();
      return;
    }
    await signOut();
  } catch (error) {
    handleUIError(error, "No se pudo cerrar sesión.");
  } finally {
    isLoggingOut = false;
  }
};

const handleSave = async () => {
  if (isSavingExpense) {
    return;
  }
  const concept = conceptInput.value.trim();
  if (!concept) {
    window.alert("Escribe un concepto.");
    return;
  }
  if (!state.category) {
    window.alert("Selecciona una categoría.");
    return;
  }
  if (state.amount <= 0) {
    window.alert("La cantidad debe ser mayor que 0.");
    return;
  }

  const expense = {
    concept,
    amount: Number(state.amount),
    currency: state.currency,
    category: state.category,
    dateISO: state.date.toISOString().slice(0, 10),
  };

  isSavingExpense = true;
  saveBtn.disabled = true;
  try {
    const session = await getSession();
    if (!session) {
      closeAllModals();
      showLogin();
      return;
    }
    await insertExpenseToSupabase(expense);
    showToast("✅ Gasto guardado");
    buildYearOptions(loadExpenses());
    renderExpenses();
    resetForm();
  } catch (error) {
    handleUIError(error, "No se pudo guardar el gasto.");
  } finally {
    isSavingExpense = false;
    saveBtn.disabled = false;
  }
};

const setupTabs = () => {};

const setupAmountControl = () => {
  const applyAmountInput = () => {
    const value = Number(amountInput.value.replace(",", "."));
    if (!Number.isNaN(value)) {
      state.amount = Math.max(0, value);
      updateAmountDisplay();
    }
    amountInput.classList.remove("is-visible");
  };

  amountInput.addEventListener("blur", applyAmountInput);
  amountInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      applyAmountInput();
    }
  });
};

const setupCategorySelection = () => {};

const setupSettingsMenu = () => {};

const setupCurrencyModal = () => {};

const setupDateModal = () => {};

const setupFilters = () => {
  yearSelect.addEventListener("change", renderExpenses);
  monthSelect.addEventListener("change", renderExpenses);
};

const setupBudgets = () => {
  Object.assign(budgetState, loadBudgets());
  updateBudgetButtons();
  budgetModeTemplate.addEventListener("click", () => {
    budgetState.mode = "template";
    saveBudgets(budgetState);
    budgetModeTemplate.classList.add("is-active");
    budgetModeMonthly.classList.remove("is-active");
    setWizardStep(1);
  });
  budgetModeMonthly.addEventListener("click", () => {
    budgetState.mode = "monthly";
    saveBudgets(budgetState);
    budgetModeMonthly.classList.add("is-active");
    budgetModeTemplate.classList.remove("is-active");
    setWizardStep(1);
  });
  budgetStartBtn.addEventListener("click", () => {
    const editable = getEditableBudgetForMonth(getSelectedYearMonth());
    loadBudgetIntoWizard(editable);
    openWizard();
  });
  budgetEditBtn.addEventListener("click", () => {
    const editable = getEditableBudgetForMonth(getSelectedYearMonth());
    loadBudgetIntoWizard(editable);
    openWizard();
  });
  budgetDisableBtn.addEventListener("click", () => {
    const monthKey = getSelectedYearMonth();
    if (budgetState.mode === "monthly") {
      delete budgetState.monthly[monthKey];
    } else {
      budgetState.template = null;
    }
    saveBudgets(budgetState);
    updateBudgetButtons();
    renderExpenses();
  });
  budgetBackBtn.addEventListener("click", closeWizard);

  budgetNext1.addEventListener("click", () => {
    const amount = Number(budgetMonthlyAmount.value || 0);
    if (amount <= 0) {
      window.alert("Ingresa un presupuesto mensual válido.");
      return;
    }
    setWizardStep(2);
  });

  budgetSkip.addEventListener("click", () => {
    document.querySelectorAll("[data-category-budget]").forEach((input) => {
      input.value = "";
    });
    const applied = applyBudgetSettings();
    if (!applied) {
      return;
    }
    updateBudgetButtons();
    closeWizard();
    renderExpenses();
  });

  budgetActivate.addEventListener("click", () => {
    const applied = applyBudgetSettings();
    if (!applied) {
      return;
    }
    updateBudgetButtons();
    closeWizard();
    renderExpenses();
  });
};

const refreshAppData = async () => {
  setAuthLoading(true, "Sincronizando gastos…");
  try {
    resetDateToToday();
    const expenses = await fetchExpensesFromSupabase();
    buildYearOptions(expenses);
    buildMonthOptions();
    renderExpenses();
  } catch (error) {
    window.alert("No se pudieron cargar los gastos desde Supabase.");
  } finally {
    setAuthLoading(false);
  }
};

const setupAuth = () => {};

const setupGlobalErrorHandlers = () => {
  window.addEventListener("error", (event) => {
    window.__lastFluxoError = event.error || event.message;
    console.error(window.__lastFluxoError);
    showToast("Se produjo un error. Reiniciando…");
    safeResetUI();
  });
  window.addEventListener("unhandledrejection", (event) => {
    window.__lastFluxoError = event.reason;
    console.error(window.__lastFluxoError);
    showToast("Se produjo un error. Reiniciando…");
    safeResetUI();
  });
};

const bindUIOnce = () => {
  if (uiBound) {
    return;
  }
  uiBound = true;
  document.addEventListener("click", handleDocumentClick);
  setupTabs();
  setupAmountControl();
  setupCategorySelection();
  setupSettingsMenu();
  setupCurrencyModal();
  setupDateModal();
  setupFilters();
  setupBudgets();
  setupEvolution();
  setupGlobalErrorHandlers();
};

const bindAuthFormOnce = () => {
  if (authFormBound) {
    return;
  }
  authFormBound = true;
  authCard.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) {
      setAuthMessage("Completa email y password.");
      return;
    }

    authSubmit.disabled = true;
    saveLoginEmailToSession(email);
    setAuthMessage("");
    try {
      if (isAuthModeSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      setAuthMessage(getReadableAuthError(error));
    } finally {
      authSubmit.disabled = false;
    }
  });

  authToggle.addEventListener("click", () => {
    showAuthMode(!isAuthModeSignUp);
  });

  authEmail.addEventListener("input", () => {
    saveLoginEmailToSession(authEmail.value);
  });
};

const resumeApp = async (reason = "resume") => {
  if (isResumingApp) {
    pendingResumeReason = reason;
    return;
  }
  isResumingApp = true;
  try {
    setInFocus(true);
    closeAllModals();
    resetActionFlags();
    authSubmit.disabled = false;
    if (isAuthLoading) {
      setAuthLoading(false);
    }

    const sessionResult = await Promise.race([
      supabase.auth.getSession(),
      new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 2000)),
    ]);
    const session = sessionResult?.data?.session || null;

    activeSession = session;
    if (!session) {
      expensesCache = [];
      showLogin();
      return;
    }

    if (appShell.classList.contains("is-hidden")) {
      showApp();
    }
  } catch (error) {
    console.error(`[resumeApp:${reason}]`, error);
    showLogin();
  } finally {
    isResumingApp = false;
    if (pendingResumeReason) {
      const nextReason = pendingResumeReason;
      pendingResumeReason = "";
      resumeApp(nextReason);
    }
  }
};

const bindFocusListenersOnce = () => {
  if (focusListenersBound) {
    return;
  }
  focusListenersBound = true;

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      setInFocus(false);
      return;
    }
    resumeApp("visibilitychange");
  });

  window.addEventListener("blur", () => {
    setInFocus(false);
  });

  window.addEventListener("pagehide", () => {
    setInFocus(false);
  });

  window.addEventListener("focus", () => {
    resumeApp("focus");
  });

  window.addEventListener("pageshow", (event) => {
    resumeApp(event.persisted ? "pageshow_bfcache" : "pageshow");
  });
};

const initAuthAndRender = async () => {
  setBootState("boot_start");
  showLogin();
  setAuthLoading(true, "Cargando sesión…");

  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      setBootState("timeout_fallback");
      closeAllModals();
      showLogin();
      setAuthLoading(false);
      resolve(null);
    }, 1800);
  });

  try {
    const sessionResult = await Promise.race([
      supabase.auth.getSession(),
      timeoutPromise,
    ]);

    if (!sessionResult || !sessionResult.data) {
      return;
    }

    const { data, error } = sessionResult;
    if (error) {
      setBootState("auth_error");
      console.error(error);
      closeAllModals();
      showLogin();
      return;
    }

    const session = data.session;
    activeSession = session;
    if (session) {
      setBootState("session_ok");
      showApp();
      await refreshAppData();
    } else {
      setBootState("no_session");
      showLogin();
    }
  } catch (error) {
    setBootState("auth_error");
    console.error(error);
    closeAllModals();
    showLogin();
  } finally {
    clearTimeout(timeoutId);
    setAuthLoading(false);
  }
};

const registerAuthListenerOnce = () => {
  if (authBound) {
    return;
  }
  authBound = true;
  supabase.auth.onAuthStateChange(async (event, session) => {
    try {
      activeSession = session;
      if (!session) {
        setBootState("no_session");
        expensesCache = [];
        showLogin();
        return;
      }
      if (event === "SIGNED_OUT") {
        setBootState("no_session");
        expensesCache = [];
        showLogin();
        return;
      }
      if (event === "INITIAL_SESSION") {
        return;
      }
      setBootState("session_ok");
      showApp();
      if (event === "SIGNED_IN") {
        await refreshAppData();
      }
    } catch (error) {
      setBootState("auth_error");
      console.error(error);
      closeAllModals();
      showLogin();
    } finally {
      setAuthLoading(false);
    }
  });
};

const boot = async () => {
  resetDateToToday();
  showLogin();
  closeAllModals();
  hardSignOut();
  bindUIOnce();
  bindAuthFormOnce();
  bindFocusListenersOnce();
  showAuthMode(false);
  await initAuthAndRender();
  registerAuthListenerOnce();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    boot();
  });
} else {
  boot();
}
