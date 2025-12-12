from django.urls import path
from store import views

urlpatterns = [
    path("health/", views.health),
    path("items/", views.list_items),         # GET
    path("items/", views.create_item),        # POST
    path("items/<int:item_id>/", views.get_item),     # GET by id
    path("items/<int:item_id>/", views.update_item),  # PUT
    path("items/<int:item_id>/", views.delete_item),  # DELETE
    path("", views.item_list_page),
]
