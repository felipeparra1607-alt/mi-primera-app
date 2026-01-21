const STORAGE_KEY = "fluxo_expenses";
const BUDGET_KEY = "fluxo_budgets";

const state = {
  amount: 0,
  currency: "EUR",
  category: null,
  date: new Date(),
  dateSelection: {
    day: new Date().getDate(),
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  },
};

const viewState = {
  openCategories: new Set(),
  sortBy: {},
};

const budgetState = {
  enabled: false,
  monthly: { amount: 0, currency: "EUR" },
  categories: {},
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
const budgetNext2 = document.getElementById("budget-next-2");
const budgetSkip = document.getElementById("budget-skip");
const budgetActivate = document.getElementById("budget-activate");
const budgetMonthlyAmount = document.getElementById("budget-month-amount");
const budgetMonthlyCurrency = document.getElementById("budget-month-currency");
const budgetSummaryMonth = document.getElementById("budget-summary-month");
const budgetSummaryCategories = document.getElementById("budget-summary-categories");
const monthlyBudgetBar = document.getElementById("monthly-budget-bar");
const monthlyBudgetFill = document.getElementById("monthly-budget-fill");
const monthlyBudgetTooltip = document.getElementById("monthly-budget-tooltip");
const monthlyBudgetText = document.getElementById("monthly-budget-text");
const budgetStepRef = document.getElementById("budget-step-ref");

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

const formatDisplayDate = (date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const dateKey = date.toISOString().slice(0, 10);
  if (dateKey === today.toISOString().slice(0, 10)) {
    return `Hoy · ${formatDateText(date)}`;
  }
  if (dateKey === yesterday.toISOString().slice(0, 10)) {
    return `Ayer · ${formatDateText(date)}`;
  }
  return formatDateText(date);
};

const toggleModal = (modal, show) => {
  modal.classList.toggle("is-visible", show);
  modal.setAttribute("aria-hidden", String(!show));
};

const updateAmountDisplay = () => {
  amountDisplay.textContent = formatAmount(state.amount);
};

const updateCurrency = (currency) => {
  state.currency = currency;
  currencyPill.textContent = `${currency} ${currencySymbols[currency]}`;
};

const updateDateDisplay = () => {
  dateDisplay.textContent = formatDisplayDate(state.date);
};

const loadExpenses = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  try {
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
};

const saveExpenses = (expenses) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
};

const loadBudgets = () => {
  const raw = localStorage.getItem(BUDGET_KEY);
  if (!raw) {
    return { ...budgetState };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      enabled: Boolean(parsed.enabled),
      monthly: {
        amount: Number(parsed.monthly?.amount || 0),
        currency: parsed.monthly?.currency || "EUR",
      },
      categories: parsed.categories || {},
    };
  } catch (error) {
    return { ...budgetState };
  }
};

const saveBudgets = (budgets) => {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
};

const showToast = () => {
  toast.classList.add("is-visible");
  setTimeout(() => toast.classList.remove("is-visible"), 1400);
};

const setCategory = (category, button) => {
  state.category = category;
  document.querySelectorAll(".cat-card").forEach((card) => {
    card.classList.toggle("selected", card.dataset.category === category);
  });
  button.blur();
};

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
  const dayWrapper = document.createElement("div");
  dayWrapper.className = "date-group";
  const monthWrapper = document.createElement("div");
  monthWrapper.className = "date-group";
  const yearWrapper = document.createElement("div");
  yearWrapper.className = "date-group";

  const dayLabel = document.createElement("span");
  dayLabel.textContent = "Día";
  dayLabel.className = "group-label";
  const monthLabel = document.createElement("span");
  monthLabel.textContent = "Mes";
  monthLabel.className = "group-label";
  const yearLabel = document.createElement("span");
  yearLabel.textContent = "Año";
  yearLabel.className = "group-label";

  const dayRow = document.createElement("div");
  dayRow.className = "date-pills";
  for (let day = 1; day <= 31; day += 1) {
    const button = createPill(String(day), String(day), "day");
    if (day === state.dateSelection.day) {
      button.classList.add("is-active");
    }
    dayRow.appendChild(button);
  }

  const monthRow = document.createElement("div");
  monthRow.className = "date-pills";
  monthNames.forEach((name, index) => {
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    const button = createPill(label, String(index), "month");
    if (index === state.dateSelection.month) {
      button.classList.add("is-active");
    }
    monthRow.appendChild(button);
  });

  const yearRow = document.createElement("div");
  yearRow.className = "date-pills";
  const currentYear = new Date().getFullYear();
  for (let year = currentYear - 5; year <= currentYear + 1; year += 1) {
    const button = createPill(String(year), String(year), "year");
    if (year === state.dateSelection.year) {
      button.classList.add("is-active");
    }
    yearRow.appendChild(button);
  }

  dayWrapper.append(dayLabel, dayRow);
  monthWrapper.append(monthLabel, monthRow);
  yearWrapper.append(yearLabel, yearRow);
  datePills.append(dayWrapper, monthWrapper, yearWrapper);
};

