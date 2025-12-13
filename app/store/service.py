from django.core.exceptions import ValidationError
from .models import Item

class ItemService:
    @staticmethod
    def create_item(data):
        if "name" not in data or not data["name"]:
            raise ValidationError("Name is required")

        item = Item.objects.create(name=data["name"])
        return {"id": item.id, "name": item.name}

    @staticmethod
    def list_items():
        items = Item.objects.all()
        return [{"id": item.id, "name": item.name} for item in items]

    @staticmethod
    def get_item(item_id):
        try:
            item = Item.objects.get(id=item_id)
            return {"id": item.id, "name": item.name}
        except Item.DoesNotExist:
            return None

    @staticmethod
    def update_item(item_id, data):
        if "name" not in data or not data["name"]:
            raise ValidationError("Name is required")

        try:
            item = Item.objects.get(id=item_id)
            item.name = data["name"]
            item.save()
            return {"id": item.id, "name": item.name}
        except Item.DoesNotExist:
            return None

    @staticmethod
    def delete_item(item_id):
        try:
            item = Item.objects.get(id=item_id)
            item.delete()
            return True
        except Item.DoesNotExist:
            return False