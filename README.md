# 🚀 LeetCode Solutions Website

A modern web application that serves as a centralized archive of my daily LeetCode solutions. Every solution is carefully documented with the original problem statement, algorithm, and optimized implementations in multiple programming languages.

## ✨ Features

- 📅 Daily LeetCode solution uploads
- 🔍 Search solutions by LeetCode problem number
- 📖 Automatically fetches problem details from LeetCode
- 📝 Dedicated algorithm/approach section for every problem
- 💻 Solutions available in:
  - C++
  - Python
  - Java
- 📚 Permanent archive of all uploaded solutions
- ⚡ Fast and responsive user interface
- 🌙 Modern dark theme
- 📱 Fully responsive design

---

## 🖥️ Website Layout

```
---------------------------------------------------------------
| Logo + Title                     Search by Question Number   |
---------------------------------------------------------------
|                     |                                        |
|     Question        |                                        |
|     (Scrollable)    |                                        |
|---------------------|        Solution Code                   |
|                     |   (C++ | Python | Java Tabs)           |
|     Algorithm       |                                        |
|   (Scrollable)      |                                        |
|                     |                                        |
---------------------------------------------------------------
```

### Left Panel
- Problem statement imported from LeetCode
- Independent scrolling
- Constraints
- Examples
- Notes

### Bottom Left
- Algorithm
- Intuition
- Time Complexity
- Space Complexity
- Dry Run (optional)

### Right Panel
- Language Tabs
  - C++
  - Python
  - Java
- Syntax highlighted code
- Copy Code button

---

## 🛠️ Tech Stack

### Frontend
- React.js
- Tailwind CSS
- Axios

### Backend
- Node.js
- Express.js

### Database
- MongoDB

### Other
- LeetCode API / GraphQL
- Prism.js / Highlight.js
- REST APIs

---

## 📂 Project Structure

```
leetcode-solutions-website/
│
├── client/
│   ├── components/
│   ├── pages/
│   ├── assets/
│   └── App.jsx
│
├── server/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   └── server.js
│
├── database/
│
├── README.md
└── package.json
```

---

## 🚀 Installation

Clone the repository

```bash
git clone https://github.com/Sujith-2193/Leetcode-solutions-website.git
```

Go to the project directory

```bash
cd Leetcode-solutions-website
```

Install dependencies

```bash
npm install
```

Start the development server

```bash
npm run dev
```

---

## 🎯 Upcoming Features

- User authentication for admin
- Admin dashboard for uploading solutions
- Tags and topic filtering
- Difficulty filters
- Company-wise questions
- Bookmark questions
- Dark/Light mode
- Keyboard shortcuts
- Code download
- Recently added solutions
- Search by title
- Search suggestions
- Daily streak counter
- Animated UI
- Comments section
- Discussion forum

---

## 📸 Preview

The interface is designed with a split-screen layout:

- Left panel for the LeetCode problem and algorithm explanation.
- Right panel for syntax-highlighted solutions in C++, Python, and Java.
- Search bar at the top for quickly navigating to a problem by its number.

---

## 👨‍💻 Author

**Arun Sujith**

- GitHub: https://github.com/Sujith-2193

---

## ⭐ Support

If you find this project useful, consider giving it a ⭐ on GitHub.
