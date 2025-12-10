from django.test import TestCase
from django.core.exceptions import ValidationError
from .service import ItemService
from .models import Item

class ItemServiceTests(TestCase):

    def test_create_item_success(self):
        """Successfully create an Item"""
        data = {"name": "Test Item"}
        result = ItemService.create_item(data)
        
        # Check that result contains id and name
        self.assertIn("id", result)
        self.assertEqual(result["name"], "Test Item")
        
        # Check that the item was actually created in the DB
        self.assertEqual(Item.objects.count(), 1)
        self.assertEqual(Item.objects.first().name, "Test Item")

    def test_create_item_failure_missing_name(self):
        """Fail to create Item when name is missing"""
        data = {}
        with self.assertRaises(ValidationError):
            ItemService.create_item(data)

    def test_list_items(self):
        """List all items"""
        Item.objects.create(name="Item 1")
        Item.objects.create(name="Item 2")
        
        items = ItemService.list_items()
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]["name"], "Item 1")
        self.assertEqual(items[1]["name"], "Item 2")

    def test_get_item_success(self):
        """Get an existing item by ID"""
        item = Item.objects.create(name="Get Me")
        result = ItemService.get_item(item.id)
        self.assertEqual(result["name"], "Get Me")
        self.assertEqual(result["id"], item.id)

    def test_get_item_not_found(self):
        """Return None if item does not exist"""
        result = ItemService.get_item(999)
        self.assertIsNone(result)

    def test_update_item_success(self):
        """Successfully update an existing item"""
        item = Item.objects.create(name="Old Name")
        data = {"name": "New Name"}
        result = ItemService.update_item(item.id, data)
        self.assertEqual(result["name"], "New Name")
        self.assertEqual(Item.objects.get(id=item.id).name, "New Name")

    def test_update_item_failure_missing_name(self):
        """Fail update if name is missing"""
        item = Item.objects.create(name="Old Name")
        data = {}
        with self.assertRaises(ValidationError):
            ItemService.update_item(item.id, data)

    def test_update_item_not_found(self):
        """Return None when updating non-existent item"""
        data = {"name": "New Name"}
        result = ItemService.update_item(999, data)
        self.assertIsNone(result)

    def test_delete_item_success(self):
        """Successfully delete an item"""
        item = Item.objects.create(name="Delete Me")
        success = ItemService.delete_item(item.id)
        self.assertTrue(success)
        self.assertEqual(Item.objects.count(), 0)

    def test_delete_item_not_found(self):
        """Return False when deleting non-existent item"""
        success = ItemService.delete_item(999)
        self.assertFalse(success)
