import uuid

class CorrelationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Отримати або згенерувати X-Request-Id
        request_id = request.headers.get('X-Request-Id')
        if not request_id:
            request_id = str(uuid.uuid4())

        # Додати його до об'єкта запиту для використання у views/logs
        request.request_id = request_id

        response = self.get_response(request)

        # Додати X-Request-Id до заголовка відповіді
        response['X-Request-Id'] = request_id
        
        return response