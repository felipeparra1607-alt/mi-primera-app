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
const monthInput = document.getElementById("monthInput");
const expenseItems = document.getElementById("expenseItems");
const monthlyTotal = document.getElementById("monthlyTotal");
const formMessage = document.getElementById("formMessage");

let expenses = [];

const today = new Date();
const currentMonthKey = today.toISOString().slice(0, 7);
let selectedMonthKey = currentMonthKey;

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);

const getFilteredExpenses = () =>
  expenses.filter((expense) => expense.date.startsWith(selectedMonthKey));

const updateTotal = () => {
  const total = getFilteredExpenses().reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  monthlyTotal.textContent = `Total del mes (${selectedMonthKey}): ${formatCurrency(
const updateTotal = () => {
  const total = expenses
    .filter((expense) => expense.date.startsWith(currentMonthKey))
    .reduce((sum, expense) => sum + expense.amount, 0);

  monthlyTotal.textContent = `Total del mes (${currentMonthKey}): ${formatCurrency(
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


  if (expenses.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className = "expense-item";
    emptyMessage.textContent =
      "Aún no hay gastos registrados. ¡Agrega el primero!";
    expenseItems.appendChild(emptyMessage);
    return;
  }

  expenses.forEach((expense) => {
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
  renderExpenses();
  updateTotal();

  expenseForm.reset();
  dateInput.value = today.toISOString().slice(0, 10);
  showMessage("Gasto guardado correctamente.", "success");
};

const loadExpenses = () => {
  const storedData = localStorage.getItem(STORAGE_KEY);
  expenses = storedData ? JSON.parse(storedData) : [];
  renderExpenses();
  updateTotal();
};

expenseForm.addEventListener("submit", addExpense);
monthInput.addEventListener("change", () => {
  selectedMonthKey = monthInput.value || currentMonthKey;
  renderExpenses();
  updateTotal();
});

dateInput.value = today.toISOString().slice(0, 10);
monthInput.value = currentMonthKey;

dateInput.value = today.toISOString().slice(0, 10);
loadExpenses();
