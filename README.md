# ⚙️ Kalhyge-Prod – Backend API

API REST pour l’application de suivi de production industrielle Kalhyge-Prod.

Cette API permet de gérer les utilisateurs, machines, productions, articles, rejets et le suivi en temps réel via Socket.IO.

---

## 🚀 URL de production

🌐 API : [Kalhyge-Prod API](https://api-kalhygee.onrender.com)  
🩺 Health check : [Kalhyge-Prod API /health](https://api-kalhygee.onrender.com/health)

---

## 🏗️ Architecture

API Node.js construite avec une architecture en couches :

Client (React) → API REST (Express) → PostgreSQL

---

## 🛠️ Stack technique

- Node.js
- Express.js
- PostgreSQL
- Socket.IO
- JWT / Authentification
- dotenv

---

## 🔁 Architecture backend

- Controllers (logique métier)
- Routes (API REST)
- Middlewares (auth, sécurité, rate limit)
- Services (logique métier avancée)
- Base de données PostgreSQL

---

## 🔐 Sécurité

- Authentification (JWT)
- Middleware isAuthenticated / isAdmin
- Rate limiting (anti brute force / spam)
- Validation des données
- CORS dynamique sécurisé
- Variables d’environnement (.env)
- npm audit pour les vulnérabilités

👉 Sécurité en couches pour limiter les attaques (XSS, brute force, DoS).

---

## ⚡ CI/CD (DevOps)

Pipeline automatisé avec GitHub Actions :

- Installation des dépendances
- Linting du code
- Tests unitaires
- Audit sécurité (npm audit)
- Build

Déploiement automatique :
- Backend : Render
- Frontend : Vercel

---

## 🔌 WebSocket (Socket.IO)

Mise en place de communication temps réel :

- Connexion client serveur
- Notifications en temps réel
- Synchronisation des données de production

---

## 📦 API Endpoints principaux

### Authentification
- POST /signup
- POST /signin
- POST /logOut
- GET /me

### Machines
- GET /machines
- POST /machines
- PATCH /machines
- DELETE /machines

### Articles
- GET /articles
- POST /articles
- PATCH /articles
- DELETE /articles

### Productions
- GET /productions/:timerId
- POST /productions/articles/:articleId
- PATCH /productions/articles/:articleId
- DELETE /productions/articles/:prodId

### Rejets
- GET /productions/rejet/:timerId
- POST /productions/rejet
- PATCH /productions/rejet
- DELETE /productions/rejet

### Health check
- GET /health → vérifie que l’API fonctionne

---

## 🧪 Tests

- Tests unitaires avec Jest
- Mock de la base de données
- Tests des controllers (création, validation, erreurs)
- Prévention des régressions

---

## ⚙️ Sécurité avancée

- Rate limiting sur login et signup
- Protection brute force (login)
- Validation des inputs
- Gestion des erreurs centralisée
- Protection des routes sensibles (admin)

---

## 📊 Status codes utilisés

- 200 OK
- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 429 Too Many Requests
- 500 Internal Server Error

---

## 📦 Installation locale

```bash
git clone https://github.com/JeanManyama/kalhyge-prod-backend
cd kalhyge-prod-backend
npm install
npm run dev
```
