/*
  JavaScript es el lenguaje que hace la página interactiva.
  Aquí escuchamos el clic del botón y actualizamos el texto.
*/

// 1. Buscamos los elementos del HTML usando sus id.
const nameInput = document.getElementById("nameInput");
const greetButton = document.getElementById("greetButton");
const message = document.getElementById("message");

// 2. Escuchamos el evento "click" del botón.
greetButton.addEventListener("click", () => {
  // 3. Leemos el texto que escribió la persona.
  const name = nameInput.value.trim();

  // 4. Si no escribió nada, mostramos un mensaje de ayuda.
  if (name === "") {
    message.textContent = "Por favor escribe tu nombre para saludarte.";
    return;
  }

  // 5. Si hay nombre, mostramos un saludo personalizado.
  message.textContent = `¡Hola, ${name}! Bienvenida/o a tu primera app web.`;
});