const updateDateSelection = (type, value) => {
  if (type === "day") {
    state.dateSelection.day = Number(value);
  }
  if (type === "month") {
    state.dateSelection.month = Number(value);
  }
  if (type === "year") {
    state.dateSelection.year = Number(value);
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
  const years = new Set(expenses.map((item) => Number(item.date.slice(0, 4))));
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
    return "0,00 €";
  }
  return entries
    .map(([currency, value]) => `${formatAmount(value)} ${currencySymbols[currency]}`)
    .join(" · ");
};

const categoryMeta = {
  Restaurantes: { emoji: "🍽️" },
  Supermercado: { emoji: "🛒" },
  Transporte: { emoji: "🚗" },
  Gasolina: { emoji: "⛽" },
  Ocio: { emoji: "🎉" },
  Otros: { emoji: "✨" },
};

const getCategoryEmoji = (category) => categoryMeta[category]?.emoji ?? "✨";

const getSortMode = (category) => viewState.sortBy[category] || "date";

const sortExpensesForCategory = (expenses, category) => {
  const mode = getSortMode(category);
  return [...expenses].sort((a, b) => {
    if (mode === "amount") {
      return b.amount - a.amount;
    }
    return new Date(b.date) - new Date(a.date);
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
  if (!budgetState.enabled || budgetState.monthly.amount <= 0) {
    monthlyBudgetBar.classList.remove("is-visible");
    monthlyBudgetBar.setAttribute("aria-hidden", "true");
    monthlyBudgetText.textContent = "";
    return;
  }
  const spent = filtered
    .filter((expense) => expense.currency === budgetState.monthly.currency)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const progress = getBudgetProgress(spent, budgetState.monthly.amount);
  monthlyBudgetFill.style.width = `${progress.width}%`;
  monthlyBudgetFill.style.background = progress.color;
  monthlyBudgetTooltip.textContent = `Has usado el ${progress.percent}% de tu presupuesto mensual`;
  monthlyBudgetText.textContent = `${Math.round(spent)}/${Math.round(
    budgetState.monthly.amount
  )} ${budgetState.monthly.currency}`;
  monthlyBudgetBar.classList.add("is-visible");
  monthlyBudgetBar.setAttribute("aria-hidden", "false");
};

const buildCategoryBudgetBar = (category, subtotal, currency) => {
  const budgetAmount = budgetState.categories?.[category];
  if (!budgetState.enabled || !budgetAmount || budgetAmount <= 0) {
    return null;
  }
  if (currency && currency !== budgetState.monthly.currency) {
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
  tooltip.textContent = `Has usado el ${progress.percent}% del presupuesto de ${category}`;
  text.textContent = `${Math.round(subtotal)}/${Math.round(budgetAmount)} ${
    budgetState.monthly.currency
  }`;
  bar.append(fill, tooltip);
  container.append(bar, text);
  return container;
};

const setWizardStep = (step) => {
  budgetStepLabel.textContent = String(step);
  document.querySelectorAll(".vg-step-panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.step === String(step));
  });
  if (step === 2) {
    budgetStepRef.textContent = `Presupuesto mensual: ${formatAmount(
      Number(budgetMonthlyAmount.value || 0)
    )} ${budgetMonthlyCurrency.value}`;
  }
};

const openWizard = () => {
  budgetView.classList.add("is-hidden");
  budgetWizard.classList.add("is-visible");
  budgetWizard.setAttribute("aria-hidden", "false");
  setWizardStep(1);
};

const closeWizard = () => {
  budgetView.classList.remove("is-hidden");
  budgetWizard.classList.remove("is-visible");
  budgetWizard.setAttribute("aria-hidden", "true");
};

const loadBudgetIntoWizard = (budgets) => {
  budgetMonthlyAmount.value = budgets.monthly.amount || "";
  budgetMonthlyCurrency.value = budgets.monthly.currency || "EUR";
  document.querySelectorAll("[data-category-budget]").forEach((input) => {
    const category = input.dataset.categoryBudget;
    input.value = budgets.categories?.[category] ?? "";
  });
};

const buildWizardSummary = () => {
  budgetSummaryMonth.textContent = `Presupuesto mensual: ${formatAmount(
    Number(budgetMonthlyAmount.value || 0)
  )} ${budgetMonthlyCurrency.value}`;
  budgetSummaryCategories.innerHTML = "";
  document.querySelectorAll("[data-category-budget]").forEach((input) => {
    const value = Number(input.value);
    if (value > 0) {
      const item = document.createElement("div");
      item.className = "vg-summary-item";
      item.textContent = `${input.dataset.categoryBudget}: ${formatAmount(value)} ${
        budgetMonthlyCurrency.value
      }`;
      budgetSummaryCategories.appendChild(item);
    }
  });
};

const applyBudgetSettings = () => {
  const monthlyAmount = Number(budgetMonthlyAmount.value || 0);
  if (monthlyAmount <= 0) {
    window.alert("Ingresa un presupuesto mensual válido.");
    return false;
  }
  budgetState.enabled = true;
  budgetState.monthly = {
    amount: monthlyAmount,
    currency: budgetMonthlyCurrency.value,
  };
  const categories = {};
  document.querySelectorAll("[data-category-budget]").forEach((input) => {
    const value = Number(input.value);
    if (value > 0) {
      categories[input.dataset.categoryBudget] = value;
    }
  });
  budgetState.categories = categories;
  saveBudgets(budgetState);
  return true;
};

const updateBudgetButtons = () => {
  const cta = document.querySelector(".vg-budget-cta");
  cta.classList.toggle("is-enabled", budgetState.enabled);
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

const renderExpenses = () => {
  const expenses = loadExpenses();
  const selectedYear = Number(yearSelect.value);
  const selectedMonth = Number(monthSelect.value);

  const filtered = expenses
    .filter((expense) => {
      const date = new Date(expense.date);
      return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const totals = {};
  filtered.forEach((expense) => {
    totals[expense.currency] = (totals[expense.currency] || 0) + expense.amount;
  });
  document.getElementById("month-total").textContent = buildAmountLabel(totals);
  updateMonthlyBudgetBar(filtered);
  setupBudgetTooltip(monthlyBudgetBar);

  const grouped = {};
  filtered.forEach((expense) => {
    if (!grouped[expense.category]) {
      grouped[expense.category] = [];
    }
    grouped[expense.category].push(expense);
  });

  expensesList.innerHTML = "";

  Object.keys(grouped).forEach((category) => {
    const categoryCard = document.createElement("div");
    categoryCard.className = "vg-category";
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
    subtotal.textContent = buildAmountLabel(subtotalTotals);
    meta.appendChild(subtotal);

    const currencyForBudget = budgetState.monthly.currency;
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
        date.textContent = formatDateText(new Date(expense.date));
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
        deleteBtn.addEventListener("click", () => {
          const confirmed = window.confirm("¿Eliminar este gasto?");
          if (!confirmed) {
            return;
          }
          item.style.maxHeight = `${item.offsetHeight}px`;
          item.offsetHeight;
          item.classList.add("is-removing");
          item.style.maxHeight = "0px";
          setTimeout(() => {
            const updated = loadExpenses().filter((entry) => entry.id !== expense.id);
            saveExpenses(updated);
            renderExpenses();
          }, 180);
        });

        actions.append(amount, deleteBtn);
        item.append(meta, actions);
        body.appendChild(item);
      });
    }

    categoryCard.appendChild(body);
    header.addEventListener("click", () => {
      if (viewState.openCategories.has(category)) {
        viewState.openCategories.delete(category);
      } else {
        viewState.openCategories.add(category);
      }
      renderExpenses();
    });

    categoryCard.addEventListener("click", (event) => {
      if (!event.target.classList.contains("vg-sort-btn")) {
        return;
      }
      const sortValue = event.target.dataset.sort;
      viewState.sortBy[category] = sortValue;
      renderExpenses();
    });

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

const handleSave = () => {
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
    id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    concept,
    amount: Number(state.amount),
    currency: state.currency,
    category: state.category,
    date: state.date.toISOString().slice(0, 10),
  };

  const expenses = loadExpenses();
  expenses.push(expense);
  saveExpenses(expenses);
  showToast();
  buildYearOptions(expenses);
  renderExpenses();
  resetForm();
};

const setupTabs = () => {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      tabs.forEach((btn) => {
        btn.classList.toggle("is-active", btn === tab);
        btn.setAttribute("aria-selected", String(btn === tab));
      });
      panels.forEach((panel) => {
        panel.classList.toggle(
          "is-visible",
          panel.id === `tab-${target}`
        );
      });
    });
  });
};

