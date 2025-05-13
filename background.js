const body = document.body;

// تابع لتغيير الخلفية بناءً على الوقت
function setBackground() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 18) {
    body.style.background = "linear-gradient(to right, #ff7e5f, #feb47b)";
  } else {
    body.style.background = "linear-gradient(to right, #2c3e50, #4ca1af)";
  }
}

// تحديث الخلفية عند تحميل الصفحة
setBackground();
