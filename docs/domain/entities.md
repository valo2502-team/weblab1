# Domain Entities

## 1. User
**Опис:** Користувач системи, який може створювати та керувати завданнями.

**Поля:**
- id: UUID
- username: String
- email: String
- role: Enum("student", "teacher", "admin")
- created_at: datetime

---

## 2. Task
**Опис:** Завдання, створене користувачем.

**Поля:**
- id: UUID
- title: String
- description: Text
- status: Enum("todo", "in_progress", "done")
- priority: Enum("low", "medium", "high")
- due_date: date (optional)
- created_by: User
- assigned_to: User (optional)
- created_at: datetime

**Методи:**
- set_status(new_status)
- assign_to(user)

---

## 3. Comment
**Опис:** Коментар під завданням.

**Поля:**
- id: UUID
- task: Task
- author: User
- message: Text
- created_at: datetime
