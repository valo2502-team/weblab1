from django.contrib import admin
from django.urls import path
from store.views import get_items

urlpatterns = [
    path('admin/', admin.site.urls),
    path('items/', get_items),
]