const setupAmountControl = () => {
  document.querySelectorAll(".amount-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const delta = action === "increment" ? 1 : -1;
      state.amount = Math.max(0, state.amount + delta);
      updateAmountDisplay();
    });
  });

  const applyAmountInput = () => {
    const value = Number(amountInput.value.replace(",", "."));
    if (!Number.isNaN(value)) {
      state.amount = Math.max(0, value);
      updateAmountDisplay();
    }
    amountInput.classList.remove("is-visible");
  };

  amountDisplay.addEventListener("click", () => {
    amountInput.classList.add("is-visible");
    amountInput.value = state.amount.toString();
    amountInput.focus();
  });

  amountDisplay.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      amountInput.classList.add("is-visible");
      amountInput.value = state.amount.toString();
      amountInput.focus();
    }
  });

  amountInput.addEventListener("blur", applyAmountInput);
  amountInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      applyAmountInput();
    }
  });
};

const setupCategorySelection = () => {
  document.querySelectorAll(".cat-circle").forEach((button) => {
    button.addEventListener("click", (event) => {
      const card = event.currentTarget.closest(".cat-card");
      setCategory(card.dataset.category, button);
    });
  });
};

const setupCurrencyModal = () => {
  currencyPill.addEventListener("click", openCurrencyModal);
  currencyModal.querySelectorAll("button[data-currency]").forEach((btn) => {
    btn.addEventListener("click", () => {
      updateCurrency(btn.dataset.currency);
      closeCurrencyModal();
    });
  });
  currencyModal.querySelector(".modal-overlay").addEventListener("click", closeCurrencyModal);
};

