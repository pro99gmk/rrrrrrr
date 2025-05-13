const from = document.getElementById('from');
const to = document.getElementById('to');
const result = document.getElementById('result');
const loading = document.getElementById('loading');
const chartCtx = document.getElementById('priceChart').getContext('2d');
const coinSearch = document.getElementById('coinSearch');
const coinList = document.getElementById('coinList');

const fiatCurrencies = [
  { id: 'usd', name: 'الدولار الأمريكي (USD)' },
  { id: 'eur', name: 'اليورو (EUR)' },
  { id: 'try', name: 'الليرة التركية (TRY)' },
  { id: 'rub', name: 'الروبل الروسي (RUB)' },
  { id: 'sar', name: 'الريال السعودي (SAR)' },
  { id: 'aed', name: 'الدرهم الإماراتي (AED)' },
  { id: 'egp', name: 'الجنيه المصري (EGP)' },
];

const countryCurrencyMap = {
  "SA": "sar",
  "EG": "egp",
  "AE": "aed",
  "US": "usd",
  "TR": "try",
  "RU": "rub",
  "FR": "eur",
  "DE": "eur",
  "GB": "usd"
};

let coinListData = [];
let chart;

const language = localStorage.getItem('language') || 'ar';

const translations = {
  ar: {
    title: 'تحويل العملات الرقمية والعالمية',
    convert: 'تحويل',
    resultText: 'جاري تحميل العملات...',
    themeButton: '🌓 تبديل الوضع الليلي / النهاري',
    chooseCurrencies: 'اختر عملتين مختلفتين للتحويل',
  },
  en: {
    title: 'Digital and Fiat Currency Converter',
    convert: 'Convert',
    resultText: 'Loading currencies...',
    themeButton: '🌞 Toggle Dark/Light Mode',
    chooseCurrencies: 'Choose two different currencies to convert',
  },
};

document.title = translations[language].title;

async function loadCoins() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1');
    const data = await res.json();

    coinListData = data.map(coin => ({
      id: coin.id,
      name: `${coin.name} (${coin.symbol.toUpperCase()}) - القيمة السوقية: ${Math.round(coin.market_cap).toLocaleString()}$`
    }));

    populateCoinList();
  } catch (error) {
    result.textContent = "فشل تحميل العملات.";
  }
}

function populateCoinList() {
  const allOptions = [...coinListData, ...fiatCurrencies];

  allOptions.forEach(opt => {
    const opt1 = document.createElement('option');
    opt1.value = opt.id;
    opt1.textContent = opt.name;
    const opt2 = opt1.cloneNode(true);
    from.appendChild(opt1);
    to.appendChild(opt2);
  });

  coinListData.forEach(coin => {
    const li = document.createElement('li');
    li.textContent = coin.name;
    li.onclick = () => selectCoin(coin.id);
    coinList.appendChild(li);
  });

  from.value = 'bitcoin';
  detectUserCurrency();
}

function selectCoin(coinId) {
  from.value = coinId;
  to.value = 'usd';
  convert();
}

async function detectUserCurrency() {
  try {
    const response = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client');
    const data = await response.json();
    const countryCode = data.countryCode;
    const currencyId = countryCurrencyMap[countryCode] || 'usd';
    to.value = currencyId;
    convert();
  } catch (err) {
    to.value = 'usd';
    convert();
  } finally {
    loading.style.display = 'none';
  }
}

async function convert() {
  const amount = parseFloat(document.getElementById('amount').value);
  const fromCurrency = from.value;
  const toCurrency = to.value;

  if (fromCurrency === toCurrency) {
    result.textContent = translations[language].chooseCurrencies;
    return;
  }

  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${fromCurrency}&vs_currencies=${toCurrency}`);
    
    if (res.status === 429) {
      result.textContent = "تم الوصول للحد الأقصى من الطلبات. الرجاء المحاولة لاحقاً.";
      return;
    }

    const data = await res.json();

    if (!data[fromCurrency] || !data[fromCurrency][toCurrency]) {
      result.textContent = "تعذر التحويل حالياً.";
      return;
    }

    const rate = data[fromCurrency][toCurrency];
    const converted = amount * rate;

    const fromName = [...from.options].find(opt => opt.value === fromCurrency)?.textContent || fromCurrency.toUpperCase();
    const toName = [...to.options].find(opt => opt.value === toCurrency)?.textContent || toCurrency.toUpperCase();

    result.textContent = `${amount} ${fromName} = ${converted.toFixed(4)} ${toName}`;
    loadChart(fromCurrency, toCurrency);
  } catch (error) {
    result.textContent = "فشل في الاتصال بالخادم.";
  }
}

async function loadChart(coin, vsCurrency) {
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=${vsCurrency}&days=1`);
    const data = await res.json();

    const labels = data.prices.map(p => new Date(p[0]).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US'));
    const prices = data.prices.map(p => p[1]);

    if (chart) chart.destroy();

    chart = new Chart(chartCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `سعر ${coin.toUpperCase()} مقابل ${vsCurrency.toUpperCase()}`,
          data: prices,
          borderColor: '#00cec9',
          fill: true,
          backgroundColor: 'rgba(0,206,201,0.1)',
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: { ticks: { color: getComputedStyle(document.body).color }},
          y: { ticks: { color: getComputedStyle(document.body).color }}
        }
      }
    });
  } catch (e) {
    result.textContent = "فشل تحميل الرسم البياني.";
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  if (chart) chart.update();
}

let searchTimeout;
function filterCoins() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const search
