/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class', // 启用 class 策略的深色模式
  theme: {
    extend: {
      // ... 现有的主题扩展
    },
  },
  plugins: [
    // ... 现有的插件
  ],
}; 