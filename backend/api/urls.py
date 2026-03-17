from django.urls import path

from api.views.admin import (
    AdminCarnieceriaListView,
    AdminCarniceriaDetailView,
    AdminPreciosView,
    AdminStatsView,
    AdminSuscripcionView,
)
from api.views.auth import AuthLoginView, AuthLogoutView, AuthRegistroView, GoogleAuthView
from api.views.billing import (
    BillingEstadoView,
    BillingPreciosView,
    MercadoPagoWebhookView,
    SuscribirView,
)
from api.views.compra_cortes import CompraCorteUpdateView
from api.views.compras import CompraListCreateView, CompraRetrieveView
from api.views.cortes import CargarPlantillaView, CorteDetailView, CorteListCreateView

urlpatterns = [
    path("auth/registro/", AuthRegistroView.as_view()),
    path("auth/login/", AuthLoginView.as_view()),
    path("auth/logout/", AuthLogoutView.as_view()),
    path("auth/google/", GoogleAuthView.as_view()),
    path("cortes/", CorteListCreateView.as_view()),
    path("cortes/cargar-plantilla/", CargarPlantillaView.as_view()),
    path("cortes/<int:pk>/", CorteDetailView.as_view()),
    path("compras/", CompraListCreateView.as_view()),
    path("compras/<int:pk>/", CompraRetrieveView.as_view()),
    path("compras/<int:compra_pk>/cortes/<int:corte_pk>/", CompraCorteUpdateView.as_view()),
    path("admin/stats/", AdminStatsView.as_view()),
    path("admin/carniceria/", AdminCarnieceriaListView.as_view()),
    path("admin/carniceria/<int:pk>/", AdminCarniceriaDetailView.as_view()),
    path("admin/carniceria/<int:pk>/suscripcion/", AdminSuscripcionView.as_view()),
    path("admin/precios/", AdminPreciosView.as_view()),
    path("billing/suscribir/", SuscribirView.as_view()),
    path("billing/estado/", BillingEstadoView.as_view()),
    path("billing/precios/", BillingPreciosView.as_view()),
    path("webhooks/mercadopago/", MercadoPagoWebhookView.as_view()),
]
