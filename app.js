function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const user = users.find(u => u.username === username && u.password === password);
  if(user){
    localStorage.setItem("currentUser", JSON.stringify(user));
    window.location.href = "main.html";
  } else {
    document.getElementById("login-error").textContent = "Неверный логин или пароль";
  }
}
