from django.http import JsonResponse
from store.models import Item

def get_items(request):
    items = list(Item.objects.values())
    return JsonResponse(items, safe=False)
