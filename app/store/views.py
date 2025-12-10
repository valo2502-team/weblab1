from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from .service import ItemService
from django.core.exceptions import ValidationError

def health(request):
    return JsonResponse({"status": "ok"})

def list_items(request):
    items = ItemService.list_items()
    return JsonResponse(items, safe=False)

@csrf_exempt
@require_http_methods(["POST"])
def create_item(request):
    try:
        data = json.loads(request.body)
        item = ItemService.create_item(data)
        return JsonResponse(item, status=201)
    except ValidationError as e:
        return JsonResponse({"error": str(e)}, status=400)

def get_item(request, item_id):
    item = ItemService.get_item(item_id)
    if not item:
        return JsonResponse({"error": "Item not found"}, status=404)
    return JsonResponse(item)

@csrf_exempt
@require_http_methods(["PUT"])
def update_item(request, item_id):
    try:
        data = json.loads(request.body)
        item = ItemService.update_item(item_id, data)
        if not item:
            return JsonResponse({"error": "Item not found"}, status=404)
        return JsonResponse(item)
    except ValidationError as e:
        return JsonResponse({"error": str(e)}, status=400)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_item(request, item_id):
    success = ItemService.delete_item(item_id)
    if not success:
        return JsonResponse({"error": "Item not found"}, status=404)
    return JsonResponse({}, status=204)
