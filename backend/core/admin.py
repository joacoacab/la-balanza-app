from django.contrib import admin

from .models import Carniceria, Compra, CompraCorte, Corte

admin.site.register(Carniceria)
admin.site.register(Corte)
admin.site.register(Compra)
admin.site.register(CompraCorte)