const setupDateModal = () => {
  dateDisplay.addEventListener("click", () => {
    state.dateSelection = {
      day: state.date.getDate(),
      month: state.date.getMonth(),
      year: state.date.getFullYear(),
    };
    renderDatePills();
    openDateModal();
  });

  dateModal.querySelector(".modal-overlay").addEventListener("click", closeDateModal);

  dateModal.querySelectorAll("[data-quick]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const now = new Date();
      if (btn.dataset.quick === "yesterday") {
        now.setDate(now.getDate() - 1);
      }
      state.dateSelection = {
        day: now.getDate(),
        month: now.getMonth(),
        year: now.getFullYear(),
      };
      renderDatePills();
    });
  });

  datePills.addEventListener("click", (event) => {
    const target = event.target;
    if (!target.classList.contains("pill")) {
      return;
    }
    const { type, value } = target.dataset;
    updateDateSelection(type, value);
    renderDatePills();
  });

  confirmDateBtn.addEventListener("click", () => {
    state.date = buildDateFromSelection();
    updateDateDisplay();
    closeDateModal();
  });
};

const setupFilters = () => {
  yearSelect.addEventListener("change", renderExpenses);
  monthSelect.addEventListener("change", renderExpenses);
};

const setupBudgets = () => {
  Object.assign(budgetState, loadBudgets());
  updateBudgetButtons();
  budgetStartBtn.addEventListener("click", () => {
    loadBudgetIntoWizard(budgetState);
    openWizard();
  });
  budgetEditBtn.addEventListener("click", () => {
    loadBudgetIntoWizard(budgetState);
    openWizard();
  });
  budgetDisableBtn.addEventListener("click", () => {
    budgetState.enabled = false;
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
    buildWizardSummary();
    setWizardStep(3);
  });

  budgetNext2.addEventListener("click", () => {
    buildWizardSummary();
    setWizardStep(3);
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

const init = () => {
  setupTabs();
  setupAmountControl();
  setupCategorySelection();
  setupCurrencyModal();
  setupDateModal();
  setupFilters();
  setupBudgets();

  updateCurrency(state.currency);
  updateAmountDisplay();
  updateDateDisplay();
  const expenses = loadExpenses();
  buildYearOptions(expenses);
  buildMonthOptions();
  renderExpenses();

  saveBtn.addEventListener("click", handleSave);
};

init();
