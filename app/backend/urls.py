from django.urls import path, include # Додайте include
from django.contrib.auth import views as auth_views # Додайте цей імпорт
from store import views

urlpatterns = [
    path("health/", views.health),
    path("items/simulate/", views.simulate_error_api),
    path("items/", views.items_api),
    path("items/<int:item_id>/", views.item_detail_api),
    
    path("login/", auth_views.LoginView.as_view(template_name="login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    
    path("custom-admin/", views.admin_page, name="admin_page"),
    path("test/", views.test_page), 
    path("", views.item_list_page),
]