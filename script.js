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
const expenseItems = document.getElementById("expenseItems");
const monthlyTotal = document.getElementById("monthlyTotal");
const formMessage = document.getElementById("formMessage");

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

const renderExpenses = () => {
  expenseItems.innerHTML = "";
  const filteredExpenses = getFilteredExpenses();

  if (filteredExpenses.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className = "expense-item";
    emptyMessage.textContent =
      "No hay gastos en este mes. ¡Agrega el primero!";
    expenseItems.appendChild(emptyMessage);
    return;
  }

  filteredExpenses.forEach((expense) => {
    const item = document.createElement("li");
    item.className = "expense-item";

    const info = document.createElement("div");
    info.className = "expense-info";

    const title = document.createElement("strong");
    title.textContent = expense.concept;

    const meta = document.createElement("span");
    meta.className = "expense-meta";
    meta.textContent = `${expense.category} · ${expense.date}`;

    info.appendChild(title);
    info.appendChild(meta);

    const amount = document.createElement("div");
    amount.className = "expense-amount";
    amount.textContent = formatCurrency(expense.amount);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Eliminar";
    deleteButton.addEventListener("click", () => {
      expenses = expenses.filter((item) => item.id !== expense.id);
      saveExpenses();
      renderExpenses();
      updateTotal();
    });

    item.appendChild(info);
    item.appendChild(amount);
    item.appendChild(deleteButton);

    expenseItems.appendChild(item);
  });
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
};

expenseForm.addEventListener("submit", addExpense);
yearSelect.addEventListener("change", () => {
  selectedMonthKey = buildMonthKey(
    yearSelect.value || currentYear,
    Number(monthSelect.value || 0)
  );
  renderExpenses();
  updateTotal();
});

monthSelect.addEventListener("change", () => {
  selectedMonthKey = buildMonthKey(
    yearSelect.value || currentYear,
    Number(monthSelect.value || 0)
  );
  renderExpenses();
  updateTotal();
});

dateInput.value = today.toISOString().slice(0, 10);
buildMonthOptions();
buildYearOptions();
monthSelect.value = currentMonthIndex.toString();
yearSelect.value = currentYear;
selectedMonthKey = buildMonthKey(currentYear, currentMonthIndex);
loadExpenses();
