from django.urls import path

from api.views.auth import AuthLoginView, AuthLogoutView, AuthRegistroView
from api.views.compra_cortes import CompraCorteUpdateView
from api.views.compras import CompraListCreateView, CompraRetrieveView
from api.views.cortes import CorteDetailView, CorteListCreateView

urlpatterns = [
    path("auth/registro/", AuthRegistroView.as_view()),
    path("auth/login/", AuthLoginView.as_view()),
    path("auth/logout/", AuthLogoutView.as_view()),
    path("cortes/", CorteListCreateView.as_view()),
    path("cortes/<int:pk>/", CorteDetailView.as_view()),
    path("compras/", CompraListCreateView.as_view()),
    path("compras/<int:pk>/", CompraRetrieveView.as_view()),
    path("compras/<int:compra_pk>/cortes/<int:corte_pk>/", CompraCorteUpdateView.as_view()),
]
