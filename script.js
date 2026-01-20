/*
  Archivo de lógica:
  - Maneja el formulario, valida datos y actualiza la lista.
  - Guarda y lee los gastos desde localStorage.
  - Calcula el total del mes actual.
*/

const STORAGE_KEY = "expense-tracker-items";

const expenseForm = document.getElementById("expenseForm");
const conceptInput = document.getElementById("conceptInput");
const amountInput = document.getElementById("amountInput");
const categoryInput = document.getElementById("categoryInput");
const dateInput = document.getElementById("dateInput");
const decreaseAmount = document.getElementById("decreaseAmount");
const increaseAmount = document.getElementById("increaseAmount");
const categoryGrid = document.getElementById("categoryGrid");
const dateDisplay = document.getElementById("dateDisplay");
const dateModal = document.getElementById("dateModal");
const shortcutToday = document.getElementById("shortcutToday");
const shortcutYesterday = document.getElementById("shortcutYesterday");
const closeDateModal = document.getElementById("closeDateModal");
const submitExpense = document.getElementById("submitExpense");
const currencyButton = document.getElementById("currencyButton");
const currencyModal = document.getElementById("currencyModal");
const currencyOptions = document.getElementById("currencyOptions");
const closeCurrencyModal = document.getElementById("closeCurrencyModal");
const dayButton = document.getElementById("dayButton");
const monthButton = document.getElementById("monthButton");
const yearButton = document.getElementById("yearButton");
const yearSelect = document.getElementById("yearSelect");
const monthSelect = document.getElementById("monthSelect");
const yearlyBars = document.getElementById("yearlyBars");
const categoryList = document.getElementById("categoryList");
const monthlyTotal = document.getElementById("monthlyTotal");
const formMessage = document.getElementById("formMessage");
const tabButtons = document.querySelectorAll(".tab-button");
const addView = document.getElementById("addView");
const viewExpenses = document.getElementById("viewExpenses");

let expenses = [];

const today = new Date();
const currentMonthKey = today.toISOString().slice(0, 7);
const currentYear = today.getFullYear().toString();
const currentMonthIndex = today.getMonth();
let selectedMonthKey = currentMonthKey;

// Lista de meses en español para el selector y el texto del total.
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const CATEGORIES = [
  "Restaurantes",
  "Supermercado",
  "Transporte",
  "Gasolina",
  "Ocio",
  "Otros",
];

const CURRENCIES = ["EUR €", "USD $", "GBP £", "COP $", "MXN $"];
let selectedCurrency = CURRENCIES[0];

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);

