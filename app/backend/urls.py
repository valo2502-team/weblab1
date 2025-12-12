from django.urls import path
from store import views

urlpatterns = [
    path("health/", views.health),
    path("items/simulate/", views.simulate_error_api),
    path("items/", views.items_api), # GET (list) and POST
    path("items/<int:item_id>/", views.item_detail_api), # GET (by id), PUT (update), DELETE
    path("custom-admin/", views.admin_page),
    path("", views.item_list_page),
]