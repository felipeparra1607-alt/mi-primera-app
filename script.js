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

const CATEGORIES = ["Comida", "Ocio", "Transporte", "Otros"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);

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
    fill.style.height = `${maxValue > 0 ? (value / maxValue) * 100 : 0}%`;

    const tooltip = document.createElement("span");
    tooltip.className = "yearly-bar__tooltip";
    tooltip.textContent = `${MONTHS[index]}: ${formatCurrency(value)}`;

    bar.appendChild(fill);
    bar.appendChild(tooltip);
    bar.addEventListener("click", () => {
      yearlyBars.querySelectorAll(".yearly-bar").forEach((button) => {
        button.classList.remove("is-tooltip");
      });
      bar.classList.add("is-tooltip");
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

    const details = document.createElement("div");
    details.className = "category-expenses";
    details.hidden = expandedCategory !== category;

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

    item.appendChild(details);
    categoryList.appendChild(item);
  });
};

// Actualiza el resumen anual y la lista por categorías según filtros.
const updateAnalytics = () => {
  renderYearlyChart();
};

const showMessage = (text, type = "error") => {
  formMessage.textContent = text;
  formMessage.style.color = type === "success" ? "#16a34a" : "#dc2626";
};

const clearMessage = () => {
  formMessage.textContent = "";
};

const addExpense = (event) => {
  event.preventDefault();
  clearMessage();

  const concept = conceptInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value;
  const date = dateInput.value;

  if (!concept) {
    showMessage("El concepto es obligatorio.");
    return;
  }

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
  dateInput.value = today.toISOString().slice(0, 10);
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

expenseForm.addEventListener("submit", addExpense);
tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveView(button.dataset.view);
  });
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
buildMonthOptions();
buildYearOptions();
monthSelect.value = currentMonthIndex.toString();
yearSelect.value = currentYear;
selectedMonthKey = buildMonthKey(currentYear, currentMonthIndex);
setActiveView("add");
loadExpenses();
