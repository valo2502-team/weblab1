# 0003 - Стиль API та модель помилок

**Статус:** Прийнято

## REST Стиль
- Ендпоїнти дотримуються REST
- Ресурси: /items, /orders, /categories
- HTTP методи: GET, POST, PUT/PATCH, DELETE

## Відповідність OpenAPI
- Всі ендпоїнти повинні відповідати docs/api/openapi.yaml
- Для запитів та відповідей використовуються DTO
- Помилки валідації повертаються у форматі ErrorResponse

## Формат помилок
- JSON:
```json
{
  "error": "Повідомлення про помилку",
  "code": 400
}
```

## Стандартні статус-коди
- 200 OK
- 201 Created
- 204 No Content
- 400 Bad Request
- 404 Not Found
