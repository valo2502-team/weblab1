from .models import Item
from django.core.exceptions import ObjectDoesNotExist, ValidationError

class ItemService:
    @staticmethod
    def list_items():
        return list(Item.objects.values())

    @staticmethod
    def create_item(data):
        name = data.get("name")
        if not name:
            raise ValidationError("Field 'name' is required")
        item = Item.objects.create(name=name)
        return {"id": item.id, "name": item.name}

    @staticmethod
    def get_item(item_id):
        try:
            item = Item.objects.get(id=item_id)
            return {"id": item.id, "name": item.name}
        except ObjectDoesNotExist:
            return None

    @staticmethod
    def update_item(item_id, data):
        try:
            item = Item.objects.get(id=item_id)
            name = data.get("name")
            if not name:
                raise ValidationError("Field 'name' is required")
            item.name = name
            item.save()
            return {"id": item.id, "name": item.name}
        except ObjectDoesNotExist:
            return None

    @staticmethod
    def delete_item(item_id):
        try:
            item = Item.objects.get(id=item_id)
            item.delete()
            return True
        except ObjectDoesNotExist:
            return False
