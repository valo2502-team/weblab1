from django.db import models
from django.contrib.auth.models import User

class Item(models.Model):
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.name} - ${self.price}"
class Category(models.Model):
    name = models.CharField(max_length=100)
    def __str__(self): 
        return self.name

class Order(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE)  
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): 
        return f"Order #{self.id} by {self.customer.username}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    def subtotal(self): 
        return self.quantity
    def __str__(self): 
        return f"{self.quantity} × {self.item.name}"
    
class IdempotencyRecord(models.Model):
    idempotency_key = models.CharField(max_length=255, unique=True, db_index=True)
    endpoint = models.CharField(max_length=255)
    response_status = models.IntegerField()
    response_data = models.TextField() 
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): 
        return f"Idempotency Record for {self.idempotency_key} on {self.endpoint}"