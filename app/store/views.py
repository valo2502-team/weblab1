import json
import time
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required # Для сторінок
from django.db import transaction 
from django.core.exceptions import ValidationError

from .service import ItemService
from .models import IdempotencyRecord 

def simulate_error_api(request):
    status_code = request.GET.get('status', '200')
    
    if status_code == 'sleep':
        duration = float(request.GET.get('duration', 2.0))
        time.sleep(duration)
        return JsonResponse({"status": "Woke up"}, status=200)

    if status_code == '429':
        if request.session.get('simulate_429_count', 0) < 1:
            request.session['simulate_429_count'] = 1
            request.session.modified = True 
            response = JsonResponse({"error": "Simulated Rate Limit"}, status=429)
            response['Retry-After'] = '5'
            return response
        else:
            request.session['simulate_429_count'] = 0
            request.session.modified = True
            return JsonResponse({"status": "Success after 429"}, status=200)
    
    elif status_code == '500':
        current_count = request.session.get('simulate_500_count', 0)
        if current_count < 2: 
            request.session['simulate_500_count'] = current_count + 1
            request.session.modified = True
            return JsonResponse({"error": "Simulated Server Error"}, status=500)
        else:
            request.session['simulate_500_count'] = 0
            request.session.modified = True
            return JsonResponse({"status": "Success after 500"}, status=200)

    return JsonResponse({"status": "ok"}, status=200)


def item_list_page(request):
    return render(request, 'index.html', {})

def test_page(request):
    return render(request, 'test.html', {})

@login_required
def admin_page(request):
    return render(request, 'admin.html', {})

def health(request):
    if request.GET.get('sleep'):
        time.sleep(2)
    return JsonResponse({"status": "ok"})

@require_http_methods(["GET", "POST"])
def items_api(request):
    if request.method == "GET":
        items = ItemService.list_items()
        return JsonResponse(items, safe=False)
        
    elif request.method == "POST":
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Unauthorized"}, status=401)

        idempotency_key = request.headers.get('Idempotency-Key')
        endpoint = request.path_info
        
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
            return JsonResponse({"error": "Invalid JSON format"}, status=400)
        except Exception:
            return JsonResponse({"error": "Internal Server Error"}, status=500)

@require_http_methods(["GET", "PUT", "DELETE"])
def item_detail_api(request, item_id):
    if request.method == "GET":
        item = ItemService.get_item(item_id)
        if not item:
            return JsonResponse({"error": "Item not found"}, status=404)
        return JsonResponse(item)

    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    elif request.method == "PUT":
        try:
            data = json.loads(request.body)
            item = ItemService.update_item(item_id, data)
            if not item:
                return JsonResponse({"error": "Item not found"}, status=404)
            return JsonResponse(item)
        except ValidationError as e:
            return JsonResponse({"error": str(e)}, status=400)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)
        except Exception:
            return JsonResponse({"error": "Internal Server Error"}, status=500)

    elif request.method == "DELETE":
        success = ItemService.delete_item(item_id)
        if not success:
            return JsonResponse({"error": "Item not found"}, status=404)
        return JsonResponse({}, status=204)