const parseAmount = (value) => {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatAmountInput = (value) =>
  value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDateLabel = (dateValue) => {
  if (!dateValue) {
    return "Selecciona una fecha";
  }

  const parsed = new Date(`${dateValue}T00:00:00`);
  const todayDate = new Date();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(todayDate.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const labelPrefix = sameDay(parsed, todayDate)
    ? "Hoy"
    : sameDay(parsed, yesterdayDate)
      ? "Ayer"
      : "Fecha";

  const formatted = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);

  return `${labelPrefix} · ${formatted}`;
};

const getSelectedMonthKey = () => selectedMonthKey || currentMonthKey;

const buildMonthKey = (year, monthIndex) =>
  `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

const getActivePeriodLabel = () => {
  const [year, month] = getSelectedMonthKey().split("-");
  const monthIndex = Math.max(0, Number(month) - 1);
  const monthName = MONTHS[monthIndex] ?? "Mes";

  return `${year} - ${monthName}`;
};

const buildMonthOptions = () => {
  monthSelect.innerHTML = "";
  MONTHS.forEach((monthName, index) => {
    const option = document.createElement("option");
    option.value = index.toString();
    option.textContent = monthName;
    monthSelect.appendChild(option);
  });
};

const buildYearOptions = () => {
  const years = new Set([currentYear]);
  expenses.forEach((expense) => {
    if (typeof expense.date === "string") {
      years.add(expense.date.slice(0, 4));
    }
  });

  const sortedYears = Array.from(years).sort();
  const currentSelection = yearSelect.value || currentYear;

  yearSelect.innerHTML = "";
  sortedYears.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });

  yearSelect.value = sortedYears.includes(currentSelection)
    ? currentSelection
    : currentYear;

  // Sincroniza el filtro actual si el año disponible cambió.
  selectedMonthKey = buildMonthKey(
    yearSelect.value || currentYear,
    Number(monthSelect.value || 0)
  );
};

const getCategoryTotals = () => {
  const totals = Object.fromEntries(CATEGORIES.map((item) => [item, 0]));

  getFilteredExpenses().forEach((expense) => {
    if (Object.prototype.hasOwnProperty.call(totals, expense.category)) {
      totals[expense.category] += expense.amount;
    }
  });

  return totals;
};

const getExpensesForYear = (year) =>
  expenses.filter(
    (expense) => typeof expense.date === "string" && expense.date.startsWith(year)
  );

const renderYearlyChart = () => {
  const year = yearSelect.value || currentYear;
  const yearExpenses = getExpensesForYear(year);
  const totalsByMonth = Array.from({ length: 12 }, () => 0);

  yearExpenses.forEach((expense) => {
    const monthIndex = Number(expense.date.slice(5, 7)) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      totalsByMonth[monthIndex] += expense.amount;
    }
  });

  const maxValue = Math.max(...totalsByMonth, 0);
  yearlyBars.innerHTML = "";

  totalsByMonth.forEach((value, index) => {
    const bar = document.createElement("button");
    bar.type = "button";
    bar.className = "yearly-bar";
    if (Number(monthSelect.value) === index) {
      bar.classList.add("is-active");
    }

    const fill = document.createElement("span");
    fill.className = "yearly-bar__fill";
    const barHeight = maxValue > 0 ? (value / maxValue) * 100 : 0;
    fill.style.height = `${barHeight}%`;

    const tooltip = document.createElement("span");
    tooltip.className = "yearly-bar__tooltip";
    tooltip.textContent = `${MONTHS[index]}: ${formatCurrency(value)}`;

    bar.appendChild(fill);
    bar.appendChild(tooltip);
    bar.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "touch") {
        return;
      }
      yearlyBars.querySelectorAll(".yearly-bar").forEach((button) => {
        button.classList.remove("is-tooltip");
      });
      bar.classList.add("is-tooltip");
    });

    bar.addEventListener("mouseleave", () => {
      bar.classList.remove("is-tooltip");
    });

    yearlyBars.appendChild(bar);
  });
};

const getFilteredExpenses = () => {
  const activeMonth = getSelectedMonthKey();

  return expenses.filter(
    (expense) =>
      typeof expense.date === "string" && expense.date.startsWith(activeMonth)
  );
};

const updateTotal = () => {
  const total = getFilteredExpenses().reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  monthlyTotal.textContent = `Total (${getActivePeriodLabel()}): ${formatCurrency(
    total
  )}`;
};

const saveExpenses = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
};

let expandedCategory = null;

const renderExpenses = () => {
  categoryList.innerHTML = "";
  const filteredExpenses = getFilteredExpenses();

  if (filteredExpenses.length === 0) {
    const emptyMessage = document.createElement("div");
    emptyMessage.className = "category-item";
    emptyMessage.textContent =
      "No hay gastos en este mes. ¡Agrega el primero!";
    categoryList.appendChild(emptyMessage);
    return;
  }

  const totals = getCategoryTotals();
  const totalAmount = Object.values(totals).reduce(
    (sum, value) => sum + value,
    0
  );

  CATEGORIES.forEach((category) => {
    const categoryExpenses = filteredExpenses.filter(
      (expense) => expense.category === category
    );
    const amount = totals[category];
    const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;

    const item = document.createElement("div");
    item.className = "category-item";

    const header = document.createElement("div");
    header.className = "category-header";
    header.setAttribute("role", "button");
    header.setAttribute("tabindex", "0");
    header.setAttribute("aria-expanded", expandedCategory === category);

    const title = document.createElement("strong");
    title.textContent = category;

    const subtitle = document.createElement("span");
    subtitle.textContent = `${formatCurrency(amount)} · ${percentage.toFixed(
      0
    )}%`;

    header.appendChild(title);
    header.appendChild(subtitle);
    item.appendChild(header);

    if (expandedCategory === category) {
      const details = document.createElement("div");
      details.className = "category-expenses";

      categoryExpenses.forEach((expense) => {
        const expenseRow = document.createElement("div");
        expenseRow.className = "category-expense";

        const expenseHeader = document.createElement("div");
        expenseHeader.className = "category-expense-header";

        const concept = document.createElement("span");
        concept.textContent = expense.concept;

        const amountText = document.createElement("span");
        amountText.textContent = formatCurrency(expense.amount);

        expenseHeader.appendChild(concept);
        expenseHeader.appendChild(amountText);

        const meta = document.createElement("div");
        meta.className = "category-expense-meta";
        meta.textContent = expense.date;

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Eliminar";
        deleteButton.addEventListener("click", () => {
          expenses = expenses.filter((item) => item.id !== expense.id);
          saveExpenses();
          buildYearOptions();
          renderExpenses();
          updateTotal();
          updateAnalytics();
        });

        expenseRow.appendChild(expenseHeader);
        expenseRow.appendChild(meta);
        expenseRow.appendChild(deleteButton);
        details.appendChild(expenseRow);
      });

      item.appendChild(details);
    }

    header.addEventListener("click", () => {
      expandedCategory = expandedCategory === category ? null : category;
      renderExpenses();
    });

    header.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        header.click();
      }
    });

    categoryList.appendChild(item);
  });
};

// Actualiza el resumen anual y la lista por categorías según filtros.
const updateAnalytics = () => {
  renderYearlyChart();
};

// Mensaje con feedback visual al guardar.
const showMessage = (text, type = "error") => {
  formMessage.textContent = text;
  formMessage.classList.remove("is-success", "is-hidden", "toast");
  if (type === "success") {
    formMessage.classList.add("is-success", "toast");
    setTimeout(() => {
      formMessage.classList.add("is-hidden");
    }, 1500);
  } else {
    formMessage.classList.remove("is-success");
  }
};

const clearMessage = () => {
  formMessage.textContent = "";
  formMessage.classList.remove("is-success", "is-hidden");
};

const addExpense = (event) => {
  event.preventDefault();
  clearMessage();

  const concept = conceptInput.value.trim();
  const amount = parseAmount(amountInput.value);
  const category = categoryInput.value;
  const date = dateInput.value;

  if (!concept) {
    showMessage("El concepto es obligatorio.");
    return;
  }
  const target = emojiButton.closest(".category-card");
  categoryInput.value = target.dataset.category;
  updateCategorySelection();
  updateSubmitState();
});

dateDisplay.addEventListener("click", openDateModal);
closeDateModal.addEventListener("click", () => {
  applyDateFromSelectors();
  closeModal();
});

conceptInput.addEventListener("input", updateSubmitState);
amountInput.addEventListener("blur", () => {
  amountInput.value = formatAmountInput(parseAmount(amountInput.value));
});

shortcutToday.addEventListener("click", () => {
  dateInput.value = today.toISOString().slice(0, 10);
  syncDateSelectors();
});

shortcutYesterday.addEventListener("click", () => {
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  dateInput.value = yesterday.toISOString().slice(0, 10);
  syncDateSelectors();
});

dateModal.addEventListener("click", (event) => {
  if (event.target === dateModal) {
    closeModal();
  }
});

currencyButton.addEventListener("click", openCurrencyModal);
closeCurrencyModal.addEventListener("click", closeCurrency);
currencyModal.addEventListener("click", (event) => {
  if (event.target === currencyModal) {
    closeCurrency();
  }
});

  if (Number.isNaN(amount) || amount <= 0) {
    showMessage("La cantidad debe ser mayor que 0.");
    return;
  }

  if (!date) {
    showMessage("Selecciona una fecha válida.");
    return;
  }

  const newExpense = {
    id: crypto.randomUUID(),
    concept,
    amount,
    category,
    date,
  };

  expenses = [newExpense, ...expenses];
  saveExpenses();
  buildYearOptions();
  renderExpenses();
  updateTotal();
  updateAnalytics();

  expenseForm.reset();
  amountInput.value = formatAmountInput(0);
  dateInput.value = today.toISOString().slice(0, 10);
  dateDisplay.textContent = formatDateLabel(dateInput.value);
  categoryInput.value = CATEGORIES[0];
  updateCategorySelection();
  updateSubmitState();
  showMessage("Gasto guardado correctamente.", "success");
};

const loadExpenses = () => {
  const storedData = localStorage.getItem(STORAGE_KEY);
  expenses = storedData ? JSON.parse(storedData) : [];
  buildYearOptions();
  renderExpenses();
  updateTotal();
  updateAnalytics();
};

// Alterna entre vistas tipo pestañas.
const setActiveView = (view) => {
  const isAddView = view === "add";
  addView.hidden = !isAddView;
  addView.classList.toggle("is-visible", isAddView);
  viewExpenses.hidden = isAddView;
  viewExpenses.classList.toggle("is-visible", !isAddView);

  tabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
};

// Botones + y - del contador de cantidad.
const updateAmount = (delta) => {
  const current = parseAmount(amountInput.value);
  const nextValue = Math.max(0, current + delta);
  amountInput.value = formatAmountInput(nextValue);
  updateSubmitState();
};

// Marca visualmente la categoría activa.
const updateCategorySelection = () => {
  const selected = categoryInput.value;
  categoryGrid.querySelectorAll(".category-card").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.category === selected);
  });
  categoryGrid.classList.toggle("is-dimmed", Boolean(selected));
};

// Modal simple para elegir fecha.
const openDateModal = () => {
  syncDateButtons();
  dateModal.classList.add("is-open");
  dateModal.setAttribute("aria-hidden", "false");
};

const closeModal = () => {
  dateModal.classList.remove("is-open");
  dateModal.setAttribute("aria-hidden", "true");
};

const openCurrencyModal = () => {
  currencyModal.classList.add("is-open");
  currencyModal.setAttribute("aria-hidden", "false");
};

const closeCurrency = () => {
  currencyModal.classList.remove("is-open");
  currencyModal.setAttribute("aria-hidden", "true");
};

const buildCurrencyOptions = () => {
  currencyOptions.innerHTML = "";
  CURRENCIES.forEach((currency) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "currency-option";
    option.textContent = currency;
    option.classList.toggle("is-selected", currency === selectedCurrency);
    option.addEventListener("click", () => {
      selectedCurrency = currency;
      currencyButton.textContent = currency;
      buildCurrencyOptions();
    });
    currencyOptions.appendChild(option);
  });
};

const buildDateOptions = () => {
  const currentYearNumber = Number(currentYear);
  return {
    days: Array.from({ length: 31 }, (_, index) =>
      String(index + 1).padStart(2, "0")
    ),
    months: MONTHS.map((monthName, index) => ({
      value: String(index + 1).padStart(2, "0"),
      label: monthName.slice(0, 3),
    })),
    years: Array.from({ length: 7 }, (_, index) =>
      String(currentYearNumber - 5 + index)
    ),
  };
};

const dateOptions = buildDateOptions();

const syncDateButtons = () => {
  const [year, month, day] = dateInput.value.split("-");
  const monthLabel =
    dateOptions.months.find((item) => item.value === month)?.label ?? "Mes";
  dayButton.textContent = day;
  monthButton.textContent = monthLabel;
  yearButton.textContent = year;
};

const applyDateFromButtons = (nextDay, nextMonth, nextYear) => {
  dateInput.value = `${nextYear}-${nextMonth}-${nextDay}`;
  dateDisplay.textContent = formatDateLabel(dateInput.value);
  syncDateButtons();
};

const updateSubmitState = () => {
  const hasConcept = conceptInput.value.trim().length > 0;
  const amountValue = parseAmount(amountInput.value);
  const isReady = hasConcept && amountValue > 0;
  submitExpense.classList.toggle("is-disabled", !isReady);
  submitExpense.setAttribute("aria-disabled", String(!isReady));
};

expenseForm.addEventListener("submit", addExpense);
tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveView(button.dataset.view);
  });
});

decreaseAmount.addEventListener("click", () => updateAmount(-1));
increaseAmount.addEventListener("click", () => updateAmount(1));
amountInput.addEventListener("input", () => {
  const amountValue = parseAmount(amountInput.value);
  if (amountValue < 0) {
    amountInput.value = formatAmountInput(0);
  }
  updateSubmitState();
});

categoryGrid.addEventListener("click", (event) => {
  const emojiButton = event.target.closest(".cat-circle");
  if (!emojiButton) {
    return;
  }
  const target = emojiButton.closest(".category-card");
  categoryInput.value = target.dataset.category;
  updateCategorySelection();
  updateSubmitState();
});

dateDisplay.addEventListener("click", openDateModal);
closeDateModal.addEventListener("click", () => {
  const [year, month, day] = dateInput.value.split("-");
  applyDateFromButtons(day, month, year);
  closeModal();
});

conceptInput.addEventListener("input", updateSubmitState);
amountInput.addEventListener("blur", () => {
  amountInput.value = formatAmountInput(parseAmount(amountInput.value));
});

shortcutToday.addEventListener("click", () => {
  dateInput.value = today.toISOString().slice(0, 10);
  syncDateButtons();
});

shortcutYesterday.addEventListener("click", () => {
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  dateInput.value = yesterday.toISOString().slice(0, 10);
  syncDateButtons();
});

dateModal.addEventListener("click", (event) => {
  if (event.target === dateModal) {
    closeModal();
  }
});

currencyButton.addEventListener("click", openCurrencyModal);
closeCurrencyModal.addEventListener("click", closeCurrency);
currencyModal.addEventListener("click", (event) => {
  if (event.target === currencyModal) {
    closeCurrency();
  }
});

dayButton.addEventListener("click", () => {
  const [year, month, day] = dateInput.value.split("-");
  const currentIndex = dateOptions.days.indexOf(day);
  const nextDay =
    dateOptions.days[(currentIndex + 1) % dateOptions.days.length];
  applyDateFromButtons(nextDay, month, year);
});

monthButton.addEventListener("click", () => {
  const [year, month, day] = dateInput.value.split("-");
  const currentIndex = dateOptions.months.findIndex(
    (item) => item.value === month
  );
  const nextMonth =
    dateOptions.months[(currentIndex + 1) % dateOptions.months.length].value;
  applyDateFromButtons(day, nextMonth, year);
});

yearButton.addEventListener("click", () => {
  const [year, month, day] = dateInput.value.split("-");
  const currentIndex = dateOptions.years.indexOf(year);
  const nextYear =
    dateOptions.years[(currentIndex + 1) % dateOptions.years.length];
  applyDateFromButtons(day, month, nextYear);
});

yearSelect.addEventListener("change", () => {
  selectedMonthKey = buildMonthKey(
    yearSelect.value || currentYear,
    Number(monthSelect.value || 0)
  );
  renderExpenses();
  updateTotal();
  updateAnalytics();
});

monthSelect.addEventListener("change", () => {
  selectedMonthKey = buildMonthKey(
    yearSelect.value || currentYear,
    Number(monthSelect.value || 0)
  );
  renderExpenses();
  updateTotal();
  updateAnalytics();
});

dateInput.value = today.toISOString().slice(0, 10);
dateDisplay.textContent = formatDateLabel(dateInput.value);
amountInput.value = formatAmountInput(0);
categoryInput.value = CATEGORIES[0];
updateCategorySelection();
updateSubmitState();
syncDateButtons();
buildCurrencyOptions();
currencyButton.textContent = selectedCurrency;
buildMonthOptions();
buildYearOptions();
monthSelect.value = currentMonthIndex.toString();
yearSelect.value = currentYear;
selectedMonthKey = buildMonthKey(currentYear, currentMonthIndex);
setActiveView("add");
loadExpenses();
