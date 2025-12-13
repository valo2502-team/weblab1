# Team-Shop - невеликий онлайн-магазин техніки. 

Клієнти можуть переглядати товари через веб-браузер, а бекенд на Django забезпечує доступ до бази даних (SQLite/PostgreSQL). Система відображає список товарів та дозволяє адміністратору додавати або редагувати товари.

## API документація

Мінімальний CRUD для сутності Item описаний у OpenAPI специфікації.

- [Файл openapi.yaml](docs/api/openapi.yaml)
- Скріншот документації зі Swagger Editor:

![Swagger Screenshot](docs/api/swagger_screenshot.png)

## Попередні вимоги

Перед запуском переконайтеся, що у вас встановлено:
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (або Docker Engine + Compose)
* [Git](https://git-scm.com/)

---

## Швидкий старт

Виконайте ці кроки, щоб запустити проєкт за кілька хвилин.

### 1. Клонування репозиторію

```bash
git clone https://github.com/valo2502-team/weblab1
cd weblab1
```

### 2. Налаштування змінних оточення

Створіть файл `.env` на основі шаблону `.env_template`. Цей файл містить параметри підключення до бази даних та секретні ключі.

### 3. Збірка та запуск через Docker

Ця команда збере Python-образ, завантажить PostgreSQL, автоматично застосує міграції бази даних та запустить сервер.
```bash
docker compose up --build
```


Після запуску сервера відкрийте браузер та перейдіть за адресами:
| Сторінка | URL | Опис |
| :--- | :--- | :--- |
| **Магазин (Клієнт)** | [http://localhost:8000/](http://localhost:8000/) | Головний інтерфейс клієнта зі списком товарів. |
| **Адмін-панель** | [http://localhost:8000/custom-admin/](http://localhost:8000/custom-admin/) | Інтерфейс для створення, редагування та видалення товарів. |
| **API Endpoint** | [http://localhost:8000/items/](http://localhost:8000/items/) | "Сира" JSON відповідь API. |
| **Health Check** | [http://localhost:8000/health/](http://localhost:8000/health/) | Перевірка стану системи (суворий таймаут 1с). |


![CI/CD Status](https://github.com/valo2502-team/weblab1/actions/workflows/ci-cd.yml/badge.svg)

## CI/CD Implementation

### Опис рішення:
1.  **CI (Continuous Integration):**
    * На кожному пуші запускається workflow, який встановлює залежності, перевіряє код лінтером `flake8` та запускає unit-тести Django.
    * Для тестів використовується ізольований сервіс PostgreSQL.
2.  **CD (Continuous Delivery):**
    * Після успішного проходження тестів збирається Docker-образ веб-додатка.
    * Образ автоматично пушиться в **GitHub Container Registry (GHCR)**.
3.  **Style Points (Виконані вимоги):**
    * ✅ **Concurrency:** Налаштовано автоматичне скасування старих білдів на тій самій гілці.
    * ✅ **Minimal Permissions:** Права токену чітко обмежені (`contents: read`, `packages: write`).
    * ✅ **Smart Tagging:** Використовуються теги `main`, `sha-<commit_hash>` та семантичні версії `vX.Y.Z`.

### Як отримати образ:
```bash
docker pull ghcr.io/valo2502-team/weblab1:master 
```
### Як запустити образ:
```bash
docker run -p 8000:8000 ghcr.io/valo2502-team/weblab1:master
```
