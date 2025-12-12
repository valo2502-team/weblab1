from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from django.shortcuts import render
from django.db import transaction 
from django.core.exceptions import ValidationError
from .service import ItemService
from .models import IdempotencyRecord 

@csrf_exempt
def simulate_error_api(request):
    """
    Імітує помилки 500, 429 та Retry-After для тестування клієнтської логіки.
    """
    status_code = request.GET.get('status', '500')
    
    if status_code == '429':
        if request.session.get('simulate_429_count', 0) < 1:
            request.session['simulate_429_count'] = 1
            request.session.modified = True 
            
            response = JsonResponse({"error": "Simulated Rate Limit. Please wait for Retry-After."}, status=429)
            response['Retry-After'] = '5'
            return response
        else:
            request.session['simulate_429_count'] = 0
            request.session.modified = True
            return JsonResponse({"status": "Simulation successful after 429 retry"}, status=200)
    
    elif status_code == '500':
        current_count = request.session.get('simulate_500_count', 0)
        
        if current_count < 1: 
            request.session['simulate_500_count'] = current_count + 1
            request.session.modified = True
            return JsonResponse({"error": f"Simulated Internal Server Error. Attempt {current_count + 1}"}, status=500)
        else:
            request.session['simulate_500_count'] = 0
            request.session.modified = True
            return JsonResponse({"status": "Simulation successful after 500 retry"}, status=200)


    return JsonResponse({"status": "Simulation endpoint ready"}, status=200)

def item_list_page(request):
    """Render the index.html template from app/store/templates/."""
    return render(request, 'index.html', {})

def health(request):
    return JsonResponse({"status": "ok"})

@csrf_exempt
@require_http_methods(["GET", "POST"])
def items_api(request):
    
    if request.method == "GET":
        items = ItemService.list_items()
        return JsonResponse(items, safe=False)
        
    elif request.method == "POST":
        idempotency_key = request.headers.get('Idempotency-Key')
        endpoint = request.path_info
        
        # Ідемпотентність: 1. Перевірка існуючого запису
        if idempotency_key:
            try:
                record = IdempotencyRecord.objects.get(idempotency_key=idempotency_key, endpoint=endpoint)
                return JsonResponse(json.loads(record.response_data), status=record.response_status)
            except IdempotencyRecord.DoesNotExist:
                pass
        
        try:
            with transaction.atomic():
                data = json.loads(request.body)
                item = ItemService.create_item(data)
                
                response_status = 201
                response_data = item
                
                # Ідемпотентність: 2. Збереження результату
                if idempotency_key:
                    IdempotencyRecord.objects.create(
                        idempotency_key=idempotency_key,
                        endpoint=endpoint,
                        response_status=response_status,
                        response_data=json.dumps(response_data)
                    )
                
                return JsonResponse(response_data, status=response_status)

        except ValidationError as e:
            return JsonResponse({"error": str(e)}, status=400)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON format in request body"}, status=400)
        except Exception:
            return JsonResponse({"error": "Internal Server Error"}, status=500)


# 4. Об'єднаний API для Detail (path: "/items/<int:item_id>/")
# Включає GET (detail), PUT (update) та DELETE (delete)
@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def item_detail_api(request, item_id):
    
    if request.method == "GET":
        # Логіка get_item
        item = ItemService.get_item(item_id)
        if not item:
            return JsonResponse({"error": "Item not found"}, status=404)
        return JsonResponse(item)

    elif request.method == "PUT":
        # Логіка update_item
        try:
            data = json.loads(request.body)
            item = ItemService.update_item(item_id, data)
            if not item:
                return JsonResponse({"error": "Item not found"}, status=404)
            return JsonResponse(item)
        except ValidationError as e:
            return JsonResponse({"error": str(e)}, status=400)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON format in request body"}, status=400)
        except Exception:
            return JsonResponse({"error": "Internal Server Error"}, status=500)

    elif request.method == "DELETE":
        # Логіка delete_item
        success = ItemService.delete_item(item_id)
        if not success:
            return JsonResponse({"error": "Item not found"}, status=404)
        
        # Успішне видалення
        return JsonResponse({}, status=204)