const generateButton = document.getElementById('generate-button');
const numbersContainer = document.getElementById('numbers-container');
const themeToggle = document.getElementById('theme-toggle');
const themeLabel = themeToggle?.querySelector('.theme-label');

generateButton.addEventListener('click', () => {
    const numbers = generateLottoNumbers();
    displayNumbers(numbers);
});

const preferredTheme = localStorage.getItem('theme');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
const initialTheme = preferredTheme || systemTheme;

setTheme(initialTheme);

themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
});

function generateLottoNumbers() {
    const numbers = new Set();
    while (numbers.size < 6) {
        const randomNumber = Math.floor(Math.random() * 45) + 1;
        numbers.add(randomNumber);
    }
    return Array.from(numbers);
}

function displayNumbers(numbers) {
    numbersContainer.innerHTML = '';
    for (const number of numbers) {
        const numberBall = document.createElement('div');
        numberBall.classList.add('number-ball');
        numberBall.textContent = number;
        numbersContainer.appendChild(numberBall);
    }
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeLabel) {
        themeLabel.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }
}
