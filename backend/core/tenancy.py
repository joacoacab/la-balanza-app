from django.db import models


def get_user_tenant(user):
    if not user or not user.is_authenticated:
        return None
    try:
        return user.carniceria
    except Exception:
        return None


def get_model_tenant_lookup(model):
    return getattr(model, "tenant_lookup", "carniceria")


def resolve_tenant(obj):
    lookup = get_model_tenant_lookup(obj.__class__)
    current = obj
    for part in lookup.split("__"):
        current = getattr(current, part)
    return current


class TenantQuerySet(models.QuerySet):
    def for_user(self, user):
        tenant = get_user_tenant(user)
        if tenant is None:
            return self.none()
        return self.filter(**{get_model_tenant_lookup(self.model): tenant})


class TenantManager(models.Manager.from_queryset(TenantQuerySet)):
    pass


class TenantOwnedModel(models.Model):
    carniceria = models.ForeignKey(
        "core.Carniceria",
        on_delete=models.CASCADE,
        related_name="%(class)ss",
    )

    objects = TenantManager()

    class Meta:
        abstract = True


class TenantScopedMixin:
    def get_tenant(self):
        return get_user_tenant(self.request.user)

    def get_base_queryset(self):
        queryset = getattr(self, "queryset", None)
        if queryset is not None:
            return queryset.all()

        model = getattr(self, "model", None)
        if model is not None:
            return model._default_manager.all()

        serializer_class = self.get_serializer_class()
        model = serializer_class.Meta.model
        return model._default_manager.all()

    def get_queryset(self):
        tenant = self.get_tenant()
        queryset = self.get_base_queryset()
        if tenant is None:
            return queryset.none()

        if hasattr(queryset, "for_user"):
            return queryset.for_user(self.request.user)

        lookup = get_model_tenant_lookup(queryset.model)
        return queryset.filter(**{lookup: tenant})

